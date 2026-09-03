import { supabase } from '../../config/supabase';

export const crearEmpleadoService = async (datosEmpleado: any) => {
    
    //  el usuario como Administrador (sin loguearlo)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: datosEmpleado.email,
        password: datosEmpleado.password,
        email_confirm: true // Confirmamos el mail automáticamente
    });

    if (authError) throw new Error(`Fallo de Autenticación: ${authError.message}`);
    if (!authData.user) throw new Error('No se pudo generar el usuario en Auth.');

    // Guardar en la tabla pUblica de RocIo
    const { data: userData, error: userError } = await supabase
        .from('users')
        .insert([
            {
                id: authData.user.id,
                first_name: datosEmpleado.first_name,
                last_name: datosEmpleado.last_name,
                dni: datosEmpleado.dni,
                cuil: datosEmpleado.cuil, 
                email: datosEmpleado.email,
                role: datosEmpleado.role,
                photo_url: datosEmpleado.photo_url || 'https://via.placeholder.com/150',
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