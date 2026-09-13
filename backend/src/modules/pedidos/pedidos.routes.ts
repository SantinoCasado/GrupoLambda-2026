import { Router } from 'express';
import { crearPedido, verEstadoPedido, confirmarPedido } from './pedidos.controller';

const router = Router();

router.post('/', crearPedido);
router.get('/:id', verEstadoPedido);
router.put('/:id/confirmar', confirmarPedido);

export default router;