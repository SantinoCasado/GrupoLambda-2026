import { Router } from 'express';
import { 
    crearPedido, 
    verEstadoPedido, 
    confirmarPedido, 
    marcarItemListo,
    marcarPedidoComoEntregado, 
    confirmarRecepcionPedido, 
    modificarPedido, 
    listarPedidosBar, 
    listarPedidosCocina,
    cobrarPedido,
    solicitarCuenta, 
    eliminarPedido,
    obtenerResumenPrecios
} from './pedidos.controller';
import { verificarAutenticacion } from '../../middleware/auth.middleware';
import { requerirRol } from '../../middleware/auth.middleware';

const router = Router();

router.get('/cocina', listarPedidosCocina);
router.get('/bar', listarPedidosBar);
router.post('/', crearPedido);
router.get('/:id', verEstadoPedido);

// Solo el cliente dueño de la orden puede corregir un pedido rechazado
router.put('/:id', 
    verificarAutenticacion, 
    requerirRol(['registered_client', 'anonymous_client']), 
    modificarPedido
);

// Solo el mozo o alguien de un rol mas alto puede confirmar el pedido
router.put('/:id/confirmar', 
    verificarAutenticacion, 
    requerirRol(['waiter', 'owner', 'supervisor']), 
    confirmarPedido
);

// Solo cocina o bar pueden marcar ítems como listos
router.patch('/items/:item_id/listo', 
    verificarAutenticacion, 
    requerirRol(['cook', 'bartender', 'owner', 'supervisor']), 
    marcarItemListo
);

// El mozo avisa que dejó la comida en la mesa
router.patch('/:id/entregar', 
    verificarAutenticacion, 
    requerirRol(['waiter', 'owner', 'supervisor']), 
    marcarPedidoComoEntregado
);

// El cliente confirma que la recibió y arranca a comer
router.patch('/:id/recibir', 
    verificarAutenticacion, 
    requerirRol(['registered_client', 'anonymous_client']), 
    confirmarRecepcionPedido
);

// Ruta para que el cliente pida la cuenta (Paso 1)
router.patch('/:id/solicitar-cuenta', verificarAutenticacion, solicitarCuenta);

// La ruta que para que el mozo cobre (Paso 2)
router.post(
    '/cobrar',
    verificarAutenticacion,
    requerirRol(['delivery', 'waiter', 'owner', 'supervisor']),
    cobrarPedido
);

// GET del resumen de precios
router.get('/:id/resumen-precios', obtenerResumenPrecios);

// ===================================================
// FUNCION EXCLUSIVA PARA TESTS: BORRAR TODO EL PEDIDO
// ===================================================
router.delete('/:id', eliminarPedido);


export default router;