import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';

// Extiende la interfaz Request para que TypeScript reconozca req.user
export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
        status: string;
    };
}

export const verificarAutenticacion = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Token de acceso no proporcionado' });
            return;
        }

        const token = authHeader.split(' ')[1];

        // Valida token con Supabase Auth
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            res.status(401).json({ error: 'Token inválido o expirado' });
            return;
        }

        // Busca el perfil en la tabla users para obtener rol y estado
        const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError || !userProfile) {
            res.status(403).json({ error: 'No se encontró el perfil del usuario en la base de datos' });
            return;
        }

        // Bloquear si el usuario no esta aprobado
        if (userProfile.status !== 'approved') {
            res.status(403).json({ error: `Acceso denegado. Tu cuenta se encuentra en estado: ${userProfile.status}` });
            return;
        }

        // Inyecta los datos del usuario en la request
        req.user = {
            id: userProfile.id,
            email: userProfile.email,
            role: userProfile.role,
            status: userProfile.status
        };

        next();
    } catch (error: any) {
        res.status(500).json({ error: 'Error interno en la autenticación', detalle: error.message });
    }
};

// Middleware secundario para filtrar por roles especificos
export const requerirRol = (rolesPermitidos: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Usuario no autenticado' });
            return;
        }

        if (!rolesPermitidos.includes(req.user.role)) {
            res.status(403).json({ 
                error: `Acceso denegado. No tenés los permisos necesarios para esta acción.` 
            });
            return;
        }

        next();
    };
};