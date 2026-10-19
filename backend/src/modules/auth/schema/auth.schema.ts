import { z } from 'zod';

export const loginSchema = z.object({
    email: z.string().email("Debe ser un correo válido"),
    password: z.string().min(1, "La contraseña es obligatoria")
});

export type LoginDTO = z.infer<typeof loginSchema>;

// Ingreso con Google (punto 23): la app envía el access_token de la sesión OAuth de Supabase
export const googleLoginSchema = z.object({
    access_token: z.string().min(1, "El token de Google es obligatorio")
});

export type GoogleLoginDTO = z.infer<typeof googleLoginSchema>;