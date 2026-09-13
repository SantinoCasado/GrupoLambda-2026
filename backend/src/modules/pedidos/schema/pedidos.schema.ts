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
});

// Confirmar o rechazar pedido por el mozo
export const confirmarPedidoSchema = z.object({
  waiter_id: z.string().uuid('El ID del mozo debe ser un UUID válido'),
  estado: z.enum(['in_preparation', 'cancelled']).default('in_preparation'),
  rejection_reason: z.string().optional(),
});

export type CrearPedidoDTO = z.infer<typeof crearPedidoSchema>;
export type ConfirmarPedidoDTO = z.infer<typeof confirmarPedidoSchema>;
export type ProductoItemDTO = z.infer<typeof productoItemSchema>;