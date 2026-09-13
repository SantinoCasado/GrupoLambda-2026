import { Request, Response } from 'express';
import { enviarMensajeService, listarMensajesService } from './chat.service';

export const enviarMensaje = async (req: Request, res: Response) => {
  const { sender_id, table_id, message, order_id, chat_type } = req.body;

  // sender_id y message son obligatorios
  if (!sender_id || !message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({
      error: 'Faltan campos obligatorios (sender_id y message).',
    });
  }

  try {
    const nuevoMensaje = await enviarMensajeService({
      sender_id,
      table_id, // puede venir undefined si responde un empleado sin mesa fija
      message,
      order_id,
      chat_type,
    });

    return res.status(201).json({
      status: 'OK',
      mensaje: 'Mensaje enviado correctamente!',
      data: nuevoMensaje,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Error al enviar el mensaje.',
      detalle: error.message,
    });
  }
};

export const listarMensajes = async (req: Request, res: Response) => {
  const { table_id } = req.query;

  try {
    const mensajes = await listarMensajesService(
      typeof table_id === 'string' ? table_id : undefined
    );
    return res.status(200).json({ status: 'OK', data: mensajes });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Error al listar mensajes.',
      detalle: error.message,
    });
  }
};