import { supabase } from '../../config/supabase';
import { LoginDTO, GoogleLoginDTO } from './schema/auth.schema';

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

// Ingreso con Google (punto 23). La app inicia sesión con Google mediante Supabase OAuth
// y envía el access_token; acá se valida y se decide si el usuario puede entrar.
export const loginGoogleService = async ({ access_token }: GoogleLoginDTO) => {
    // Valida el token con Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser(access_token);

    if (authError || !user || !user.email) {
        throw new Error('Token de Google inválido o expirado.');
    }

    const emailGoogle = user.email.trim().toLowerCase();

    // 1. Intentar buscar por ID de Auth o por Email
    let { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .or(`id.eq.${user.id},email.ilike.${emailGoogle}`)
        .maybeSingle();

    if (profileError || !userProfile) {
        throw new Error('Este correo de Google no está registrado en Jardín Imperial.');
    }

    // 2. Si el perfil existía por email pero tenía un ID diferente (creado manualmente antes), vinculamos el ID de Supabase Auth
    if (userProfile.id !== user.id) {
        await supabase
            .from('users')
            .update({ id: user.id })
            .eq('email', userProfile.email);
            
        userProfile.id = user.id;
    }

    // Los clientes anónimos no inician sesión
    if (userProfile.role === 'anonymous_client') {
        throw new Error('Los clientes anónimos no pueden ingresar con Google.');
    }

    // Mismas reglas de aprobación
    if (userProfile.status === 'pending') {
        throw new Error('Tu cuenta está pendiente de aprobación por parte de un dueño o supervisor.');
    }

    if (userProfile.status === 'rejected') {
        throw new Error('Acceso denegado. Tu cuenta fue rechazada.');
    }

    return {
        token: access_token,
        perfil: userProfile
    };
};