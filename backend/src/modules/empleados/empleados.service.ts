import { supabase } from '../../config/supabase';
import { CrearEmpleadoDTO } from './schema/empleado.schema';

export const registrarEmpleado = async (datos: CrearEmpleadoDTO) => {
    //  el usuario como Administrador (sin loguearlo)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: datos.email,
        password: datos.password,
        email_confirm: true // Confirmamos el mail automáticamente
    });

    if (authError) throw new Error(`Fallo de Autenticación: ${authError.message}`);
    if (!authData.user) throw new Error('No se pudo generar el usuario en Auth.');

    // Guardar en la tabla pUblica de RocIo
    const { data: userData, error: userError } = await supabase
        .from('users')
        .insert([
            {
                id: authData.user.id, // Vinculacion de la tabla publica con la autenticacion
                first_name: datos.first_name,
                last_name: datos.last_name,
                dni: datos.dni,
                cuil: datos.cuil, 
                email: datos.email,
                role: datos.role,
                photo_url: datos.foto_url || 'https://via.placeholder.com/150',
                status: 'approved'
            }
        ])
        .select();

    // Rollback de seguridad
    if (userError) {
        // Si fallO el insert (ej: DNI repetido), borramos el usuario creado
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw new Error(`Fallo en BD: ${userError.message}`);
    }

    return userData[0]; 
};

export const listarEmpleadosDb = async () => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .in('role', ['owner', 'supervisor', 'metre', 'mozo', 'cocinero', 'cantinero']);

    if (error) throw new Error(`Fallo al listar el staff: ${error.message}`);
    return data;
};

export const obtenerListaEsperaService = async () => {
    const { data, error } = await supabase
        .from('waiting_list')
        .select('*')
        .eq('status', 'waiting')
        .order('joined_at', { ascending: true }); // Clave: Orden cronológico de llegada

    if (error) {
        throw new Error(`Error al obtener lista de espera: ${error.message}`);
    }

    return data;
};