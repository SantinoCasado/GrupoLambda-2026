import { supabase } from '../../config/supabase';

interface ProductoItem {
  id_producto: string;
  cantidad: number;
}

export const guardarPedido = async (
  idCliente: string,
  numeroMesa: number,
  items: ProductoItem[]
) => {
  // obtener el id de la mesa a partir del numero de la misma :)
  const { data: mesaData, error: mesaError } = await supabase
    .from('restaurant_tables')
    .select('id')
    .eq('table_number', numeroMesa)
    .single();

  if (mesaError || !mesaData) {
    throw new Error(`No se encontró la mesa número ${numeroMesa}`);
  }

  const tableId = mesaData.id;

  // traer los productos para calcular total y tiempo estimado
  const idsProductos = items.map((i) => i.id_producto);
  const { data: productosData, error: prodError } = await supabase
    .from('products')
    .select('id, price, estimated_time')
    .in('id', idsProductos);

  if (prodError || !productosData) {
    throw new Error('Error al consultar los productos en la base de datos');
  }

  // calculo rapido :)
  const mapaProductos = new Map(productosData.map((p) => [p.id, p]));

  let totalAcumulado = 0;
  let tiempoElaboracionTotal = 0;

  for (const item of items) {
    const prod = mapaProductos.get(item.id_producto);
    if (!prod) {
      throw new Error(`Producto con ID ${item.id_producto} no existe`);
    }
    totalAcumulado += Number(prod.price) * item.cantidad;
    // tiempo del pedido toma el tiempo mayor o acumulado de los platitos
    const tiempoItem = Number(prod.estimated_time || 0) * item.cantidad;
    tiempoElaboracionTotal += tiempoItem;
  }

  // crear el registro en la tabla orders (estado inicial: pendiente_confirmacion)
  const { data: ordenCreada, error: ordenError } = await supabase
    .from('orders')
    .insert([
      {
        table_id: tableId,
        client_id: idCliente,
        status: 'pending',
        total: totalAcumulado,
        estimated_time: tiempoElaboracionTotal,
      },
    ])
    .select()
    .single();

  if (ordenError || !ordenCreada) {
    throw new Error(`Error al crear la orden: ${ordenError?.message}`);
  }

  // crear los registros en order_items
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

// consultar el estado de un pedido por ID o por mesa
export const obtenerEstadoPedido = async (idPedido: string) => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      status,
      total,
      estimated_time,
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