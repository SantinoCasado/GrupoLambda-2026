import { Router } from 'express';
import { crearEmpleado, listarEmpleados } from './empleados.controller';
import { upload } from '../../middleware/upload.middleware';

const router = Router();

// Endpoint: POST /api/usuarios/empleados
router.post('/empleados', upload.single('foto'), crearEmpleado);

// Endpoint: GET /api/usuarios/empleados
router.get('/empleados', listarEmpleados);

export default router;