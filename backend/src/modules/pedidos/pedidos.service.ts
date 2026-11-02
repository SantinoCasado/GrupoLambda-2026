import { supabase } from '../../config/supabase';
import { enviarPushNotification } from '../../services/pushNotifications.service';
import { enviarFacturaPorEmail, enviarCorreoInformativo } from '../../services/email.service';
import { generarYSubirFactura } from '../../services/factura.service';

interface ProductoItem {
  id_producto: string;
  cantidad: number;
}

export const guardarPedido = async (
  idCliente: string,
  numeroMesa: number | null, // <-- Modificado para aceptar null en delivery
  items: ProductoItem[],
  orderType: string = 'dine_in',
  datosDelivery?: any
) => {
  // Verifica el rol del cliente (Punto 27)
  const { data: cliente, error: errorCliente } = await supabase
    .from('users')
    .select('role')
    .eq('id', idCliente)
    .single();

  if (errorCliente || !cliente) {
    throw new Error('No se encontró el cliente en la base de datos.');
  }

  // Validación estricta para Delivery
  if (orderType === 'delivery') {
    if (cliente.role !== 'registered_client') {
      throw new Error('Los pedidos a domicilio son exclusivos para clientes registrados.');
    }
    if (!datosDelivery?.delivery_address) {
      throw new Error('Debe ingresar una dirección de entrega válida.');
    }
  }

  // Búsqueda de mesa (Solo si NO es delivery)
  let tableId = null;
  if (orderType !== 'delivery') {
    if (!numeroMesa) throw new Error('Se requiere un número de mesa para pedidos en el local.');
    
    const { data: mesaData, error: mesaError } = await supabase
      .from('restaurant_tables')
      .select('id')
      .eq('table_number', numeroMesa)
      .single();

    if (mesaError || !mesaData) {
      throw new Error(`No se encontró la mesa número ${numeroMesa}`);
    }
    tableId = mesaData.id;
  }

  // Procesamiento de productos y precios
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

  // Creación de la orden con los campos de Delivery (Punto 27)
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
        // Agrega los datos del mapa
        delivery_address: datosDelivery?.delivery_address || null,
        delivery_latitude: datosDelivery?.delivery_latitude || null,
        delivery_longitude: datosDelivery?.delivery_longitude || null
      },
    ])
    .select()
    .single();

  if (ordenError || !ordenCreada) {
    throw new Error(`Error al crear la orden: ${ordenError?.message}`);
  }

  // Inserción de los ítems
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
  // PUSH NOTIFICATION (Punto 28: Aviso a Dueños/Mozos)
  // ==========================================
  try {
    // Si es delivery avisamos a Dueño y Supervisor. Si es de salón, al Mozo.
    const rolesANotificar = orderType === 'delivery' ? ['owner', 'supervisor'] : ['waiter'];
    
    const { data: personal } = await supabase
      .from('users')
      .select('push_token')
      .in('role', rolesANotificar)
      .not('push_token', 'is', null);

    if (personal && personal.length > 0) {
      const tokens = personal.map(p => p.push_token);
      
      const tituloPush = orderType === 'delivery' ? '🛵 ¡Nuevo Delivery!' : '🍽️ ¡Nueva Comanda!';
      const mensajePush = orderType === 'delivery' 
        ? 'Un cliente registró un pedido a domicilio pendiente de aprobación.' 
        : `Comanda pendiente en la mesa ${numeroMesa}`;

      // Promise.all para enviar todas las push en paralelo de forma eficiente
      await Promise.all(
        tokens.map(token => 
          enviarPushNotification(
            token,
            tituloPush,
            mensajePush,
            { orderId: ordenCreada.id, table_id: tableId, tipo: 'nuevo_pedido' }
          )
        )
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

export const confirmarPedidoPorMozo = async (
  idPedido: string,
  waiterId: string | null | undefined, // Modificado para aceptar null cuando aprueba un dueño
  nuevoEstado: 'in_preparation' | 'cancelled' = 'in_preparation',
  rejectionReason?: string
) => {
  // Busca el pedido con toda la información necesaria
  const { data: pedidoActual, error: errorBusqueda } = await supabase
    .from('orders')
    .select(`
      id, 
      status, 
      client_id, 
      order_type,
      client:users!client_id(first_name, email, push_token)
    `)
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
    waiter_id: waiterId || null,
    updated_at: new Date().toISOString(),
  };

  const motivoRechazo = rejectionReason?.trim() || null;

  if (nuevoEstado === 'cancelled' && motivoRechazo) {
    updatePayload.rejection_reason = motivoRechazo;
  }

  // Actualiza el pedido
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
  // PUNTO 28 Y NOTIFICACIONES
  // ========================================================
  try {
    const cliente: any = Array.isArray(pedidoActual.client) 
    ? pedidoActual.client[0] 
    : pedidoActual.client;

    // --- CASO A: RECHAZO DE PEDIDO ---
    if (nuevoEstado === 'cancelled') {
      // Push de Rechazo
      if (cliente?.push_token) {
        await enviarPushNotification(
          cliente.push_token,
          '❌ Pedido Cancelado',
          `Lo sentimos, tu pedido fue rechazado. Motivo: ${motivoRechazo || 'No especificado'}`,
          { orderId: idPedido, status: nuevoEstado, tipo: 'estado_pedido', rejectionReason: motivoRechazo }
        );
      }
      
      // Correo de Brevo (Tipografía formal e institucionalidad)
      if (cliente?.email) {
        const htmlRechazo = `
          <!DOCTYPE html>
          <html lang="es">
          <head>
            <meta charset="utf-8">
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Lato:ital,wght@0,400;0,700&display=swap');
              body { font-family: 'Lato', sans-serif; background-color: #f4f6f8; margin: 0; padding: 0; }
              .container { background-color: #ffffff; padding: 30px; max-width: 600px; margin: 30px auto; border-top: 6px solid #c32f27; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
              h2 { font-family: 'Cinzel', serif; color: #c32f27; text-align: center; margin-top: 0; }
              .box { background-color: #ffebee; border-left: 4px solid #c32f27; padding: 15px; margin: 20px 0; border-radius: 4px; }
              p { color: #4a5568; line-height: 1.6; }
              .footer { font-size: 12px; color: #718096; border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 20px; text-align: center; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2>Actualización sobre tu pedido</h2>
              <p>Hola <strong>${cliente.first_name}</strong>,</p>
              <p>Lamentamos informarte que tu pedido ha sido rechazado por la administración.</p>
              <div class="box">
                <p style="margin:0; color:#c62828;"><strong>Motivo:</strong> ${motivoRechazo}</p>
              </div>
              <p>Si considerás que esto es un error, por favor contactanos mediante el chat de la aplicación.</p>
              <div class="footer">
                Atentamente,<br><strong>El equipo de Jardín Imperial / Grupo Lambda</strong>
              </div>
            </div>
          </body>
          </html>
        `;
        await enviarCorreoInformativo(
          cliente.email, 
          cliente.first_name, 
          'Actualización sobre tu pedido', 
          htmlRechazo
        );
      }
    }

    // --- CASO B: APROBACIÓN DE PEDIDO ---
    if (nuevoEstado === 'in_preparation') {
      // Consulta ítems para cálculos y notificaciones
      const { data: itemsPedido } = await supabase
        .from('order_items')
        .select('products(category, prep_time)')
        .eq('order_id', idPedido);

      // 2. Cálculo del tiempo de espera (Punto 28)
      const tiemposCocina = (itemsPedido || []).map((i: any) => Number(i.products?.prep_time || 15));
      const tiempoCocina = tiemposCocina.length > 0 ? Math.max(...tiemposCocina) : 15;
      const tiempoViaje = pedidoActual.order_type === 'delivery' ? 20 : 0;
      const tiempoTotal = tiempoCocina + tiempoViaje;

      // 3. Push de Aprobación al cliente con el tiempo estimado
      if (cliente?.push_token) {
        const mensajePush = pedidoActual.order_type === 'delivery'
          ? `El pedido está en cocina. Tiempo estimado de entrega: ${tiempoTotal} minutos.`
          : `El mozo confirmó tu pedido. Tiempo en cocina: ${tiempoTotal} minutos.`;

        await enviarPushNotification(
          cliente.push_token,
          '👨‍🍳 ¡Pedido en Preparación!',
          mensajePush,
          { orderId: idPedido, status: nuevoEstado, tipo: 'estado_pedido' }
        );
      }

      // Notifica a Cocina / Bar (Lógica original mantenida)
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
          await Promise.all(cocineros.map(cocinero => 
            enviarPushNotification(
              cocinero.push_token,
              '🍳 Nuevo ticket en Cocina',
              'Ingresó un nuevo pedido de comida para preparar.',
              { orderId: idPedido, tipo: 'nuevo_pedido_cocina' }
            )
          ));
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
          await Promise.all(cantineros.map(cantinero => 
            enviarPushNotification(
              cantinero.push_token,
              '🍹 Nuevo ticket en Bar',
              'Ingresó un nuevo pedido de bebidas para preparar.',
              { orderId: idPedido, tipo: 'nuevo_pedido_bar' }
            )
          ));
        }
      }
    }
  } catch (pushError) {
    console.error('No se pudo procesar el flujo de notificaciones/correos:', pushError);
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
  items: ProductoItem[],
  reqUserId: string
) => {
  // 1. Verificar estado actual del pedido
  const { data: pedidoActual, error: errorBusqueda } = await supabase
    .from('orders')
    .select('id, status, client_id, table_id')
    .eq('id', idPedido)
    .single();
  
  if (errorBusqueda || !pedidoActual) {
    throw new Error('El pedido especificado no existe');
  }

  // 1.b Solo el cliente que realizó la orden puede editarla
  if (pedidoActual.client_id !== reqUserId) {
    throw new Error('No tenés permiso para modificar este pedido');
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

  // 3. Guardar copia de los ítems actuales para poder restaurarlos si falla la inserción
  const { data: itemsOriginales, error: errorLecturaItems } = await supabase
    .from('order_items')
    .select('product_id, quantity, unit_price')
    .eq('order_id', idPedido);

  if (errorLecturaItems) {
    throw new Error(`Error al leer los ítems previos: ${errorLecturaItems.message}`);
  }

  // 4. Eliminar ítems anteriores del pedido
  const { error: errorBorrado } = await supabase
    .from('order_items')
    .delete()
    .eq('order_id', idPedido);

  if (errorBorrado) {
    throw new Error(`Error al limpiar ítems previos: ${errorBorrado.message}`);
  }

  // 5. Insertar los nuevos ítems
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
    // Restaurar los ítems originales para no dejar el pedido vacío
    if (itemsOriginales && itemsOriginales.length > 0) {
      const { error: errorRestauracion } = await supabase
        .from('order_items')
        .insert(
          itemsOriginales.map((it) => ({
            order_id: idPedido,
            product_id: it.product_id,
            quantity: it.quantity,
            unit_price: it.unit_price,
          }))
        );

      if (errorRestauracion) {
        console.error(
          `FATAL: no se pudo restaurar el pedido ${idPedido} tras fallar la inserción:`,
          errorRestauracion.message
        );
      }
    }

    throw new Error(`Error al registrar nuevos ítems: ${errorInsert.message}`);
  }

  // 6. Volver el pedido a estado 'pending' y actualizar montos
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

  // 7. Notificar a los MOZOS que el cliente corrigió el pedido
  try {
    const { data: mozos } = await supabase
      .from('users')
      .select('push_token')
      .eq('role', 'waiter')
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
    .update({ item_status: 'ready' })
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
      .select('item_status')
      .eq('order_id', orderId);

    if (errorCheck || !todosLosItems) {
        throw new Error('Error al verificar el estado de los demás ítems');
    }

    // Comprueba si hay alguno que NO este listo
    const faltaAlgo = todosLosItems.some((item: any) => item.item_status !== 'ready');

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
        .eq('role', 'waiter')
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

export const solicitarCuentaService = async (pedidoId: string) => {
    // Actualiza el estado a 'bill_requested'
    const { data: pedido, error } = await supabase
        .from('orders')
        .update({ status: 'bill_requested' })
        .eq('id', pedidoId)
        .select('*') 
        .single();

    if (error) {
        throw new Error(`Error al solicitar la cuenta: ${error.message}`);
    }

    // aviso a los mozos que esa mesa quiere pagar
    try {
      const numeroMesa = (pedido.restaurant_tables as any)?.table_number || 'S/N';

      // Buscamos los tokens de mozos, dueños y supervisores en una sola consulta con .in()
      const { data: destinatarios, error: errorDestinatarios } = await supabase
          .from('users')
          .select('push_token')
          .in('role', ['waiter', 'owner', 'supervisor'])
          .not('push_token', 'is', null);

      if (errorDestinatarios) {
          console.error('⚠️ Error al buscar destinatarios para la push:', errorDestinatarios.message);
      } else if (destinatarios && destinatarios.length > 0) {
          for (const user of destinatarios) {
              if (user.push_token) {
                  await enviarPushNotification(
                      user.push_token,
                      '🛎️ Cuenta Solicitada',
                      `La Mesa #${numeroMesa} solicitó la cuenta y el pago.`,
                      { orderId: pedidoId, tipo: 'bill_requested', table_id: pedido.table_id }
                  );
              }
          }
      }
  } catch (pushError) {
      console.error('⚠️ Error al enviar las push de solicitud de cuenta:', pushError);
  }

    return pedido;
};

export const cobrarPedidoService = async (pedidoId: string, porcentajePropina: number) => {
    // CORRECCIÓN: Select con relaciones explícitas (!client_id) y trayendo los ítems
    const { data: pedido, error: errorPedido } = await supabase
        .from('orders')
        .select(`
            *,
            restaurant_tables(table_number),
            client:users!client_id(first_name, last_name, dni, email, role, push_token),
            items:order_items(*) 
        `)
        .eq('id', pedidoId)
        .single();

    if (errorPedido || !pedido) throw new Error('Pedido no encontrado');
    if (pedido.status === 'paid') throw new Error('El pedido ya está pagado');

    const subtotal = Number(pedido.total_amount || 0);
    const descuento = Number(pedido.discount_amount || 0);
    const subtotalConDescuento = subtotal - descuento;
    const montoPropina = subtotal * (porcentajePropina / 100);
    const totalFinal = subtotalConDescuento + montoPropina;

    // Actualiza el pedido y cobramos la mesa
    const { error: errorUpdate } = await supabase
        .from('orders')
        .update({ 
            status: 'paid', 
            tip_amount: montoPropina, 
            final_total: totalFinal
        })
        .eq('id', pedidoId);

    if (errorUpdate) throw new Error(`Error al actualizar el pago: ${errorUpdate.message}`);

    // Libera la mesa automáticamente
    if (pedido.table_id) {
        await supabase
            .from('restaurant_tables')
            .update({ availability: 'free' }) 
            .eq('id', pedido.table_id);
    }

    // Notifica a Dueños y Supervisores del cobro
    const { data: administradores } = await supabase
        .from('users')
        .select('push_token')
        .in('role', ['owner', 'supervisor'])
        .not('push_token', 'is', null);

    if (administradores && administradores.length > 0) {
        const tokensAdmin = administradores.map((admin: any) => admin.push_token);
        
        // Dispara todas las notificaciones en paralelo, pasándole un string a la vez
        await Promise.all(
            tokensAdmin.map(token => 
                enviarPushNotification(
                    token, 
                    '💳 Pago Confirmado y Mesa Libre',
                    `La mesa ${pedido.restaurant_tables?.table_number || 'sin asignar'} pagó $${totalFinal.toFixed(2)}.`
                )
            )
        );
    }

    // Generamos el PDF sin bloquear el flujo principal
    const cliente = pedido.client;
    
    // Lo envouelvo en un try/catch para que un fallo del PDF no tire atrás el cobro
    try {
        const invoiceUrl = await generarYSubirFactura(pedidoId, cliente, {
            precioBase: subtotal,
            descuento: descuento,
            propina: montoPropina,
            precioFinal: totalFinal,
            porcentajePropina: porcentajePropina
        }, pedido.items || []); // Pasa los ítems

        // Guardamos la URL del PDF generado
        await supabase.from('orders').update({ invoice_pdf_url: invoiceUrl }).eq('id', pedidoId);

        if (cliente.role === 'registered_client') {
            await enviarFacturaPorEmail(cliente.email, cliente.first_name, invoiceUrl);
        } else if (cliente.role === 'anonymous_client' || cliente.role === 'client_anonymous') {
            if (cliente.push_token) {
                await enviarPushNotification(
                    cliente.push_token,
                    '🧾 ¡Tu factura está lista!',
                    'Gracias por visitarnos. Tocá acá para descargar tu comprobante.',
                    { type: 'factura', urlFactura: invoiceUrl } // Agregado el type para App.tsx
                );
            }
        }
    } catch (pdfError: any) {
        console.error('❌ Error generando PDF, pero el cobro se completó:', pdfError.message);
    }

    return { 
        success: true, 
        total_pagado: totalFinal 
    };
};

export const obtenerResumenPreciosService = async (pedidoId: string) => {
    // Trae las columnas 
    const { data: pedido, error } = await supabase
        .from('orders')
        .select('total_amount, discount_amount, tip_amount, final_total, status')
        .eq('id', pedidoId)
        .single();

    if (error || !pedido) {
        throw new Error('Pedido no encontrado.');
    }

    const precioBase = Number(pedido.total_amount || 0);
    const descuento = Number(pedido.discount_amount || 0);
    const propina = Number(pedido.tip_amount || 0);

    const precioFinal = Number(pedido.final_total) > 0 
        ? Number(pedido.final_total) 
        : (precioBase - descuento + propina);

    // JSON con la estructura exacta que pidieron en las consignas
    return {
        precio_pedido: precioBase,
        descuento: -descuento, 
        propina: propina,
        precio_final_pedido: precioFinal,
        estado: pedido.status // 'pending', 'paid', etc.
    };
};