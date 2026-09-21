import { supabase } from '../../config/supabase';

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
    .select('id, status')
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
    .select('id, status')
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

  return {
    pedido: pedidoActualizado,
    total: totalAcumulado,
    tiempoEstimado: tiempoElaboracionTotal,
  };
};