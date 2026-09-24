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
    // Tomamos el tiempo del plato que más tarde
    const prepTime = Number(prod.prep_time || 0);
    if (prepTime > tiempoElaboracionTotal) {
      tiempoElaboracionTotal = prepTime;
    }
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
    const { data: mozos } = await supabase
      .from('users')
      .select('push_token')
      .eq('role', 'mozo')
      .not('push_token', 'is', null);

    if (mozos && mozos.length > 0) {
      for (const mozo of mozos) {
        if (mozo.push_token) {
          await enviarPushNotification(
            mozo.push_token,
            '📝 Nuevo pedido a confirmar',
            `La Mesa #${numeroMesa} armó su pedido. Revisalo para enviarlo a preparación.`,
            { orderId: ordenCreada.id, tipo: 'nuevo_pedido' }
          );
        }
      }
    }
  } catch (pushError) {
    console.error('No se pudo enviar la push de creación de pedido a los mozos:', pushError);
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
    // 1. Avisarle al cliente 
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

    // Avisarle a la Cocina y al Bar (SOLO si se confirmó)
    if (nuevoEstado === 'in_preparation') {
      // Consulta quE categorIas de productos tiene este pedido
      const { data: itemsPedido } = await supabase
        .from('order_items')
        .select('products(category)')
        .eq('order_id', idPedido);

      // Determinar si hay comida o bebida en el pedido
      const tieneComida = itemsPedido?.some((i: any) => 
        i.products?.category === 'dish' || i.products?.category === 'food'
      );
      const tieneBebida = itemsPedido?.some((i: any) => 
        i.products?.category === 'drink'
      );

      // Notificar a los cocineros
      if (tieneComida) {
        const { data: cocineros } = await supabase
          .from('users')
          .select('push_token')
          .eq('role', 'cocinero')
          .not('push_token', 'is', null);

        if (cocineros && cocineros.length > 0) {
          for (const cocinero of cocineros) {
            if (cocinero.push_token) {
              await enviarPushNotification(
                cocinero.push_token,
                '🍳 Nuevo ticket en Cocina',
                'Ingresó un nuevo pedido de comida para preparar.',
                { orderId: idPedido, tipo: 'nuevo_pedido_cocina' }
              );
            }
          }
        }
      }

      // Notificar a los cantineros
      if (tieneBebida) {
        const { data: cantineros } = await supabase
          .from('users')
          .select('push_token')
          .eq('role', 'cantinero')
          .not('push_token', 'is', null);

        if (cantineros && cantineros.length > 0) {
          for (const cantinero of cantineros) {
            if (cantinero.push_token) {
              await enviarPushNotification(
                cantinero.push_token,
                '🍹 Nuevo ticket en Bar',
                'Ingresó un nuevo pedido de bebidas para preparar.',
                { orderId: idPedido, tipo: 'nuevo_pedido_bar' }
              );
            }
          }
        }
      }
    }
  } catch (pushError) {
    console.error('No se pudo procesar el flujo de push notifications:', pushError);
  }

  return pedidoActualizado;
};

// Punto 16: Listado de pedidos pendientes para Cocina (platos / comida)
export const obtenerPedidosPendientesCocina = async () => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      created_at,
      status,
      restaurant_tables (table_number),
      order_items (
        id,
        quantity,
        products (id, name, category)
      )
    `)
    .eq('status', 'in_preparation')
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Error al consultar pedidos de cocina: ${error.message}`);
  }

  return (data || [])
    .map((orden) => {
      const itemsCocina = (orden.order_items || []).filter(
        (item: any) => item.products?.category === 'dish' || item.products?.category === 'food'
      );
      return {
        ...orden,
        order_items: itemsCocina,
      };
    })
    .filter((orden) => orden.order_items.length > 0);
};

// Punto 17: Listado de pedidos pendientes para Bar (bebidas)
export const obtenerPedidosPendientesBar = async () => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      created_at,
      status,
      restaurant_tables (table_number),
      order_items (
        id,
        quantity,
        products (id, name, category)
      )
    `)
    .eq('status', 'in_preparation')
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Error al consultar pedidos de bar: ${error.message}`);
  }

  return (data || [])
    .map((orden) => {
      const itemsBar = (orden.order_items || []).filter(
        (item: any) => item.products?.category === 'drink'
      );
      return {
        ...orden,
        order_items: itemsBar,
      };
    })
    .filter((orden) => orden.order_items.length > 0);
};

