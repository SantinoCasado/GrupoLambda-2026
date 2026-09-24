import { UsuarioSeed, PerfilUsuario } from "../data/usuariosPrecargados";
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

export async function login(email: string, clave: string): Promise<UsuarioSeed> {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase no configurado. Definí EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY en el entorno."
    );
  }

  return loginConSupabase(email, clave);
}