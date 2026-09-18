import { z } from 'zod';

export const crearClienteSchema = z.object({
    email: z.string().email("Debe ser un correo válido"),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
    first_name: z.string().min(2, "El nombre es obligatorio"),
    last_name: z.string().min(2, "El apellido es obligatorio"),
    dni: z.string().length(8, "El DNI debe tener exactamente 8 dígitos"),
    photo_url: z.string().url("La URL de la foto es obligatoria y debe ser válida"),
    push_token: z.string().optional()
});

// Schema para cliente anónimo / lista de espera (CU-09)
export const crearClienteAnonimoSchema = z.object({
    client_name: z.string().min(2, "El nombre del cliente anónimo es obligatorio"),
    client_photo: z.string().url("Se requiere una URL de foto válida")
});

export const cambiarEstadoSchema = z.object({
    status: z.enum(['approved', 'rejected'])    // Solo se permiten estos dos estados para la aprobaciOn o rechazo de clientes
});

export type CambiarEstadoDTO = z.infer<typeof cambiarEstadoSchema>;

export type CrearClienteAnonimoDTO = z.infer<typeof crearClienteAnonimoSchema>;
export type CrearClienteDTO = z.infer<typeof crearClienteSchema>;