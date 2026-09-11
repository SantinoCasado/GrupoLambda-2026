import { z } from 'zod';

export const crearMesaSchema = z.object({
    table_number: z.preprocess((val) => Number(val), z.number().positive('El número de mesa debe ser mayor a 0')),
    capacity: z.preprocess((val) => Number(val), z.number().positive('La capacidad mínima es de 1 persona')),
    table_type: z.enum(['standard', 'vip', 'reduced_mobility'] as const, {
        message: 'El tipo de mesa debe ser standard, vip o reduced_mobility'
    })
});

export const cambiarEstadoMesaSchema = z.object({
    availability: z.enum(['free', 'occupied', 'cleaning'] as const, {
        message: 'El estado debe ser free, occupied o cleaning'
    })
});

export type CrearMesaDTO = z.infer<typeof crearMesaSchema>;
export type CambiarEstadoMesaDTO = z.infer<typeof cambiarEstadoMesaSchema>;