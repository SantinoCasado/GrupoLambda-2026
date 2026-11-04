import { Request, Response } from 'express';
import { tomarPedidoDeliveryService, 
  obtenerTodosPedidosDeliveryService, 
  obtenerPedidoDeliveryPorIdService,
  entregarYFacturarPedidoService
} from './delivery.service';

export const tomarPedidoDelivery = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { repartidor_id } = req.body;

    // 1. Verifica que 'id' exista y sea de tipo string
  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      error: 'El ID del pedido es obligatorio y debe ser un texto válido.',
    });
  }

  if (!repartidor_id) {
    return res.status(400).json({
      error: 'Se requiere el ID del repartidor (repartidor_id).',
    });
  }

  try {
    const resultado = await tomarPedidoDeliveryService(id, repartidor_id);

    return res.status(200).json({
      mensaje: 'Pedido asignado al repartidor. En camino al domicilio.',
      status: 'OK',
      data: resultado,
    });
  } catch (error: any) {
    console.error('[DeliveryController Error]:', error.message);
    return res.status(400).json({
      error: 'No se pudo confirmar la recepción del pedido.',
      detalle: error.message,
    });
  }
};

/**
 * GET /api/delivery
 * Ejemplos de uso desde el Front:
 * - GET /api/delivery                            -> Trae TODOS los delivery
 * - GET /api/delivery?status=ready,on_the_way    -> Trae los que están listos o en camino (Para el Repartidor)
 * - GET /api/delivery?status=pending             -> Trae pendientes (Para el Dueño/Supervisor)
 */
export const obtenerPedidosDelivery = async (req: Request, res: Response) => {
  const { status, repartidor_id } = req.query;

  try {
    const pedidos = await obtenerTodosPedidosDeliveryService({
      status: status as string | string[] | undefined,
      repartidorId: repartidor_id as string | undefined,
    });

    return res.status(200).json({
      status: 'OK',
      total: pedidos.length,
      data: pedidos,
    });
  } catch (error: any) {
    console.error('[DeliveryController Error]:', error.message);
    return res.status(500).json({
      error: 'Error al obtener el listado de pedidos de delivery.',
      detalle: error.message,
    });
  }
};

/**
 * GET /api/delivery/:id
 */
export const obtenerPedidoDeliveryPorId = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      error: 'El ID del pedido es obligatorio y debe ser un texto válido.',
    });
  }

  try {
    const pedido = await obtenerPedidoDeliveryPorIdService(id);

    return res.status(200).json({
      status: 'OK',
      data: pedido,
    });
  } catch (error: any) {
    console.error('[DeliveryController Error]:', error.message);
    return res.status(404).json({
      error: 'No se encontró el pedido especificado.',
      detalle: error.message,
    });
  }
};

/**
 * PATCH /api/delivery/:id/entregar
 * El repartidor confirma la entrega del pedido en el domicilio
 */
export const entregarPedidoDelivery = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { repartidor_id, metodo_pago } = req.body;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      error: 'El ID del pedido es obligatorio y debe ser un texto válido.',
    });
  }

  if (!repartidor_id || typeof repartidor_id !== 'string') {
    return res.status(400).json({
      error: 'El ID del repartidor (repartidor_id) es obligatorio.',
    });
  }

  try {
    const resultado = await entregarYFacturarPedidoService(
      id,
      repartidor_id,
      metodo_pago || 'efectivo'
    );

    return res.status(200).json({
      status: 'OK',
      data: resultado,
    });
  } catch (error: any) {
    console.error('[DeliveryController Error - Entregar]:', error.message);
    return res.status(400).json({
      error: 'No se pudo registrar la entrega del pedido.',
      detalle: error.message,
    });
  }
};