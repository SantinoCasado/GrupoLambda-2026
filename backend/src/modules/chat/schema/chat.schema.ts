import { z } from 'zod';

export const enviarMensajeSchema = z
  .object({
    sender_id: z.string().uuid('El ID del remitente debe ser un UUID válido').optional(),
    message: z.string().trim().min(1, 'El mensaje no puede estar vacío'),
    table_id: z.string().uuid('El ID de la mesa debe ser un UUID válido').optional().nullable(),
    order_id: z.string().uuid('El ID del pedido debe ser un UUID válido').optional().nullable(),
    // 'delivery_client' se mantiene por compatibilidad con mensajes viejos.
    chat_type: z
      .enum(['table_waiter', 'delivery', 'delivery_client'])
      .default('table_waiter'),
  })
  .superRefine((data, ctx) => {
    const esDelivery =
      data.chat_type === 'delivery' || data.chat_type === 'delivery_client';

    if (esDelivery && !data.order_id) {
      ctx.addIssue({
        code: 'custom',
        message: 'El ID del pedido es obligatorio para el chat de delivery.',
        path: ['order_id'],
      });
    }

    if (!esDelivery && !data.table_id) {
      ctx.addIssue({
        code: 'custom',
        message: 'El ID de la mesa es obligatorio para el chat con el mozo.',
        path: ['table_id'],
      });
    }
  });

export type EnviarMensajeDTO = z.infer<typeof enviarMensajeSchema>;
