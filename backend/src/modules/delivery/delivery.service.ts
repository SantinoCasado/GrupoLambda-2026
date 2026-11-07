import { supabase } from '../../config/supabase';
import { enviarPushNotification } from '../../services/pushNotifications.service';
import { FiltrosDelivery } from './interface/filtrosDelivery';

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

  // Un repartidor debe ver tanto sus pedidos asignados como los que todavía
  // no tomó nadie. Sin esto, los pedidos 'ready' nunca aparecen en su lista.
  if (filtros?.repartidorId) {
    query = query.or(
      `delivery_driver_id.eq.${filtros.repartidorId},delivery_driver_id.is.null`
    );
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
 * El repartidor confirma la recepción del pedido (Punto 29).
 * Cambia el estado a 'on_the_way', asigna el 'delivery_driver_id' y avisa al cliente.
 * Solo puede tomarlo un repartidor si el pedido está 'ready' y todavía no tiene dueño.
 */
export const tomarPedidoDeliveryService = async (pedidoId: string, repartidorId: string) => {
  const { data: pedidoExistente, error: errorBusqueda } = await supabase
    .from('orders')
    .select('id, status, order_type, delivery_driver_id')
    .eq('id', pedidoId)
    .single();

  if (errorBusqueda || !pedidoExistente) {
    throw new Error('El pedido especificado no existe.');
  }

  if (pedidoExistente.order_type !== 'delivery') {
    throw new Error('El pedido no es de tipo delivery.');
  }

  if (pedidoExistente.status !== 'ready') {
    throw new Error(
      `El pedido no está listo para retirar. Estado actual: ${pedidoExistente.status}`
    );
  }

  if (
    pedidoExistente.delivery_driver_id &&
    pedidoExistente.delivery_driver_id !== repartidorId
  ) {
    throw new Error('Otro repartidor ya tomó este pedido.');
  }

  // Update atómico: solo asigna si sigue 'ready' y sin repartidor.
  const { data: pedidoActualizado, error: errorUpdate } = await supabase
    .from('orders')
    .update({
      delivery_driver_id: repartidorId,
      status: 'on_the_way',
      updated_at: new Date().toISOString(),
    })
    .eq('id', pedidoId)
    .eq('status', 'ready')
    .is('delivery_driver_id', null)
    .select(`
      *,
      client:users!client_id(first_name, push_token)
    `)
    .single();

  if (errorUpdate || !pedidoActualizado) {
    throw new Error(
      'No se pudo tomar el pedido: otro repartidor pudo haberlo tomado primero.'
    );
  }

  try {
    const cliente: any = Array.isArray(pedidoActualizado.client)
      ? pedidoActualizado.client[0]
      : pedidoActualizado.client;

    if (cliente?.push_token) {
      await enviarPushNotification(
        cliente.push_token,
        '🛵 ¡Pedido en camino!',
        `El repartidor ya tiene tu pedido y se dirige a ${
          pedidoActualizado.delivery_address || 'tu domicilio'
        }.`,
        {
          orderId: pedidoActualizado.id,
          order_id: pedidoActualizado.id,
          tipo: 'pedido_en_camino',
          status: 'on_the_way',
          order_type: 'delivery',
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

/**
 * El repartidor confirma que dejó el pedido en el domicilio.
 * NO cobra ni factura: eso queda para POST /api/pedidos/cobrar una vez que el
 * cliente confirma la recepción y solicita la cuenta.
 */
export const entregarPedidoDeliveryService = async (
  pedidoId: string,
  repartidorId: string
) => {
  const { data: pedido, error: errorBusqueda } = await supabase
    .from('orders')
    .select(`
      *,
      client:users!client_id(id, first_name, push_token)
    `)
    .eq('id', pedidoId)
    .single();

  if (errorBusqueda || !pedido) {
    throw new Error('El pedido especificado no existe.');
  }

  if (pedido.order_type !== 'delivery') {
    throw new Error('El pedido no es de tipo delivery.');
  }

  if (pedido.status !== 'on_the_way') {
    throw new Error(`El pedido no está en camino. Estado actual: ${pedido.status}`);
  }

  if (pedido.delivery_driver_id !== repartidorId) {
    throw new Error('Solo el repartidor asignado puede confirmar esta entrega.');
  }

  const { data: pedidoActualizado, error: errorUpdate } = await supabase
    .from('orders')
    .update({
      status: 'delivered',
      updated_at: new Date().toISOString(),
    })
    .eq('id', pedidoId)
    .eq('status', 'on_the_way')
    .select()
    .single();

  if (errorUpdate || !pedidoActualizado) {
    throw new Error(`Error al confirmar la entrega: ${errorUpdate?.message}`);
  }

  try {
    const cliente: any = Array.isArray(pedido.client) ? pedido.client[0] : pedido.client;

    if (cliente?.push_token) {
      await enviarPushNotification(
        cliente.push_token,
        '📦 ¡Pedido entregado!',
        'El repartidor confirmó la entrega. Ingresá a la app para confirmar la recepción y pagar tu cuenta.',
        {
          orderId: pedido.id,
          order_id: pedido.id,
          status: 'delivered',
          tipo: 'pedido_entregado',
          order_type: 'delivery',
        }
      );
    }
  } catch (pushErr) {
    console.error('❌ Error enviando push de entrega:', pushErr);
  }

  return {
    success: true,
    mensaje: 'Entrega confirmada. Esperando la confirmación del cliente.',
    pedido: pedidoActualizado,
  };
};
