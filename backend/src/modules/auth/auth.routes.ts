import { Router } from 'express';
import { login, loginGoogle } from './auth.controller';

const router = Router();

router.post('/login', login);

router.post('/google', loginGoogle);

export default router;