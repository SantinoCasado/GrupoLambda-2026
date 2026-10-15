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

  // 3. Verificar si el cliente ya tiene un descuento ganado en este pedido (no acumulativos)
  const { data: descuentosPrevios, error: discError } = await supabase
    .from('game_discounts')
    .select('*')
    .eq('order_id', order_id)
    .eq('won_on_first_try', true)
    .gt('discount_percentage', 0);

  if (discError) {
    throw new Error(`Error al verificar descuentos previos: ${discError.message}`);
  }

  const yaTieneDescuento = descuentosPrevios && descuentosPrevios.length > 0;

  // Si ya tiene un descuento ganado, no se acumula otro
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

  // 5. Si aplico el descuento, recalcular y actualizar total_amount en orders
  let montoDescuento = 0; // Calcular el monto exacto del descuento y guardarlo en 'discount_amount'
  if (porcentajeAplicable > 0) {
    // Calculamos cuánta plata física representa ese porcentaje
    montoDescuento = Math.round(pedido.total_amount * (porcentajeAplicable / 100));

    const { error: updateOrderError } = await supabase
      .from('orders')
      .update({ discount_amount: montoDescuento })
      .eq('id', order_id);

    if (updateOrderError) {
      throw new Error(`Error al aplicar descuento en el pedido: ${updateOrderError.message}`);
    }
  }

  return {
    jugada: nuevaJugada,
    descuento_aplicado_porcentaje: porcentajeAplicable,
    monto_descontado: montoDescuento,
    mensaje: yaTieneDescuento
      ? 'Jugada registrada. No se aplicó descuento porque ya cuenta con un beneficio previo.'
      : porcentajeAplicable > 0
      ? `¡Felicitaciones! Ganaste un ${porcentajeAplicable}% de descuento (Equivale a $${montoDescuento}).`
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