import { Request, Response } from 'express';
import { listarClientesService, registrarClienteService, registrarClienteAnonimoService, actualizarEstadoClienteService } from './cliente.service';
import { crearClienteSchema, crearClienteAnonimoSchema, cambiarEstadoSchema } from './schema/cliente.schema';
import { subirImagenSupabase } from '../../services/storage.service';
import { supabase } from '../../config/supabase';

export const registrarCliente = async (req: Request, res: Response): Promise<Response> => {
    // Verifica que el archivo "foto" haya llegado
    if (!req.file) {
        return res.status(400).json({ error: 'La foto es obligatoria' });
    }

    // Sube la imagen a Supabase y obtenemos la URL
    const photoUrl = await subirImagenSupabase(req.file);

    // Une los campos de texto (req.body) con la URL generada
    // Al ser multipart/form-data, los campos numericos llegan como strings, Zod los parseara si es necesario
    const datosParaValidar = {
        ...req.body,
        photo_url: photoUrl
    };
    
    const validacion = crearClienteSchema.safeParse(datosParaValidar);

    if(!validacion.success) {
        return res.status(400).json({
            error: 'Datos inválidos o incompletos',
            detalle: validacion.error.format()
        });
    }

    try {
        // Llamada del servicio para registrar un cliente registrado en Auth y en la tabla publica
        const nuevoCliente = await registrarClienteService(validacion.data);
        return res.status(201).json({ data: nuevoCliente });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};

export const registrarClienteAnonimo = async (req: Request, res: Response): Promise<Response> => {
    const validacion = crearClienteAnonimoSchema.safeParse(req.body);

    if(!validacion.success) {
        return res.status(400).json({
            error: 'Datos inválidos o incompletos',
            detalle: validacion.error.format()
        });
    }

    try {
        // Llamada del servicio para registrar un cliente anonimo en la lista de espera
        const nuevoAnonimo = await registrarClienteAnonimoService(validacion.data);

        return res.status(201).json({ 
            mensaje: 'Cliente anónimo agregado a la lista de espera con éxito.',
            data: nuevoAnonimo 
        });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};

export const listarClientes = async (req: Request, res: Response) => {
    try {
        const { estado } = req.query;
        const clientes = await listarClientesService(estado as string);
        return res.status(200).json({ data: clientes });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};

export const actualizarEstadoCliente = async (req: Request, res: Response): Promise<Response> => {
    // Extrae el id y asegura de que sea un string plano
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!id) {
        return res.status(400).json({ error: 'El ID del cliente es obligatorio' });
    }
    
    const validacion = cambiarEstadoSchema.safeParse(req.body);

    if (!validacion.success) {
        return res.status(400).json({
            error: 'Estado inválido',
            detalle: validacion.error.format()
        });
    }

    try {
        // TypeScript ya sabe que 'id' es un string puro
        const clienteActualizado = await actualizarEstadoClienteService(id, validacion.data.status);
        
        return res.status(200).json({ 
            mensaje: `Cliente actualizado a estado: ${validacion.data.status}. Correo enviado.`,
            data: clienteActualizado 
        });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};


//==========================================================================================
// OPERACION DE DELETE FISICO DE USUARIO, SOLO PARA DESARROLLO Y TESTING, NO PARA PRODUCCION
//==========================================================================================
export const eliminarUsuarioFisico = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Se requiere un ID válido en formato texto.' });
    }

    try {
        // Borra de Auth para liberar el email
        const { error: errorAuth } = await supabase.auth.admin.deleteUser(id);
        if (errorAuth) {
            console.warn('No se pudo borrar de Auth (tal vez no existía):', errorAuth.message);
        }

        // Borra de la tabla pública
        const { error: errorDb } = await supabase
            .from('users')
            .delete()
            .eq('id', id);

        if (errorDb) throw errorDb;

        return res.status(200).json({ mensaje: 'Usuario Cliente eliminado físicamente con éxito' });
    } catch (error: any) {
        return res.status(500).json({ error: `Error al eliminar el usuario: ${error.message}` });
    }
};