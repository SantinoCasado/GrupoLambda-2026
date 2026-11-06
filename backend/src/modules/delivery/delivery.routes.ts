import { Router } from 'express';
import {
  obtenerPedidosDelivery,
  obtenerPedidoDeliveryPorId,
  tomarPedidoDelivery,
  entregarPedidoDelivery,
} from './delivery.controller';

const router = Router();

// GET /api/delivery (Acepta query params: ?status=... & repartidor_id=...)
router.get('/', obtenerPedidosDelivery);

// GET /api/delivery/:id (Detalle de una orden especifica)
router.get('/:id', obtenerPedidoDeliveryPorId);

// PATCH /api/delivery/:id/tomar (Punto 29)
router.patch('/:id/tomar', tomarPedidoDelivery);

// PATCH /api/delivery/:id/entregar -> El repartidor confirma entrega y dispara factura (Punto 30)
router.patch('/:id/entregar', entregarPedidoDelivery);

export default router;