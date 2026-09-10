import { z } from 'zod';

export const crearProductoSchema = z.object({
    name: z.string().min(2, 'El nombre es obligatorio'),
    description: z.string().min(5, 'La descripción es obligatoria'),
    prep_time: z.preprocess((val) => Number(val), z.number().positive('El tiempo debe ser mayor a 0')),
    price: z.preprocess((val) => Number(val), z.number().positive('El precio debe ser mayor a 0')),
    category: z.enum(['dish', 'drink', 'dessert'] as const, {
        message: 'La categoría es obligatoria y debe ser dish, drink o dessert'
    }),
    photos: z.array(z.string().url()).min(1, 'Se requiere al menos una foto del producto')
});

export type CrearProductoDTO = z.infer<typeof crearProductoSchema>;