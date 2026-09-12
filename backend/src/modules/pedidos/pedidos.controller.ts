import { Request, Response } from 'express';
import { guardarPedido, obtenerEstadoPedido } from './pedidos.service';

export const crearPedido = async (req: Request, res: Response) => {
        // extraemos los datos del JSON que mandan desde la aplicación móvil
  const { id_cliente, numero_mesa, productos } = req.body;

  if (!id_cliente || !numero_mesa || !productos || !Array.isArray(productos) || productos.length === 0) {
    return res.status(400).json({
      error: 'Faltan datos requeridos: id_cliente, numero_mesa o lista de productos',
    });
  }

  try {
    const resultado = await guardarPedido(id_cliente, Number(numero_mesa), productos);

    return res.status(201).json({
      mensaje: `Pedido para la mesa ${numero_mesa} recibido. Esperando aprobación del mozo.`,
      status: 'OK',
      data: resultado,
    });
  } catch (error: any) {
    console.error('[PedidosController Error]:', error);
    return res.status(500).json({
      error: 'Fallo al procesar el pedido en el servidor',
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
      error: 'Pedido no encontrado',
      detalle: error.message,
    });
  }
};