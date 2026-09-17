import { supabase } from '../../config/supabase';
import { CrearClienteDTO } from './schema/cliente.schema';
import { RegistrarAnonimoDTO } from './interface/registrarClienteAnonimo';
import { enviarNotificacionAprobacion } from '../../services/email.service';
import { enviarPushNotification } from '../../services/pushNotifications.service';

// Registrar un nuevo cliente registrado (CU-05)
export const registrarClienteService = async (datos: CrearClienteDTO) => {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: datos.email,
        password: datos.password,
        email_confirm: true 
    });

    if (authError) throw new Error(`Fallo de Autenticación: ${authError.message}`);
    if (!authData.user) throw new Error('No se pudo generar el usuario en Auth.');

    // Guardar en la tabla publica asegurando todos los campos requeridos por la BD
    const { data: userData, error: userError } = await supabase
        .from('users')
        .insert([
            {
                id: authData.user.id, 
                first_name: datos.first_name,
                last_name: datos.last_name,
                dni: datos.dni,
                email: datos.email,
                role: 'registered_client', 
                status: 'pending',
                photo_url: datos.photo_url, // La base de datos lo exige como NOT NULL
                push_token: datos.push_token || null
            }
        ])
        .select();

    if (userError) {
        // Rollback defensivo por si falla la tabla publica
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw new Error(`Fallo al registrar cliente: ${userError.message}`);
    }
    
    return userData;
};

// Registrar un cliente anónimo (CU-09)
export const registrarClienteAnonimoService = async (datos: RegistrarAnonimoDTO) => {
    // Los anónimos no van a Auth, van directo a la lista de espera (CU-09)
    const { data, error } = await supabase
        .from('waiting_list')
        .insert([
            {
                client_name: datos.client_name,
                client_photo: datos.client_photo,
                status: 'waiting' // Estado inicial en la lista de espera
            }
        ])
        .select();

    if (error) throw new Error(`Fallo al registrar cliente anónimo en lista de espera: ${error.message}`);
    return data;
};

// Actualizar el estado de un cliente registrado (CU-06)
export const actualizarEstadoClienteService = async (id: string, status: 'approved' | 'rejected') => {
    // trae los datos del cliente ANTES de tocar nada.
    // nos asegura de tener el email y el push_token para notificarle pase lo que pase.
    const { data: clienteOriginal, error: errorBusqueda } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .eq('role', 'registered_client')
        .single();

    if (errorBusqueda || !clienteOriginal) {
        throw new Error('Cliente no encontrado en la base de datos');
    }

    let datosRespuesta = clienteOriginal;

    // Evalua la accion del supervisor
    if (status === 'approved') {
        // SI APRUEBA: Solo actualiza el estado a 'approved'
        const { data: clienteActualizado, error: errorUpdate } = await supabase
            .from('users')
            .update({ status: 'approved' })
            .eq('id', id)
            .select()
            .single();

        if (errorUpdate) {
            throw new Error(`Error actualizando cliente en base de datos: ${errorUpdate.message}`);
        }
        datosRespuesta = clienteActualizado;

    } else if (status === 'rejected') {
        // SI RECHAZA: Lo borra completamente del sistema
        
        // Borra el usuario del sistema de Autenticación (Libera el email para que vuelva a intentar)
        const { error: errorAuth } = await supabase.auth.admin.deleteUser(id);
        if (errorAuth) {
            console.warn('Advertencia: No se pudo borrar el usuario de Auth:', errorAuth.message);
        }

        // Borramos el registro de la tabla pública (Por si no tienen configurado el borrado en cascada en Supabase)
        const { error: errorDelete } = await supabase
            .from('users')
            .delete()
            .eq('id', id);

        if (errorDelete) {
            throw new Error(`Error eliminando al cliente rechazado: ${errorDelete.message}`);
        }
        
        // Forzamos el estado a rejected en la respuesta para que el frontend sepa qué pasó
        datosRespuesta.status = 'rejected'; 
    }

    // Dispara el correo electronico de forma asincrona
    await enviarNotificacionAprobacion(clienteOriginal.email, clienteOriginal.first_name, status);

    // Dispara el Push Notification si tiene token guardado
    if (clienteOriginal.push_token) {
        const tituloPush = status === 'approved' ? '¡Cuenta Aprobada! 🎉' : 'Actualización de cuenta';
        const cuerpoPush = status === 'approved' 
            ? 'Ya podés ingresar a la app del restaurante.' 
            : 'Tu solicitud de registro fue rechazada por el local.';
        
        await enviarPushNotification(
            clienteOriginal.push_token, 
            tituloPush, 
            cuerpoPush, 
            { statusActualizado: status } 
        );
    }

    // Devuelve el resultado al controlador
    return datosRespuesta;
};

// Listar clientes (Sirve para el CU-06 de aprobaciones)
export const listarClientesService = async (statusFilter?: string) => {
    let query = supabase
        .from('users')
        .select('*')
        .eq('role', 'registered_client'); 

    if (statusFilter) {
        query = query.eq('status', statusFilter); 
    }

    const { data, error } = await query;

    if (error) throw new Error(`Fallo al listar clientes: ${error.message}`);
    return data;
}; 