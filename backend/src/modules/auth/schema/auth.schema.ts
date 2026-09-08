import { z } from 'zod';

export const loginSchema = z.object({
    email: z.string().email("Debe ser un correo válido"),
    password: z.string().min(1, "La contraseña es obligatoria")
});

export type LoginDTO = z.infer<typeof loginSchema>;