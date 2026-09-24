import { z } from 'zod';

export const registrarJugadaSchema = z.object({
  order_id: z.string().uuid({ message: 'El order_id debe ser un UUID válido.' }),
  client_id: z.string().uuid({ message: 'El client_id debe ser un UUID válido.' }),
  game_name: z.string().min(1, { message: 'El nombre del juego es requerido.' }),
  discount_percentage: z.number().int().refine((val) => [0, 10, 15, 20].includes(val), {
    message: 'El porcentaje de descuento debe ser 0, 10, 15 o 20',
  }),
  won_on_first_try: z.boolean({ message: 'Debe indicar si ganó en el primer intento.' }),
});

export type RegistrarJugadaDTO = z.infer<typeof registrarJugadaSchema>;