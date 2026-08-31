import { z } from 'zod';

// Definicion de  que forma debe tener el JSON que manda el frontend
export const crearEmpleadoSchema = z.object({
    email: z.string().email("Debe ser un correo válido"),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
    first_name: z.string().min(2),
    last_name: z.string().min(2),
    dni: z.string().length(8),
    cuil: z.string().length(11),
    role: z.enum(['owner', 'supervisor', 'cook', 'bartender', 'waiter', 'maitre', 'delivery']),
    rol_creador: z.string()
});