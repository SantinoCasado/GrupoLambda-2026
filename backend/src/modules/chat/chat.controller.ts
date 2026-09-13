import { Request, Response } from 'express';
import { enviarMensajeService, listarMensajesService } from './chat.service';
import { enviarMensajeSchema } from './schema/chat.schema';

export const enviarMensaje = async (req: Request, res: Response) => {
  const validacion = enviarMensajeSchema.safeParse(req.body);

  if (!validacion.success) {
    return res.status(400).json({
      error: 'Datos inválidos para enviar el mensaje',
      detalles: validacion.error.format(),
    });
  }

  try {
    const nuevoMensaje = await enviarMensajeService(validacion.data);

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