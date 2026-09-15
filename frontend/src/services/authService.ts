import { USUARIOS_PRECARGADOS, UsuarioSeed, PerfilUsuario } from "../data/usuariosPrecargados";
import { getSupabaseClient, isSupabaseConfigured, supabase } from "../config/supabase";

// Mapea el rol en inglés (tabla 'users') al perfil en español del frontend
const ROLE_TO_PERFIL: Record<string, PerfilUsuario> = {
  owner: "dueño",
  supervisor: "supervisor",
  cook: "cocinero",
  bartender: "cantinero",
  waiter: "mozo",
  maitre: "metre",
  delivery: "mozo",
  cliente: "cliente_registrado",
  cliente_registrado: "cliente_registrado",
  registered_client: "cliente_registrado",
  cliente_anonimo: "cliente_anonimo",
};

// Intenta autenticar contra Supabase Auth directamente
async function loginConSupabase(email: string, clave: string): Promise<UsuarioSeed> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Supabase no configurado.");
  }

  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password: clave.trim(),
  });

  if (error || !data.user) {
    throw new Error(error?.message || "Credenciales inválidas.");
  }

  // Obtiene el perfil desde la tabla pública 'users'
  const { data: perfil, error: perfilError } = await client
    .from("users")
    .select("*")
    .eq("id", data.user.id)
    .maybeSingle();

  if (perfilError || !perfil) {
    throw new Error("No se encontró el perfil del usuario en la base de datos.");
  }

  const rol = (perfil.role || "").toLowerCase();
  const perfilUsuario: PerfilUsuario = ROLE_TO_PERFIL[rol] || "cliente_registrado";

  // VALIDACIÓN DE ESTADO PARA CLIENTES REGISTRADOS
  if (perfilUsuario === "cliente_registrado") {
    const estado = (perfil.status || "").toLowerCase();

    if (estado === "pending" || estado === "pendiente") {
      await client.auth.signOut();
      throw new Error("Tu cuenta está pendiente de aprobación por parte de un dueño o supervisor.");
    }

    if (estado === "rejected" || estado === "rechazado") {
      await client.auth.signOut();
      throw new Error("Tu solicitud de registro ha sido rechazada.");
    }
  }

  const esSinFoto = perfilUsuario === "dueño" || perfilUsuario === "supervisor";

  return {
    id: perfil.id || data.user.id,
    email: perfil.email || email,
    clave: clave,
    perfil: perfilUsuario,
    tituloVisual: perfilUsuario.charAt(0).toUpperCase() + perfilUsuario.slice(1),
    nombres: perfil.first_name || perfil.nombre || "Usuario",
    apellidos: perfil.last_name || perfil.apellido || "",
    documento: perfil.dni || "00000000",
    foto: esSinFoto ? "" : perfil.photo_url || "",
    icono: "👤",
  };
}

// Login local contra los usuarios precargados
async function loginLocal(email: string, clave: string): Promise<UsuarioSeed> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const usuario = USUARIOS_PRECARGADOS.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.clave === clave
  );

  if (!usuario) {
    throw new Error("Credenciales inválidas. Verifique correo y contraseña.");
  }

  return usuario;
}

export async function login(email: string, clave: string): Promise<UsuarioSeed> {
  if (isSupabaseConfigured) {
    try {
      return await loginConSupabase(email, clave);
    } catch (error: any) {
      const mensaje = error?.message || "";

      // 🛑 Si el error es de bloqueo de cuenta (pendiente o rechazada), se corta acá y se lanza el error directo a la UI
      if (
        mensaje.includes("pendiente de aprobación") ||
        mensaje.includes("rechazada")
      ) {
        throw error;
      }

      console.log("ℹ️ [Auth] Intento fallido en Supabase, evaluando fallback local:", mensaje);
    }
  }

  // Fallback local únicamente para credenciales precargadas de testing
  return loginLocal(email, clave);
}