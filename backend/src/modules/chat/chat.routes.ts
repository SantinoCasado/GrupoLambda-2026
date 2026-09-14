import { Router } from 'express';
import { enviarMensaje, listarMensajes } from './chat.controller';

const router = Router();

// POST /api/chat -> Enviar un mensaje
router.post('/', enviarMensaje);

// GET /api/chat -> Obtener los mensajes del chat (opcional: ?table_id=UUID)
router.get('/', listarMensajes);

export default router;