import { Router } from 'express';
import { login } from './auth.controller';
import { supabase } from '../../config/supabase';
const router = Router();

router.post('/login', login);

// Endpoint para autenticación con Google
router.post('/google', async (req, res) => {
  try {
    const { access_token } = req.body;

    if (!access_token) {
      return res.status(400).json({ error: 'Falta el token de acceso.' });
    }

    // 1. Validar el token con Supabase y obtener el usuario
    const { data: { user }, error: authError } = await supabase.auth.getUser(access_token);

    if (authError || !user || !user.email) {
      return res.status(401).json({ error: 'Token inválido o expirado.' });
    }

    // 2. Buscar al usuario en la tabla users por email
    const { data: perfil, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('email', user.email.toLowerCase().trim())
      .maybeSingle();

    if (dbError) {
      return res.status(500).json({ error: 'Error en la base de datos.' });
    }

    if (!perfil) {
      return res.status(401).json({ error: 'El correo no se encuentra registrado en el sistema.' });
    }

    // 3. Validar estado si es cliente
    const rol = (perfil.role || '').toLowerCase().trim();
    if (rol === 'registered_client' || rol === 'cliente_registrado' || rol === 'customer') {
      const status = (perfil.status || '').toLowerCase().trim();
      if (status === 'pending') {
        return res.status(401).json({ error: 'Tu cuenta está pendiente de aprobación.' });
      }
      if (status === 'rejected') {
        return res.status(401).json({ error: 'Tu solicitud ha sido rechazada.' });
      }
    }

    // 4. Retornar éxito idéntico a lo que espera el frontend
    return res.status(200).json({
      mensaje: 'Login con Google exitoso',
      token: access_token,
      usuario: perfil,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno del servidor.' });
  }
});

export default router;