import { UsuarioSeed, PerfilUsuario } from "../data/usuariosPrecargados";
import { getSupabaseClient, isSupabaseConfigured, supabase } from "../config/supabase";
import { API_URL } from "../config/api";
import { makeRedirectUri } from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import * as WebBrowser from "expo-web-browser";

// Requerido por expo-web-browser para gestionar sesiones pendientes en Android
WebBrowser.maybeCompleteAuthSession();

// Mapeo unívoco de la columna 'role' a PerfilUsuario de la UI
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

const TITULOS_VISUALES: Record<PerfilUsuario, string> = {
  dueño: "Dueño",
  supervisor: "Supervisor",
  cocinero: "Cocinero",
  cantinero: "Cantinero",
  mozo: "Mozo",
  metre: "Metre",
  cliente_registrado: "Cliente",
  cliente_anonimo: "Invitado",
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

  return {
    id: perfil.id || data.user.id,
    email: perfil.email || email,
    clave: clave,
    perfil: perfilUsuario,
    tituloVisual: TITULOS_VISUALES[perfilUsuario] || "Usuario",
    nombres: perfil.first_name || "Usuario",
    apellidos: perfil.last_name || "",
    documento: perfil.dni || "00000000",
    foto: perfil.photo_url || "",
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

export async function loginConGoogle(): Promise<UsuarioSeed> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase no configurado.");
  }

  const client = getSupabaseClient() || supabase;

  // 1. Usar el esquema de la app
  const redirectTo = "jardinimperial://google-auth";

  // 2. Pedir la URL de OAuth a Supabase
  const { data: authData, error: oauthError } = await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: {
        prompt: "select_account", // Fuerza a Google a mostrar la lista de cuentas
        access_type: "offline",
      },
    },
  });

  if (oauthError || !authData?.url) {
    throw new Error(oauthError?.message || "No se pudo iniciar la autenticación con Google.");
  }

  // 3. Abrir navegador nativo
  const res = await WebBrowser.openAuthSessionAsync(authData.url, redirectTo);

  if (res.type !== "success" || !res.url) {
    throw new Error("Se canceló el ingreso con Google.");
  }

  // 4. Extraer access_token y refresh_token (soporta hash fragment # y query params ?)
  let accessToken: string | undefined;
  let refreshToken: string | undefined;

  if (res.url.includes("#")) {
    const hash = res.url.split("#")[1];
    const params = new URLSearchParams(hash);
    accessToken = params.get("access_token") || undefined;
    refreshToken = params.get("refresh_token") || undefined;
  } else {
    const { params } = QueryParams.getQueryParams(res.url);
    accessToken = params.access_token;
    refreshToken = params.refresh_token;
  }

  if (!accessToken) {
    throw new Error("No se obtuvo un token de acceso válido de Google.");
  }

  // 5. Inicializar la sesión en Supabase local
  const { data: sesionData, error: sessionError } = await client.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken || "",
  });

  if (sessionError || !sesionData.session) {
    await client.auth.signOut();
    throw new Error("Fallo al establecer la sesión del usuario.");
  }

  // 6. Enviar al endpoint que armó tu compañero
  const response = await fetch(`${API_URL}/api/auth/google`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ access_token: sesionData.session.access_token }),
  });

  const body = await response.json();

  if (!response.ok) {
    // Si da 401 o 400: limpiar sesión en Supabase y lanzar el error exacto del back
    await client.auth.signOut();
    throw new Error(body.error || "No autorizado para ingresar.");
  }

  // 7. Mapear el usuario devuelto
  const u = body.usuario || {};
  const rolRaw = (u.role || u.perfil || "").trim().toLowerCase();
  const perfilUsuario: PerfilUsuario =
    ROLE_TO_PERFIL[rolRaw] || (rolRaw as PerfilUsuario) || "cliente_registrado";

  return {
    id: u.id || sesionData.session.user.id,
    email: u.email || sesionData.session.user.email || "",
    clave: "",
    perfil: perfilUsuario,
    tituloVisual: TITULOS_VISUALES[perfilUsuario] || "Usuario",
    nombres: u.first_name || u.nombres || u.nombre || "Usuario",
    apellidos: u.last_name || u.apellidos || u.apellido || "",
    documento: u.dni || u.documento || "00000000",
    foto: u.photo_url || u.foto || "",
    icono: "👤",
  };
}