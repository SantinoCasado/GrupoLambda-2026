import { Router } from 'express';
import { crearEmpleado, listarEmpleados, eliminarUsuarioFisico } from './empleados.controller';
import { upload } from '../../middleware/upload.middleware';

const router = Router();

// Endpoint: POST /api/usuarios/empleados
router.post('/empleados', upload.single('foto'), crearEmpleado);

// Endpoint: GET /api/usuarios/empleados
router.get('/empleados', listarEmpleados);


//==========================================================================================
// RUTA DE DELETE FISICO DE USUARIO, SOLO PARA DESARROLLO Y TESTING, NO PARA PRODUCCION
//==========================================================================================
router.delete('/:id', eliminarUsuarioFisico);

export default router;