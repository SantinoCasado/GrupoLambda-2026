import { Request, Response } from 'express';
import { crearEmpleadoSchema } from './schema/empleado.schema';
import { registrarEmpleado, listarEmpleadosDb } from './empleados.service';
import { subirImagenSupabase } from '../../services/storage.service';

export const listarEmpleados = async (req: Request, res: Response) => {
    try {
        const empleados = await listarEmpleadosDb();
        return res.status(200).json({ data: empleados });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};

export const crearEmpleado = async (req: Request, res: Response): Promise<Response> => {
    if (!req.file) {
        return res.status(400).json({ error: 'La foto es obligatoria' });
    }

    // Sube la imagen a Supabase y obtenemos la URL
    const photoUrl = await subirImagenSupabase(req.file);

    const datosParaValidar = {
        ...req.body,
        photo_url: photoUrl
    };
    
    const validacion = crearEmpleadoSchema.safeParse(datosParaValidar);
    
    if (!validacion.success) {
        return res.status(400).json({ 
            error: 'Datos inválidos o incompletos',
            detalle: validacion.error.format() 
        });
    }

    const datosLimpios = validacion.data;
    const { role, rol_creador } = datosLimpios;

    // ------------------------ REGLAS DE NEGOCIO (Permisos) --------------------
    if (role === 'supervisor' && rol_creador !== 'owner') {
        return res.status(403).json({ 
            error: 'Permiso denegado. Solo un Dueño puede dar de alta a un Supervisor.' 
        });
    }

    const rolesStaff = ['cook', 'bartender', 'waiter', 'maitre', 'delivery'];
    if (rolesStaff.includes(role)) {
        if (rol_creador !== 'owner' && rol_creador !== 'supervisor') {
            return res.status(403).json({ 
                error: 'Permiso denegado. Se requiere nivel Dueño o Supervisor para esta acción.' 
            });
        }
    }

    try {
        const nuevoUsuario = await registrarEmpleado(datosLimpios);
        return res.status(201).json({
            mensaje: `Empleado (${role}) creado con éxito por un ${rol_creador}.`,
            status: 'OK',
            data: nuevoUsuario
        });
    } catch (error: any) {
        return res.status(500).json({ error: 'Fallo al registrar en Base de Datos', detalle: error.message });
    }
};