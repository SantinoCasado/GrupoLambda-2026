import { USUARIOS_PRECARGADOS, UsuarioSeed, PerfilUsuario } from "../data/usuariosPrecargados";
import { getSupabaseClient, isSupabaseConfigured } from "../config/supabase";

// Mapeo unívoco de la columna 'role' (inglés) a PerfilUsuario de la UI
const ROLE_TO_PERFIL: Record<string, PerfilUsuario> = {
  owner: "dueño",
  supervisor: "supervisor",
  cook: "cocinero",
  bartender: "cantinero",
  waiter: "mozo",
  maitre: "metre",
  registered_client: "cliente_registrado",
  anonymous_client: "cliente_anonimo",
};

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

  const { data: perfil, error: perfilError } = await client
    .from("users")
    .select("*")
    .eq("id", data.user.id)
    .maybeSingle();

  if (perfilError || !perfil) {
    throw new Error("No se encontró el perfil del usuario en la base de datos.");
  }

  const rol = (perfil.role || "").trim().toLowerCase();
  const perfilUsuario: PerfilUsuario = ROLE_TO_PERFIL[rol] || "cliente_registrado";

  // Verificación de status en inglés
  if (perfilUsuario === "cliente_registrado") {
    const status = (perfil.status || "").trim().toLowerCase();

    if (status === "pending") {
      await client.auth.signOut();
      throw new Error("Tu cuenta está pendiente de aprobación por parte de un dueño o supervisor.");
    }

    if (status === "rejected") {
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
    nombres: perfil.first_name || "Usuario",
    apellidos: perfil.last_name || "",
    documento: perfil.dni || "00000000",
    foto: esSinFoto ? "" : perfil.photo_url || "",
    icono: "👤",
  };
}

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

      if (
        mensaje.includes("pendiente de aprobación") ||
        mensaje.includes("rechazada")
      ) {
        throw error;
      }

      console.log("ℹ️ [Auth] Intento fallido en Supabase, evaluando fallback local:", mensaje);
    }
  }

  return loginLocal(email, clave);
}