import { Request, Response } from 'express';
import { guardarPedido, obtenerEstadoPedido, confirmarPedidoPorMozo, obtenerPedidosPendientesBar, obtenerPedidosPendientesCocina } from './pedidos.service';
import { crearPedidoSchema, confirmarPedidoSchema } from './schema/pedidos.schema';

export const crearPedido = async (req: Request, res: Response) => {
  const validacion = crearPedidoSchema.safeParse(req.body);
  if (!validacion.success) {
    return res.status(400).json({
      error: 'Datos inválidos para crear el pedido',
      detalles: validacion.error.format(),
    });
  }

  const { id_cliente, numero_mesa, productos, order_type } = validacion.data;

  try {
    const resultado = await guardarPedido(id_cliente, numero_mesa, productos, order_type);

    return res.status(201).json({
      mensaje: `Pedido para la mesa ${numero_mesa} recibido. Esperando aprobación del mozo.`,
      status: 'OK',
      data: resultado,
    });
  } catch (error: any) {
    console.error('[PedidosController Error]:', error);
    return res.status(500).json({
      error: 'Fallo al procesar el pedido en el servidor.',
      detalle: error.message,
    });
  }
};

export const verEstadoPedido = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'El ID del pedido es requerido' });
  }

  try {
    const pedido = await obtenerEstadoPedido(id);
    return res.status(200).json({ status: 'OK', data: pedido });
  } catch (error: any) {
    return res.status(404).json({
      error: 'Pedido no encontrado.',
      detalle: error.message,
    });
  }
};

export const confirmarPedido = async (req: Request, res: Response) => {
  const { id } = req.params;

  const validacion = confirmarPedidoSchema.safeParse(req.body);
  if (!validacion.success) {
    return res.status(400).json({
      error: 'Datos inválidos para confirmar el pedido.',
      detalles: validacion.error.format(),
    });
  }

  const { waiter_id, estado, rejection_reason } = validacion.data;

  try {
    const resultado = await confirmarPedidoPorMozo(id as string, waiter_id, estado, rejection_reason);
    return res.status(200).json({
      mensaje: `Pedido ${id} actualizado con éxito a '${estado}'`,
      status: 'OK',
      data: resultado,
    });
  } catch (error: any) {
    return res.status(400).json({
      error: 'No se pudo confirmar el pedido.',
      detalle: error.message,
    });
  }
};

// Punto 16: Listar pedidos pendientes para Cocina
export const listarPedidosCocina = async (_req: Request, res: Response) => {
  try {
    const pedidos = await obtenerPedidosPendientesCocina();
    return res.status(200).json({
      status: 'OK',
      data: pedidos,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Fallo al obtener pedidos de cocina.',
      detalle: error.message,
    });
  }
};

// Punto 17: Listar pedidos pendientes para Bar
export const listarPedidosBar = async (_req: Request, res: Response) => {
  try {
    const pedidos = await obtenerPedidosPendientesBar();
    return res.status(200).json({
      status: 'OK',
      data: pedidos,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Fallo al obtener pedidos de bar.',
      detalle: error.message,
    });
  }
};