import { Router } from 'express';
import { registrarJugada, obtenerDescuentosPorPedido } from './juegos.controller';

const router = Router();

// POST /api/juegos/jugada -> Registra la jugada, valida primer intento y aplica descuento si corresponde
router.post('/jugada', registrarJugada);

// GET /api/juegos/pedido/:order_id -> Consulta historial de jugadas/descuentos del pedido
router.get('/pedido/:order_id', obtenerDescuentosPorPedido);

export default router;