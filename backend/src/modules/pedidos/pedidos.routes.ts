import { Router } from 'express';
import { crearPedido, verEstadoPedido, confirmarPedido, marcarItemListo, marcarPedidoComoEntregado, confirmarRecepcionPedido, modificarPedido } from './pedidos.controller';
import { verificarAutenticacion } from '../../middleware/auth.middleware';
import { requerirRol } from '../../middleware/auth.middleware';

const router = Router();

router.post('/', crearPedido);
router.get('/:id', verEstadoPedido);

router.put('/:id', modificarPedido);

// Solo el mozo o alguien de un rol mas alto puede confirmar el pedido
router.put('/:id/confirmar', 
    verificarAutenticacion, 
    requerirRol(['mozo', 'dueño', 'supervisor']), 
    confirmarPedido
);

// Solo cocina o bar pueden marcar ítems como listos
router.patch('/items/:item_id/listo', 
    verificarAutenticacion, 
    requerirRol(['cocinero', 'cantinero', 'dueño', 'supervisor']), 
    marcarItemListo
);

// El mozo avisa que dejó la comida en la mesa
router.patch('/:id/entregar', 
    verificarAutenticacion, 
    requerirRol(['mozo', 'dueño', 'supervisor']), 
    marcarPedidoComoEntregado
);

// El cliente confirma que la recibió y arranca a comer
router.patch('/:id/recibir', 
    verificarAutenticacion, 
    requerirRol(['cliente', 'cliente_anonimo']), 
    confirmarRecepcionPedido
);

export default router;