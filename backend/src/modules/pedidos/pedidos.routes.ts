import { Router } from 'express';
import { crearPedido, verEstadoPedido } from './pedidos.controller';

const router = Router();

// POST /api/pedidos ---- Crear pedido nuevo
router.post('/', crearPedido);

// GET /api/pedidos/:id ---- Consultar estado del pedido
router.get('/:id', verEstadoPedido);

export default router;