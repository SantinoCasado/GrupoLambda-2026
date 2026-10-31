import { Router } from 'express';
import { verificarAutenticacion, requerirRol } from '../../middleware/auth.middleware';
import {
    crearReserva,
    listarReservas,
    listarMisReservas,
    aprobarReserva,
    rechazarReserva,
    checkInReserva
} from './reservas.controller';

const router = Router();

// Punto 24: solo los clientes registrados pueden reservar
router.post('/', verificarAutenticacion, requerirRol(['registered_client']), crearReserva);
router.get('/mias', verificarAutenticacion, requerirRol(['registered_client']), listarMisReservas);

// Punto 26: ingreso con el QR de la mesa reservada, sin pasar por la lista de espera
router.post('/check-in', verificarAutenticacion, requerirRol(['registered_client']), checkInReserva);

// Punto 25: el dueño o supervisor lista, aprueba o rechaza
router.get('/', verificarAutenticacion, requerirRol(['owner', 'supervisor']), listarReservas);
router.patch('/:id/aprobar', verificarAutenticacion, requerirRol(['owner', 'supervisor']), aprobarReserva);
router.patch('/:id/rechazar', verificarAutenticacion, requerirRol(['owner', 'supervisor']), rechazarReserva);

export default router;
