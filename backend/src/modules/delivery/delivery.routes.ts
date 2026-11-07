import { Router } from 'express';
import {
  obtenerPedidosDelivery,
  obtenerPedidoDeliveryPorId,
  tomarPedidoDelivery,
  entregarPedidoDelivery,
} from './delivery.controller';
import {
  verificarAutenticacion,
  requerirRol,
} from '../../middleware/auth.middleware';

const router = Router();

const ROLES_DELIVERY = ['delivery', 'owner', 'supervisor'];

// GET /api/delivery (Acepta query params: ?status=... & repartidor_id=...)
router.get('/', verificarAutenticacion, requerirRol(ROLES_DELIVERY), obtenerPedidosDelivery);

// GET /api/delivery/:id (Detalle de una orden especifica)
router.get('/:id', verificarAutenticacion, requerirRol(ROLES_DELIVERY), obtenerPedidoDeliveryPorId);

// PATCH /api/delivery/:id/tomar -> El repartidor toma el pedido listo
router.patch('/:id/tomar', verificarAutenticacion, requerirRol(ROLES_DELIVERY), tomarPedidoDelivery);

// PATCH /api/delivery/:id/entregar -> El repartidor confirma la entrega en el domicilio
router.patch('/:id/entregar', verificarAutenticacion, requerirRol(ROLES_DELIVERY), entregarPedidoDelivery);

export default router;
