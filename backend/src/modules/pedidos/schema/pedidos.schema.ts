import { z } from 'zod';

export const productoItemSchema = z.object({
  id_producto: z.string().uuid('El ID del producto debe ser un UUID válido'),
  cantidad: z.number().int().positive('La cantidad debe ser un entero mayor a 0'),
});

// Crear pedido
export const crearPedidoSchema = z.object({
  id_cliente: z.string().uuid('El ID del cliente debe ser un UUID válido'),
  numero_mesa: z.number().int().positive('El número de mesa debe ser válido'),
  order_type: z.enum(['dine_in', 'delivery']).default('dine_in'),
  productos: z
    .array(productoItemSchema)
    .nonempty('El pedido debe incluir al menos un producto'),
  delivery_address: z.string().optional(),
  delivery_latitude: z.number().optional(),
  delivery_longitude: z.number().optional(),
});

// Confirmar o rechazar pedido por el mozo
export const confirmarPedidoSchema = z.object({
  waiter_id: z.string().uuid('El ID del mozo debe ser un UUID válido').optional().nullable(),
  estado: z.enum(['in_preparation', 'cancelled']).default('in_preparation'),
  rejection_reason: z.string().optional(),
}).refine(
  (data) => {
    if (data.estado === 'cancelled') {
      return !!data.rejection_reason && data.rejection_reason.trim().length > 0;
    }
    return true;
  },
  {
    message: 'El motivo de rechazo es obligatorio cuando el pedido es cancelado',
    path: ['rejection_reason'],
  }
);

export type CrearPedidoDTO = z.infer<typeof crearPedidoSchema>;
export type ConfirmarPedidoDTO = z.infer<typeof confirmarPedidoSchema>;
export type ProductoItemDTO = z.infer<typeof productoItemSchema>;