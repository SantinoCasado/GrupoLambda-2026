import { Router } from 'express';
import { crearEmpleado, listarEmpleados, eliminarUsuarioFisico, obtenerListaEspera } from './empleados.controller';
import { upload } from '../../middleware/upload.middleware';
import { verificarAutenticacion, requerirRol } from '../../middleware/auth.middleware';

const router = Router();

// Endpoint: POST /api/usuarios/empleados
router.post('/empleados', upload.single('foto'), crearEmpleado);

// Endpoint: GET /api/usuarios/empleados
router.get('/empleados', listarEmpleados);

// Solo el metre (y administradores) deberían poder ver la cola de espera
router.get('/', 
    verificarAutenticacion, 
    requerirRol(['maitre', 'owner', 'supervisor']), 
    obtenerListaEspera
);


//==========================================================================================
// RUTA DE DELETE FISICO DE USUARIO, SOLO PARA DESARROLLO Y TESTING, NO PARA PRODUCCION
//==========================================================================================
router.delete('/:id', eliminarUsuarioFisico);

export default router;