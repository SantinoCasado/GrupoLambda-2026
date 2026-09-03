import { Router } from 'express';
import { crearEmpleado } from './usuarios.controller';

const router = Router();

// Endpoint: POST /api/usuarios/empleados
router.post('/empleados', crearEmpleado);

export default router;