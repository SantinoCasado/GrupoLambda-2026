import { z } from 'zod';

export const enviarMensajeSchema = z.object({
  sender_id: z.string().uuid('El ID del remitente debe ser un UUID válido').optional(),
  message: z.string().trim().min(1, 'El mensaje no puede estar vacío'),
  table_id: z.string().uuid('El ID de la mesa debe ser un UUID válido').optional().nullable(),
  order_id: z.string().uuid('El ID del pedido debe ser un UUID válido').optional().nullable(),
  chat_type: z.enum(['table_waiter', 'delivery_client']).default('table_waiter'),
});

export type EnviarMensajeDTO = z.infer<typeof enviarMensajeSchema>;