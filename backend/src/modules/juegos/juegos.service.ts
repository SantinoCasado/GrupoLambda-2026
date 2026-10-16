import { supabase } from '../../config/supabase';
import { RegistrarJugadaDTO } from './schema/juegos.schema';

export const registrarJugadaService = async (datos: RegistrarJugadaDTO) => {
  const { order_id, client_id, game_name, discount_percentage, won_on_first_try } = datos;

  // 1. Verificar que el cliente exista y sea registrado (anónimo NO)
  const { data: usuario, error: userError } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', client_id)
    .single();

  if (userError || !usuario) {
    throw new Error('Cliente no encontrado');
  }

  if (usuario.role === 'anonymous_client' || usuario.role === 'client_anonymous') {
    throw new Error('Los clientes anónimos no pueden participar por descuentos.');
  }

  // 2. Verificar que el pedido exista
  const { data: pedido, error: orderError } = await supabase
    .from('orders')
    .select('id, client_id, total_amount, status')
    .eq('id', order_id)
    .single();

  if (orderError || !pedido) {
    throw new Error('Pedido no encontrado.');
  }

  // 3. Verificar si el cliente ya tiene un descuento ganado en este pedido
  const { data: descuentosPrevios, error: discError } = await supabase
    .from('game_discounts')
    .select('id')
    .eq('order_id', order_id)
    .gt('discount_percentage', 0); // Busca si ya embolsó algún premio antes en cualquier juego

  if (discError) {
    throw new Error(`Error al verificar descuentos previos: ${discError.message}`);
  }

  // Si encuentra al menos un registro con premio, el cerrojo se cierra de forma definitiva para esa mesa
  const yaTieneDescuento = descuentosPrevios && descuentosPrevios.length > 0;

  // Solo se aplica el descuento si ganó en el primer intento de ESTE juego y NUNCA antes había ganado otro
  const porcentajeAplicable = (won_on_first_try && !yaTieneDescuento) ? discount_percentage : 0;

  // 4. Registrar la jugada en la tabla game_discounts
  const { data: nuevaJugada, error: insertError } = await supabase
    .from('game_discounts')
    .insert([
      {
        order_id,
        client_id,
        game_name,
        discount_percentage: porcentajeAplicable,
        won_on_first_try,
      },
    ])
    .select()
    .single();

  if (insertError) {
    throw new Error(`Error al registrar jugada: ${insertError.message}`);
  }

  // 5. Guardar el porcentaje en la tabla orders (SIN ACUMULAR, porque es el único que va a tener)
  if (porcentajeAplicable > 0) {
    const { error: updateOrderError } = await supabase
      .from('orders')
      .update({ discount_amount: porcentajeAplicable }) // Pone el 15 y listo
      .eq('id', order_id);

    if (updateOrderError) {
      throw new Error(`Error al guardar el descuento en el pedido: ${updateOrderError.message}`);
    }
  }

  return {
    jugada: nuevaJugada,
    descuento_aplicado: porcentajeAplicable,
    mensaje: yaTieneDescuento
      ? 'Jugada registrada. No sumás descuento porque ya habías ganado en otro juego.'
      : porcentajeAplicable > 0
      ? `¡Felicitaciones! Ganaste un ${porcentajeAplicable}% de descuento para tu cuenta.`
      : 'Jugada registrada sin descuento.',
  };
};

export const obtenerDescuentoPedidoService = async (order_id: string) => {
  const { data, error } = await supabase
    .from('game_discounts')
    .select('*')
    .eq('order_id', order_id);

  if (error) {
    throw new Error(`Error al consultar descuentos: ${error.message}`);
  }

  return data;
};