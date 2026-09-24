import { Router } from 'express';
import { verificarAutenticacion, requerirRol } from '../../middleware/auth.middleware';
import { enviarEncuesta, obtenerGraficos } from './encuestas.controller';

const router = Router();

// El cliente envía su opinión (POST)
router.post('/', 
    verificarAutenticacion, 
    requerirRol(['cliente', 'cliente_anonimo']), 
    enviarEncuesta
);

// Cualquiera que escanee el QR de salida o los dueños ven las estadísticas (GET)
router.get('/estadisticas', 
    obtenerGraficos
);

export default router;