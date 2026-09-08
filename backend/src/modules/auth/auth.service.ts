import { supabase } from '../../config/supabase';
import { LoginDTO } from './schema/auth.schema';

export const loginService = async (credenciales: LoginDTO) => {
    // Intenta loguear al usuario en  Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: credenciales.email,
        password: credenciales.password,
    });

    if (authError) {
        throw new Error(`Credenciales incorrectas: ${authError.message}`);
    }

    if (!authData.user || !authData.session) {
        throw new Error('Fallo al generar la sesión del usuario.');
    }

    // Buscaa el perfil en la tabla publica para saber su rol y su estado
    const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single(); // Espera un unico registro

    if (profileError || !userProfile) {
        throw new Error('No se encontró el perfil público del usuario.');
    }

    // Bloquear el acceso directo si esta rechazado
    if (userProfile.status === 'rejected') {
        throw new Error('Acceso denegado. Tu cuenta fue rechazada.');
    }

    // Devuelve el token JWT (para las proximas peticiones) y el perfil completo
    return {
        token: authData.session.access_token,
        perfil: userProfile
    };
};