import { supabase } from '../../config/supabase';
import { CrearClienteDTO } from './schema/cliente.schema';
import { RegistrarAnonimoDTO } from './interface/registrarClienteAnonimo';
import { enviarNotificacionAprobacion } from '../../services/email.service';

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
                photo_url: datos.photo_url // La base de datos lo exige como NOT NULL
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
    // Actualiza el estado en la tabla public.users
    const { data, error } = await supabase
        .from('users')
        .update({ status: status })
        .eq('id', id)
        .eq('role', 'registered_client') // Seguridad extra para asegurar que modifica un cliente
        .select()
        .single(); // Trae el registro actualizado

    if (error) {
        throw new Error(`Error actualizando cliente en base de datos: ${error.message}`);
    }

    if (!data) {
        throw new Error('Cliente no encontrado en la base de datos');
    }

    // Dispara el correo electronico de forma asincrona mediante Resend
    await enviarNotificacionAprobacion(data.email, data.first_name, status);

    return data;
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