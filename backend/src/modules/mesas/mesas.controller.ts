import { Request, Response } from 'express';
import { crearMesaSchema, cambiarEstadoMesaSchema } from './schema/mesas.schema';
import { insertarMesaService, cambiarEstadoMesaService, obtenerMesasService } from './mesas.service';
import { supabase } from '../../config/supabase';
import { subirImagenSupabase } from '../../services/storage.service';

export const crearMesa = async (req: Request, res: Response): Promise<Response> => {
    try {
        const usuarioLogueado = (req as any).user;

        // ------------------------ REGLAS DE NEGOCIO (Permisos) --------------------
        // Solo Owner o Cook pueden crear Platos o Postres
        if (!['owner', 'supervisor'].includes(usuarioLogueado.role)) {
            return res.status(403).json({ 
                error: 'Permiso denegado. Solo un Supervisor o Dueño puede dar de altas mesas mesas.' 
            });
        }
        // --------------------------------------------------------------------------

        // Verificamos que venga la foto de la mesa
        if (!req.file) {
            return res.status(400).json({ error: 'La fotografía de la mesa es obligatoria.' });
        }

        // Validacion estricta con Zod
        const validacion = crearMesaSchema.safeParse(req.body);

        if (!validacion.success) {
            return res.status(400).json({ 
                error: 'Error de validación en los datos',
                detalle: validacion.error.format() 
            });
        }

        const { table_number, capacity, table_type } = validacion.data;
        
        // Generacion automática del QR
        const qrDataGenerado = `RESTO-TFI-MESA-${table_number}`;

        // Sube la foto al bucket 
        const photoUrl = await subirImagenSupabase(req.file, 'fotos_mesas');
        
        // Guarda en la base de datos
        const nuevaMesa = await insertarMesaService(
            table_number, 
            capacity, 
            table_type, 
            photoUrl, 
            qrDataGenerado
        );

        return res.status(201).json({
            mensaje: `Mesa #${table_number} registrada correctamente.`,
            data: nuevaMesa
        });

    } catch (error: any) {
        // Atrapa el error de número duplicado o cualquier otro
        return res.status(500).json({ error: 'Fallo al procesar el alta de la mesa', detalle: error.message });
    }
};

export const actualizarEstadoMesa = async (req: Request, res: Response): Promise<Response> => {
    try {
        const id = req.params.id as string;
        const usuarioLogueado = (req as any).user;

        if (!id) {
            return res.status(400).json({ error: 'El ID de la mesa es obligatorio' });
        }

        // Control de Roles (Dueño, Supervisor o Metre)
        if (!['owner', 'supervisor', 'metre'].includes(usuarioLogueado.role)) {
            return res.status(403).json({ 
                error: 'Permiso denegado. Solo un Metre, Supervisor o Dueño puede cambiar el estado de las mesas.' 
            });
        }

        // Validacion del body con Zod
        const validacion = cambiarEstadoMesaSchema.safeParse(req.body);
        
        if (!validacion.success) {
            return res.status(400).json({ 
                error: 'Estado inválido',
                detalle: validacion.error.format() 
            });
        }

        // Ejecucion en base de datos
        const mesaActualizada = await cambiarEstadoMesaService(id, validacion.data.availability);

        if (!mesaActualizada) {
            return res.status(404).json({ error: 'Mesa no encontrada' });
        }

        return res.status(200).json({
            mensaje: `Mesa actualizada a estado: ${validacion.data.availability}`,
            data: mesaActualizada
        });

    } catch (error: any) {
        return res.status(500).json({ error: 'Fallo al cambiar el estado de la mesa', detalle: error.message });
    }
};

export const obtenerMesas = async (req: Request, res: Response): Promise<Response> => {
    try {
        const mesas = await obtenerMesasService();
        return res.status(200).json({ data: mesas });
    } catch (error: any) {
        return res.status(500).json({ error: 'Fallo al obtener las mesas', detalle: error.message });
    }
};


//==========================================================================================
// OPERACION DE DELETE FISICO DE MESA, SOLO PARA DESARROLLO Y TESTING, NO PARA PRODUCCION
//==========================================================================================
export const eliminarMesaFisica = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const { error } = await supabase
            .from('restaurant_tables')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return res.status(200).json({ mensaje: 'Mesa eliminada físicamente de la base de datos' });
    } catch (error: any) {
        return res.status(500).json({ error: `Error al eliminar la mesa: ${error.message}` });
    }
};