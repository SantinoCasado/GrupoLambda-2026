import { Router } from 'express';
import { verificarAutenticacion } from '../../middleware/auth.middleware';
import { enviarMensaje, listarMensajes } from './chat.controller';

const router = Router();

// POST /api/chat -> Enviar un mensaje
router.post('/', verificarAutenticacion, enviarMensaje);

// GET /api/chat -> Obtener los mensajes del chat (opcional: ?table_id=UUID)
router.get('/', verificarAutenticacion, listarMensajes);

export default router;