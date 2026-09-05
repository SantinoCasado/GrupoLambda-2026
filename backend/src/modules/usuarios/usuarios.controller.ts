import { Request, Response } from 'express';
import { crearEmpleadoSchema } from './schema/empleado.schema';
import { crearEmpleadoService } from './usuarios.service';

export const crearEmpleado = async (req: Request, res: Response): Promise<void> => {
    
    // ZOD valida tipos, largos y campos obligatorios
    const validacion = crearEmpleadoSchema.safeParse(req.body);
    
    if (!validacion.success) {
        // Usamos .format() para que el frontend reciba un error prolijo
        res.status(400).json({ 
            error: 'Datos inválidos o incompletos',
            detalle: validacion.error.format() 
        });
        return;
    }

    // Si paso Zod, TypeScript sabe que estos datos son 100% seguros
    const datosLimpios = validacion.data;
    const { role, rol_creador } = datosLimpios;

    // ------------------------ REGLAS DE NEGOCIO (Permisos) --------------------
    // Solo el Dueño ('owner') puede crear Supervisores
    if (role === 'supervisor' && rol_creador !== 'owner') {
        res.status(403).json({ 
            error: 'Permiso denegado. Solo un Dueño puede dar de alta a un Supervisor.' 
        });
        return;
    }

    // Solo Dueño o Supervisor pueden crear al resto del staff
    const rolesStaff = ['cook', 'bartender', 'waiter', 'maitre', 'delivery'];
    if (rolesStaff.includes(role)) {
        if (rol_creador !== 'owner' && rol_creador !== 'supervisor') {
            res.status(403).json({ 
                error: 'Permiso denegado. Se requiere nivel Dueño o Supervisor para esta acción.' 
            });
            return;
        }
    }

    try {
        // Le pasa los datos impolutos a la "Cocina" (El servicio)
        const nuevoUsuario = await crearEmpleadoService(datosLimpios);

        res.status(201).json({
            mensaje: `Empleado (${role}) creado con éxito por un ${rol_creador}.`,
            status: 'OK',
            data: nuevoUsuario
        });
    } catch (error: any) {
        res.status(500).json({ error: 'Fallo al registrar en Base de Datos', detalle: error.message });
    }
};