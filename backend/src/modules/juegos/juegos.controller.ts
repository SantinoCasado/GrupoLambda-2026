import { Request, Response } from 'express';
import { registrarJugadaSchema } from './schema/juegos.schema';
import { registrarJugadaService, obtenerDescuentoPedidoService } from './juegos.service';

export const registrarJugada = async (req: Request, res: Response) => {
  const validacion = registrarJugadaSchema.safeParse(req.body);

  if (!validacion.success) {
    return res.status(400).json({
      error: 'Datos inválidos para registrar la jugada.',
      detalles: validacion.error.format(),
    });
  }

  try {
    const resultado = await registrarJugadaService(validacion.data);
    return res.status(201).json({
      status: 'OK',
      data: resultado,
    });
  } catch (error: any) {
    return res.status(400).json({
      error: 'Error al procesar la jugada.',
      detalle: error.message,
    });
  }
};

export const obtenerDescuentosPorPedido = async (req: Request, res: Response) => {
  const { order_id } = req.params;

  if (!order_id) {
    return res.status(400).json({ error: 'El order_id es obligatorio.' });
  }

  try {
    const descuentos = await obtenerDescuentoPedidoService(order_id as string);
    return res.status(200).json({ status: 'OK', data: descuentos });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Error al consultar descuentos.',
      detalle: error.message,
    });
  }
};