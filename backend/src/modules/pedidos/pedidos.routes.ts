import { Router } from 'express';
import { crearPedido, verEstadoPedido, confirmarPedido, listarPedidosBar, listarPedidosCocina } from './pedidos.controller';

const router = Router();

router.get('/cocina', listarPedidosCocina);
router.get('/bar', listarPedidosBar);
router.post('/', crearPedido);
router.get('/:id', verEstadoPedido);
router.put('/:id/confirmar', confirmarPedido);

export default router;