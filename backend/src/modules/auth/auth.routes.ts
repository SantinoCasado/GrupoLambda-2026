import { Router } from 'express';
import { login, loginGoogle } from './auth.controller';

const router = Router();

router.post('/login', login);

// POST /api/auth/google -> Ingreso con Google (punto 23), recibe { access_token }
router.post('/google', loginGoogle);

export default router;