import { Request, Response } from 'express';
import { loginSchema, googleLoginSchema } from './schema/auth.schema';
import { loginService, loginGoogleService } from './auth.service';

export const login = async (req: Request, res: Response): Promise<Response> => {
    // Valida formato de email y password
    const validacion = loginSchema.safeParse(req.body);

    if (!validacion.success) {
        return res.status(400).json({
            error: 'Datos de inicio de sesión inválidos',
            detalle: validacion.error.format()
        });
    }

    try {
        // Ejecuta el login
        const datosLogin = await loginService(validacion.data);

        // Responde con el token y los datos del usuario
        return res.status(200).json({
            mensaje: 'Inicio de sesión exitoso',
            token: datosLogin.token,
            usuario: datosLogin.perfil
        });
    } catch (error: any) {
        // Si el usuario pone mal la contraseña o esta rechazado, cae aca
        return res.status(401).json({ error: error.message });
    }
};

export const loginGoogle = async (req: Request, res: Response): Promise<Response> => {
    // Valida que llegue el token de la sesión de Google
    const validacion = googleLoginSchema.safeParse(req.body);

    if (!validacion.success) {
        return res.status(400).json({
            error: 'Datos de inicio de sesión con Google inválidos',
            detalle: validacion.error.format()
        });
    }

    try {
        const datosLogin = await loginGoogleService(validacion.data);

        return res.status(200).json({
            mensaje: 'Inicio de sesión con Google exitoso',
            token: datosLogin.token,
            usuario: datosLogin.perfil
        });
    } catch (error: any) {
        // Token inválido, correo no registrado, cuenta pendiente o rechazada
        return res.status(401).json({ error: error.message });
    }
};