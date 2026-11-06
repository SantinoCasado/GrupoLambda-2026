import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import {
    crearReservaSchema,
    rechazarReservaSchema,
    checkInReservaSchema,
    ESTADOS_RESERVA
} from './schema/reservas.schema';
import {
    crearReservaService,
    listarReservasService,
    listarMisReservasService,
    aprobarReservaService,
    rechazarReservaService,
    checkInReservaService
} from './reservas.service';

// POST /api/reservas -> Punto 24
export const crearReserva = async (req: AuthRequest, res: Response): Promise<Response> => {
    const validacion = crearReservaSchema.safeParse(req.body);

    if (!validacion.success) {
        return res.status(400).json({
            error: 'Datos de la reserva inválidos',
            detalle: validacion.error.format()
        });
    }

    try {
        const reserva = await crearReservaService(req.user!.id, validacion.data);
        return res.status(201).json({ mensaje: 'Reserva solicitada. Queda pendiente de confirmación.', reserva });
    } catch (error: any) {
        return res.status(400).json({ error: error.message });
    }
};

// GET /api/reservas?estado=pending -> Punto 25 (listado del dueño o supervisor)
export const listarReservas = async (req: AuthRequest, res: Response): Promise<Response> => {
    const estado = typeof req.query.estado === 'string' ? req.query.estado : undefined;

    if (estado && !(ESTADOS_RESERVA as readonly string[]).includes(estado)) {
        return res.status(400).json({ error: `Estado inválido. Valores posibles: ${ESTADOS_RESERVA.join(', ')}` });
    }

    try {
        const reservas = await listarReservasService(estado);
        return res.status(200).json(reservas);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};

// GET /api/reservas/mias -> reservas del cliente autenticado
export const listarMisReservas = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const reservas = await listarMisReservasService(req.user!.id);
        return res.status(200).json(reservas);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};

// PATCH /api/reservas/:id/aprobar -> Punto 25
export const aprobarReserva = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const reserva = await aprobarReservaService(String(req.params.id));
        return res.status(200).json({ mensaje: 'Reserva confirmada. Se envió el correo al cliente.', reserva });
    } catch (error: any) {
        return res.status(400).json({ error: error.message });
    }
};

// PATCH /api/reservas/:id/rechazar -> Punto 25 (con motivo)
export const rechazarReserva = async (req: AuthRequest, res: Response): Promise<Response> => {
    const validacion = rechazarReservaSchema.safeParse(req.body);

    if (!validacion.success) {
        return res.status(400).json({
            error: 'Debe indicar el motivo del rechazo',
            detalle: validacion.error.format()
        });
    }

    try {
        const reserva = await rechazarReservaService(String(req.params.id), validacion.data.motivo);
        return res.status(200).json({ mensaje: 'Reserva rechazada. Se envió el correo al cliente.', reserva });
    } catch (error: any) {
        return res.status(400).json({ error: error.message });
    }
};

// POST /api/reservas/check-in -> Punto 26 (QR de la mesa sin lista de espera)
export const checkInReserva = async (req: AuthRequest, res: Response): Promise<Response> => {
    const validacion = checkInReservaSchema.safeParse(req.body);

    if (!validacion.success) {
        return res.status(400).json({
            error: 'Datos de ingreso inválidos',
            detalle: validacion.error.format()
        });
    }

    try {
        const resultado = await checkInReservaService(req.user!.id, validacion.data.table_id);
        return res.status(200).json({
            mensaje: `¡Bienvenido! Tu mesa es la N° ${resultado.mesa.table_number}.`,
            ...resultado
        });
    } catch (error: any) {
        return res.status(400).json({ error: error.message });
    }
};