// Punto 13: Modificar productos de un pedido rechazado/cancelado
export const modificarPedidoRechazado = async (
  idPedido: string,
  items: ProductoItem[]
) => {
  // 1. Verificar estado actual del pedido
  const { data: pedidoActual, error: errorBusqueda } = await supabase
    .from('orders')
    .select('id, status, user_id, table_id')
    .eq('id', idPedido)
    .single();
  
  if (errorBusqueda || !pedidoActual) {
    throw new Error('El pedido especificado no existe');
  }
  
  if (pedidoActual.status !== 'cancelled') {
    throw new Error('Solo se pueden modificar pedidos que hayan sido rechazados/cancelados');
  }

  // 2. Consultar productos y calcular nuevos totales
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
    const prepTime = Number(prod.prep_time || 0);
    if (prepTime > tiempoElaboracionTotal) {
      tiempoElaboracionTotal = prepTime;
    }
  }

  // 3. Eliminar ítems anteriores del pedido
  const { error: errorBorrado } = await supabase
    .from('order_items')
    .delete()
    .eq('order_id', idPedido);

  if (errorBorrado) {
    throw new Error(`Error al limpiar ítems previos: ${errorBorrado.message}`);
  }

  // 4. Insertar los nuevos ítems
  const itemsAInsertar = items.map((item) => {
    const prod = mapaProductos.get(item.id_producto)!;
    return {
      order_id: idPedido,
      product_id: item.id_producto,
      quantity: item.cantidad,
      unit_price: prod.price,
    };
  });

  const { error: errorInsert } = await supabase
    .from('order_items')
    .insert(itemsAInsertar);

  if (errorInsert) {
    throw new Error(`Error al registrar nuevos ítems: ${errorInsert.message}`);
  }

  // 5. Volver el pedido a estado 'pending' y actualizar montos
  const { data: pedidoActualizado, error: errorUpdate } = await supabase
    .from('orders')
    .update({
      status: 'pending',
      total_amount: totalAcumulado,
      estimated_delivery_time: tiempoElaboracionTotal,
      rejection_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', idPedido)
    .select()
    .single();

  if (errorUpdate || !pedidoActualizado) {
    throw new Error(`Error al actualizar la orden: ${errorUpdate?.message}`);
  }

  // 6. Notificar a los MOZOS que el cliente corrigió el pedido
  try {
    const { data: mozos } = await supabase
      .from('users')
      .select('push_token')
      .eq('role', 'mozo')
      .not('push_token', 'is', null);

    if (mozos && mozos.length > 0) {
      for (const mozo of mozos) {
        if (mozo.push_token) {
          await enviarPushNotification(
            mozo.push_token,
            '🔄 Pedido Modificado',
            `El cliente corrigió el pedido. Requiere tu confirmación nuevamente.`,
            { orderId: pedidoActualizado.id, tipo: 'pedido_modificado' }
          );
        }
      }
    }
  } catch (pushError) {
    console.error('No se pudo enviar la push de modificación al mozo:', pushError);
  }

  return {
    pedido: pedidoActualizado,
    total: totalAcumulado,
    tiempoEstimado: tiempoElaboracionTotal,
  };
};

export const marcarItemComoListoService = async(itemId: string) => {
  const { data: itemActual, error: errorBusqueda } = await supabase
    .from('order_items')
    .update({ status: 'ready' })
    .eq('id', itemId)
    .select('order_id')
    .single();

    if (errorBusqueda || !itemActual) {
      throw new Error(`Error al actualizar el ítem: ${errorBusqueda?.message}`);
    }
    
    const orderId = itemActual.order_id;  //

    // Verificar si todos los ítems del pedido están listos
    const { data: todosLosItems, error: errorCheck } = await supabase
      .from('order_items')
      .select('status')
      .eq('order_id', orderId);

    if (errorCheck || !todosLosItems) {
        throw new Error('Error al verificar el estado de los demás ítems');
    }

    // Comprueba si hay alguno que NO este listo
    const faltaAlgo = todosLosItems.some((item: any) => item.status !== 'ready');

    // Si todavía falta cocinar o preparar algo, devuelve que el ítem se actualizó pero el pedido sigue en curso
    if (faltaAlgo) {
        return { pedidoCompleto: false, message: 'Ítem actualizado a listo. El pedido aún no está completo.' };
    }

    // Si todos los ítems están listos, actualiza el estado del pedido a 'ready'
    const { data: pedidoActualizado, error: errorOrden } = await supabase
    .from('orders')
    .update({ status: 'ready', updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .select('id, table_id, restaurant_tables(table_number)')
    .single();

    if (errorOrden){
      throw new Error(`Error al actualizar el estado del pedido: ${errorOrden?.message}`);
    }

    // Notificar al mozo que el pedido está listo
    try {
      // Obtener el token del mozo asignado al pedido
      const numeroMesa = (pedidoActualizado.restaurant_tables as any)?.table_number || 'S/N'; 
      
      const { data: mozos } = await supabase
        .from('users')
        .select('push_token')
        .eq('role', 'mozo')
        .not('push_token', 'is', null)

      if (mozos && mozos.length > 0){
        for(const mozo of mozos){
          if(mozo.push_token){
            await enviarPushNotification(
              mozo.push_token,
              '🛎️ ¡Pedido Completo!',
              `El pedido de la Mesa #${numeroMesa} está 100% listo para retirar y entregar.`,
              { orderId: orderId, tipo: 'pedido_completo', table_id: pedidoActualizado.table_id }
            );
          }
        }
      }
    } catch (pushError){
      console.error('⚠️ Error al enviar la push de pedido completo al mozo:', pushError);
    }

    return { 
        pedidoCompleto: true, 
        message: '¡Pedido completo! Notificación enviada a los mozos.',
        orden: pedidoActualizado
    };
}

export const entregarPedidoMozoService = async (idPedido: string) => {
    const { data: pedidoEntregado, error } = await supabase
        .from('orders')
        .update({ 
            status: 'delivered', 
            updated_at: new Date().toISOString() 
        })
        .eq('id', idPedido)
        .eq('status', 'ready') // Solo puede entregar si la cocina ya lo terminó
        .select()
        .single();

    if (error || !pedidoEntregado) {
        throw new Error('Error al entregar pedido. Verificá que el pedido exista y esté en estado "ready".');
    }

    return pedidoEntregado;
};

// Acción del Cliente: Confirma que ya tiene la comida en la mesa
export const confirmarRecepcionClienteService = async (idPedido: string) => {
    const { data: pedidoRecibido, error } = await supabase
        .from('orders')
        .update({ 
            status: 'received', 
            updated_at: new Date().toISOString() 
        })
        .eq('id', idPedido)
        // Opcional: .eq('status', 'delivered') para ser estrictos
        .select()
        .single();

    if (error || !pedidoRecibido) {
        throw new Error('Error al confirmar la recepción del pedido.');
    }

    return pedidoRecibido;
};