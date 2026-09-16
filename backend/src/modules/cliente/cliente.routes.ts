import { Router } from 'express';
import { registrarCliente, registrarClienteAnonimo, listarClientes, actualizarEstadoCliente, eliminarUsuarioFisico } from './cliente.controllers';
import { upload } from '../../middleware/upload.middleware';
import { verificarAutenticacion, requerirRol } from '../../middleware/auth.middleware';

const router = Router();

// Solo un usuario autenticado con rol 'owner' o 'supervisor' puede aprobar clientes
router.patch(
    '/:id/status', 
    verificarAutenticacion, 
    requerirRol(['owner', 'supervisor']), 
    actualizarEstadoCliente
);

/*
- GET /api/clientes -> Trae todos
- GET /api/clientes?estado=pendiente -> Trae solo los pendientes
- GET /api/clientes?estado=activo -> Trae solo los aprobados
*/
router.get('/', listarClientes);

// 'foto' es el nombre del campo (key) que el frontend debe usar al enviar el archivo
router.post('/register', upload.single('foto'), registrarCliente); // Para clientes registrados (CU-05)
router.post('/anonymous', registrarClienteAnonimo); // Para clientes anónimos (CU-09)



//==========================================================================================
// RUTA DE DELETE FISICO DE USUARIO, SOLO PARA DESARROLLO Y TESTING, NO PARA PRODUCCION
//==========================================================================================
router.delete('/:id', eliminarUsuarioFisico);


export default router;