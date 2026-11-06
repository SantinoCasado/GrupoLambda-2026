import { z } from 'zod';

export const productoItemSchema = z.object({
  id_producto: z.string().uuid('El ID del producto debe ser un UUID válido'),
  cantidad: z.number().int().positive('La cantidad debe ser un entero mayor a 0'),
});

// Crear pedido
export const crearPedidoSchema = z.object({
  id_cliente: z.string().uuid(),
  order_type: z.enum(['dine_in', 'delivery']).default('dine_in'),
  numero_mesa: z.number().optional(),
  delivery_address: z.string().optional(),
  delivery_latitude: z.number().optional(),
  delivery_longitude: z.number().optional(),
  productos: z.array(
    z.object({
      id_producto: z.string().uuid(),
      cantidad: z.number().positive(),
    })
  ).min(1),
})
.refine((data) => {
  if (data.order_type === 'delivery') {
    return !!data.delivery_address && data.delivery_latitude !== undefined && data.delivery_longitude !== undefined;
  }
  return true;
}, {
  message: 'La dirección y coordenadas (latitud y longitud) son obligatorias cuando el pedido es a domicilio.',
  path: ['delivery_address'],
})
.refine((data) => {
  if (data.order_type === 'dine_in') {
    return data.numero_mesa !== undefined;
  }
  return true;
}, {
  message: 'El número de mesa es obligatorio para consumos en el salón.',
  path: ['numero_mesa'],
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