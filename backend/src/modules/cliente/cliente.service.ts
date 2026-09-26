import { supabase } from '../../config/supabase';
import { CrearClienteDTO } from './schema/cliente.schema';
import { RegistrarAnonimoDTO } from './interface/registrarClienteAnonimo';
import { DatosListaEspera } from './interface/datosListaEspera';
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

// Registrar un cliente anónimo 
export const registrarClienteAnonimoService = async (datos: RegistrarAnonimoDTO) => {
    const { data: authData, error: authError } = await supabase.auth.signInAnonymously();

    if (authError || !authData.user) {
        throw new Error(`Fallo de Autenticación Anónima: ${authError?.message}`);
    }

    const anonUserId = authData.user.id;

    const { error: userError } = await supabase
        .from('users')
        .insert([
            {
                id: anonUserId,
                first_name: datos.client_name,
                photo_url: datos.client_photo,
                role: 'anonymous_client',
                status: 'approved'
            }
        ]);

    if (userError) {
        throw new Error(`Error al crear usuario anónimo en users: ${userError.message}`);
    }

    const { data: waitingData, error: waitingError } = await supabase
        .from('waiting_list')
        .insert([
            {
                user_id: anonUserId,
                client_name: datos.client_name,
                client_photo: datos.client_photo,
                status: 'waiting'
            }
        ])
        .select()
        .single();

    if (waitingError) {
        // Borrado preventivo si falla la lista de espera
        await supabase.from('users').delete().eq('id', anonUserId);
        throw new Error(`Fallo al registrar en lista de espera: ${waitingError.message}`);
    }

    return {
        user: {
            id: anonUserId,
            name: datos.client_name,
            photo_url: datos.client_photo,
            role: 'anonymous_client',
            session: authData.session
        },
        waiting_entry: waitingData
    };
};

// Actualizar el estado de un cliente registrado 
export const actualizarEstadoClienteService = async (id: string, status: 'approved' | 'rejected') => {
    // trae los datos del cliente ANTES de tocar nada.
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
        const { error: errorAuth } = await supabase.auth.admin.deleteUser(id);
        if (errorAuth) {
            console.warn('Advertencia: No se pudo borrar el usuario de Auth:', errorAuth.message);
        }

        const { error: errorDelete } = await supabase
            .from('users')
            .delete()
            .eq('id', id);

        if (errorDelete) {
            throw new Error(`Error eliminando al cliente rechazado: ${errorDelete.message}`);
        }
        
        datosRespuesta.status = 'rejected'; 
    }

    // Guarda el booleano que devuelve el mail
    const emailEnviado = await enviarNotificacionAprobacion(clienteOriginal.email, clienteOriginal.first_name, status);

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

    // bandera del email adentro del objeto que devolvemos
    return {
        ...datosRespuesta,
        email_enviado: emailEnviado
    };
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

export const ingresarClienteListaService = async (datos: DatosListaEspera) => {
    const { data: waitingRecord, error: insertError } = await supabase
        .from('waiting_list')
        .insert([{ 
            user_id: datos.user_id,
            client_name: datos.client_name,
            client_photo: datos.client_photo,
            status: 'waiting'
        }])
        .select()
        .single();

    if (insertError) {
        throw new Error(`Error al insertar en lista de espera: ${insertError.message}`);
    }

    return waitingRecord;
};