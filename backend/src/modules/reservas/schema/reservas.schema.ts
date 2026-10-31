import { z } from 'zod';

// Punto 24: el cliente registrado solicita una reserva agendada
export const crearReservaSchema = z.object({
    // Fecha ISO con zona horaria (ej: new Date().toISOString()) para no depender del huso del servidor
    reservation_date: z.string()
        .refine((valor) => !isNaN(Date.parse(valor)), "La fecha de la reserva no es válida")
        .refine((valor) => /(Z|[+-]\d{2}:\d{2})$/.test(valor), "La fecha debe incluir la zona horaria"),
    guests_count: z.number()
        .int("La cantidad de comensales debe ser un número entero")
        .min(1, "Debe haber al menos 1 comensal")
        .max(20, "La cantidad máxima de comensales es 20")
});

export type CrearReservaDTO = z.infer<typeof crearReservaSchema>;

// Punto 25: el dueño o supervisor rechaza indicando el motivo
export const rechazarReservaSchema = z.object({
    motivo: z.string()
        .trim()
        .min(5, "El motivo debe tener al menos 5 caracteres")
        .max(300, "El motivo no puede superar los 300 caracteres")
});

export type RechazarReservaDTO = z.infer<typeof rechazarReservaSchema>;

// Punto 26: el cliente escanea el QR de la mesa reservada
export const checkInReservaSchema = z.object({
    table_id: z.string().uuid("El identificador de la mesa no es válido")
});

export type CheckInReservaDTO = z.infer<typeof checkInReservaSchema>;

export const ESTADOS_RESERVA = ['pending', 'confirmed', 'rejected', 'expired', 'completed'] as const;
