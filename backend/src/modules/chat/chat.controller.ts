import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { enviarMensajeService, listarMensajesService } from './chat.service';
import { enviarMensajeSchema } from './schema/chat.schema';

export const enviarMensaje = async (req: AuthRequest, res: Response) => {
  const validacion = enviarMensajeSchema.safeParse(req.body);

  if (!validacion.success) {
    return res.status(400).json({
      error: 'Datos inválidos para enviar el mensaje',
      detalles: validacion.error.format(),
    });
  }

  if (!req.user) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  try {
    // El remitente siempre se toma de la sesión, nunca del body.
    const { sender_id: _senderIdDelBody, ...datosDelBody } = validacion.data;

    const resultado = await enviarMensajeService(
      { ...datosDelBody, sender_id: req.user.id },
      req.user.role
    );

    return res.status(201).json({
      status: 'OK',
      mensaje: 'Mensaje enviado correctamente!',
      data: resultado.mensaje,
      notificacionEnviada: resultado.notificacionEnviada,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Error al enviar el mensaje.',
      detalle: error.message,
    });
  }
};

export const listarMensajes = async (req: AuthRequest, res: Response) => {
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