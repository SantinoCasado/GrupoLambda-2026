import { supabase } from '../../config/supabase'; 
import { enviarPushNotification } from '../../services/pushNotifications.service';
import { FiltrosDelivery } from './interface/filtrosDelivery';

/**
 * Obtener pedidos disponibles para el repartidor (en estado 'ready' u 'on_the_way')
 */
export const obtenerPedidosDeliveryService = async (repartidorId?: string) => {
  let query = supabase
    .from('orders')
    .select(`
      id,
      status,
      order_type,
      delivery_address,
      delivery_lat,
      delivery_lng,
      total_amount,
      created_at,
      client:users!client_id(id, first_name, last_name, email, push_token),
      items:order_items(*, product:products(name))
    `)
    .eq('order_type', 'delivery')
    .in('status', ['ready', 'on_the_way'])
    .order('created_at', { ascending: false });

  // Si se pasa repartidorId, trae los asignados a él o los que no tienen repartidor aún
  if (repartidorId) {
    query = query.or(`delivery_driver_id.eq.${repartidorId},delivery_driver_id.is.null`);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Error al consultar pedidos de delivery: ${error.message}`);
  }

  return data || [];
};

export const obtenerTodosPedidosDeliveryService = async (filtros?: FiltrosDelivery) => {
  let query = supabase
    .from('orders')
    .select(`
      *,
      client:users!client_id(id, first_name, last_name, email, push_token),
      delivery_driver:users!delivery_driver_id(id, first_name, last_name),
      items:order_items(*, product:products(name, price, prep_time))
    `)
    .eq('order_type', 'delivery')
    .order('created_at', { ascending: false });

  // Filtro opcional por Estado(s)
  if (filtros?.status) {
    if (Array.isArray(filtros.status)) {
      query = query.in('status', filtros.status);
    } else if (filtros.status.includes(',')) {
      // Soporta ?status=ready,on_the_way
      query = query.in('status', filtros.status.split(','));
    } else {
      query = query.eq('status', filtros.status);
    }
  }

  // Filtro opcional por Repartidor
  if (filtros?.repartidorId) {
    query = query.eq('delivery_driver_id', filtros.repartidorId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Error al consultar pedidos de delivery: ${error.message}`);

  return data || [];
};

/**
 * Obtener UN pedido de delivery específico por ID
 */
export const obtenerPedidoDeliveryPorIdService = async (pedidoId: string) => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      client:users!client_id(id, first_name, last_name, email, push_token),
      delivery_driver:users!delivery_driver_id(id, first_name, last_name),
      items:order_items(*, product:products(name, price, prep_time))
    `)
    .eq('id', pedidoId)
    .eq('order_type', 'delivery')
    .single();

  if (error || !data) {
    throw new Error(`No se encontró el pedido de delivery con ID: ${pedidoId}`);
  }

  return data;
};

/**
 * El repartidor (dispositivo 4) confirma la recepción del pedido (Punto 29)
 * Cambia estado a 'on_the_way', asigna el 'delivery_driver_id' y envía Push al cliente.
 */
export const tomarPedidoDeliveryService = async (pedidoId: string, repartidorId: string) => {
  // Verificamos estado actual del pedido
  const { data: pedidoExistente, error: errorBusqueda } = await supabase
    .from('orders')
    .select('id, status, order_type')
    .eq('id', pedidoId)
    .single();

  if (errorBusqueda || !pedidoExistente) {
    throw new Error('El pedido especificado no existe.');
  }

  if (pedidoExistente.order_type !== 'delivery') {
    throw new Error('El pedido no es de tipo delivery.');
  }

  // Actualizamos el pedido en Supabase
  const { data: pedidoActualizado, error: errorUpdate } = await supabase
    .from('orders')
    .update({
      delivery_driver_id: repartidorId,
      status: 'on_the_way',
      updated_at: new Date().toISOString(),
    })
    .eq('id', pedidoId)
    .select(`
      *,
      client:users!client_id(first_name, push_token)
    `)
    .single();

  if (errorUpdate || !pedidoActualizado) {
    throw new Error(`Error al asignar el pedido al repartidor: ${errorUpdate?.message}`);
  }

  // Desempaquetamos cliente si Supabase lo devuelve como array
  const cliente: any = Array.isArray(pedidoActualizado.client)
    ? pedidoActualizado.client[0]
    : pedidoActualizado.client;

  // Push Notification al cliente (Punto 29)
  try {
  // Buscamos el token push del cliente asociado al pedido
  const { data: cliente } = await supabase
    .from('users')
    .select('push_token')
    .eq('id', pedidoActualizado.client_id)
    .single();

  if (cliente?.push_token) {
    const tituloPush = '🛵 ¡Pedido en camino!';
    const mensajePush = `El repartidor ya tiene tu pedido y se dirige a ${pedidoActualizado.delivery_address || 'tu domicilio'}.`;

    await enviarPushNotification(
      cliente.push_token,
      tituloPush,
      mensajePush,
      { 
        orderId: pedidoActualizado.id, 
        tipo: 'pedido_en_camino',
        status: 'on_the_way'
      }
    );
  }
} catch (pushError) {
  console.error('No se pudo enviar la push de pedido en camino al cliente:', pushError);
}

  return {
    success: true,
    mensaje: 'Pedido asignado. Estado actualizado a "on_the_way" y cliente notificado.',
    pedido: pedidoActualizado,
  };
};