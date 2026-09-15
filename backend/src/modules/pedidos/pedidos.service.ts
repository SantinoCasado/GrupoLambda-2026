import { supabase } from '../../config/supabase';
import { enviarPushNotification } from '../../services/pushNotifications.service';

interface ProductoItem {
  id_producto: string;
  cantidad: number;
}

export const guardarPedido = async (
  idCliente: string,
  numeroMesa: number,
  items: ProductoItem[],
  orderType: string = 'dine_in'
) => {
  const { data: mesaData, error: mesaError } = await supabase
    .from('restaurant_tables')
    .select('id')
    .eq('table_number', numeroMesa)
    .single();

  if (mesaError || !mesaData) {
    throw new Error(`No se encontró la mesa número ${numeroMesa}`);
  }

  const tableId = mesaData.id;

  const idsProductos = items.map((i) => i.id_producto);
  const { data: productosData, error: prodError } = await supabase
    .from('products')
    .select('id, price, prep_time')
    .in('id', idsProductos);

  if (prodError || !productosData) {
    throw new Error('Error al consultar los productos en la base de datos');
  }

  const mapaProductos = new Map(productosData.map((p) => [p.id, p]));

  let totalAcumulado = 0;
  let tiempoElaboracionTotal = 0;

  for (const item of items) {
    const prod = mapaProductos.get(item.id_producto);
    if (!prod) {
      throw new Error(`Producto con ID ${item.id_producto} no existe`);
    }
    totalAcumulado += Number(prod.price) * item.cantidad;
    const tiempoItem = Number(prod.prep_time || 0) * item.cantidad;
    tiempoElaboracionTotal += tiempoItem;
  }

  // Se usa total_amount y order_type
  const { data: ordenCreada, error: ordenError } = await supabase
    .from('orders')
    .insert([
      {
        table_id: tableId,
        client_id: idCliente,
        order_type: orderType,
        status: 'pending',
        total_amount: totalAcumulado,
        estimated_delivery_time: tiempoElaboracionTotal,
      },
    ])
    .select()
    .single();

  if (ordenError || !ordenCreada) {
    throw new Error(`Error al crear la orden: ${ordenError?.message}`);
  }

  const itemsAInsertar = items.map((item) => {
    const prod = mapaProductos.get(item.id_producto)!;
    return {
      order_id: ordenCreada.id,
      product_id: item.id_producto,
      quantity: item.cantidad,
      unit_price: prod.price,
    };
  });

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(itemsAInsertar);

  if (itemsError) {
    throw new Error(`Error al insertar ítems de la orden: ${itemsError.message}`);
  }

  // ==========================================
  // PUSH NOTIFICATION: Nuevo pedido creado
  // ==========================================
  // Busca si hay un mozo o personal de cocina al que notificar, o puede buscar el token del cliente.
  // Por ejemplo, si quiere notificar al personal de cocina/mozos de la mesa:
  try {
    const { data: clienteData } = await supabase
      .from('users')
      .select('push_token')
      .eq('id', idCliente)
      .single();

    if (clienteData?.push_token) {
      await enviarPushNotification(
        clienteData.push_token,
        '🍽️ ¡Pedido Registrado!',
        `Tu pedido para la Mesa #${numeroMesa} fue enviado a cocina. Tiempo estimado: ${tiempoElaboracionTotal} mins.`,
        { orderId: ordenCreada.id }
      );
    }
  } catch (pushError) {
    console.error('No se pudo enviar la push de creación de pedido:', pushError);
  }

  return {
    pedido: ordenCreada,
    total: totalAcumulado,
    tiempoEstimado: tiempoElaboracionTotal,
  };
};

export const obtenerEstadoPedido = async (idPedido: string) => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      status,
      total_amount,
      estimated_delivery_time,
      created_at,
      restaurant_tables (table_number),
      order_items (
        id,
        quantity,
        unit_price,
        products (name, category)
      )
    `)
    .eq('id', idPedido)
    .single();

  if (error) {
    throw new Error(`No se pudo consultar el pedido: ${error.message}`);
  }

  return data;
};

// Punto 13: Confirmar o rechazar pedido por el mozo
export const confirmarPedidoPorMozo = async (
  idPedido: string,
  waiterId: string,
  nuevoEstado: 'in_preparation' | 'cancelled' = 'in_preparation',
  rejectionReason?: string
) => {
  const { data: pedidoActual, error: errorBusqueda } = await supabase
    .from('orders')
    .select('id, status, client_id') // Trae tambien el client_id para buscar su token
    .eq('id', idPedido)
    .single();

  if (errorBusqueda || !pedidoActual) {
    throw new Error('El pedido especificado no existe');
  }

  if (pedidoActual.status !== 'pending') {
    throw new Error(`El pedido no se puede modificar porque ya está en estado: ${pedidoActual.status}`);
  }

  const updatePayload: Record<string, any> = {
    status: nuevoEstado,
    waiter_id: waiterId,
    updated_at: new Date().toISOString(),
  };

  if (nuevoEstado === 'cancelled' && rejectionReason) {
    updatePayload.rejection_reason = rejectionReason;
  }

  const { data: pedidoActualizado, error: errorUpdate } = await supabase
    .from('orders')
    .update(updatePayload)
    .eq('id', idPedido)
    .select()
    .single();

  if (errorUpdate || !pedidoActualizado) {
    throw new Error(`Error al actualizar el pedido: ${errorUpdate?.message}`);
  }

  // ========================================================
  // PUSH NOTIFICATION: Mozo confirmó o rechazó el pedido
  // ========================================================
  try {
    if (pedidoActual.client_id) {
      const { data: clienteData } = await supabase
        .from('users')
        .select('push_token')
        .eq('id', pedidoActual.client_id)
        .single();

      if (clienteData?.push_token) {
        const titulo = nuevoEstado === 'in_preparation' ? '👨‍🍳 ¡Pedido en Preparación!' : '❌ Pedido Cancelado';
        const cuerpo = nuevoEstado === 'in_preparation'
          ? 'El mozo confirmó tu pedido y ya se encuentra en cocina.'
          : `Lo sentimos, tu pedido fue rechazado. Motivo: ${rejectionReason || 'No especificado'}`;

        await enviarPushNotification(clienteData.push_token, titulo, cuerpo, {
          orderId: idPedido,
          status: nuevoEstado
        });
      }
    }
  } catch (pushError) {
    console.error('No se pudo enviar la push de confirmación del mozo:', pushError);
  }

  return pedidoActualizado;
};