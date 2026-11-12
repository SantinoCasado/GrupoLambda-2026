import { UsuarioSeed, PerfilUsuario } from "../data/usuariosPrecargados";
import { getSupabaseClient, isSupabaseConfigured, supabase } from "../config/supabase";
import { API_URL } from "../config/api";
import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { isRunningInExpoGo } from "expo";

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

// expo-auth-session 58 bloquea el deep import `build/QueryParams` (mapa `exports`),
// así que parseamos la URL de redirección nosotros mismos.
// - PKCE: el code/error llega en el query string (?code=... / ?error=...)
// - Implicit (legacy): los tokens llegan en el hash (#access_token=...)
function parseAuthParams(url: string): Record<string, string> {
  const hashIndex = url.indexOf("#");
  const queryIndex = url.indexOf("?");
  const queryEnd = hashIndex >= 0 ? hashIndex : url.length;

  const query =
    queryIndex >= 0 && queryIndex < queryEnd ? url.slice(queryIndex + 1, queryEnd) : "";
  const hash = hashIndex >= 0 ? url.slice(hashIndex + 1) : "";

  return {
    ...(Object.fromEntries(new URLSearchParams(query)) as Record<string, string>),
    ...(Object.fromEntries(new URLSearchParams(hash)) as Record<string, string>),
  };
}

export async function loginConGoogle(): Promise<UsuarioSeed | null> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase no configurado.");
  }

  const client = getSupabaseClient() || supabase;

  // 1. Redirect URI: nativo → jardinimperial://google-auth | web → http://localhost:8081/google-auth
  //    En Expo Go el scheme propio no está registrado: hay que volver con `exp://`
  //    (requiere habilitar `exp://**` en Supabase → Authentication → URL Configuration).
  const redirectTo = isRunningInExpoGo()
    ? makeRedirectUri({ path: "google-auth" })
    : makeRedirectUri({ scheme: "jardinimperial", path: "google-auth" });

  // 2. Pedir la URL de OAuth a Supabase (con PKCE, Supabase agrega el code_challenge)
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

  // Cancelar/cerrar el navegador no es un error: devolvemos null y la pantalla lo ignora
  if (res.type !== "success" || !res.url) {
    return null;
  }

  // 4. Leer la respuesta (URLSearchParams ya decodifica %XX y '+')
  const params = parseAuthParams(res.url);

  if (params.error || params.error_description) {
    throw new Error(params.error_description || params.error);
  }

  if (!params.code) {
    throw new Error(
      "Google no devolvió un código de autorización. Verificá que la Redirect URL esté habilitada en Supabase (Authentication → URL Configuration)."
    );
  }

  // 5. Canjear el código PKCE por una sesión local
  const { data: sesionData, error: sessionError } = await client.auth.exchangeCodeForSession(
    params.code
  );

  if (sessionError || !sesionData.session) {
    await client.auth.signOut();
    throw new Error(sessionError?.message || "Fallo al establecer la sesión del usuario.");
  }

  // 6. Enviar al endpoint
  const response = await fetch(`${API_URL}/api/auth/google`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ access_token: sesionData.session.access_token }),
  });

  const textoRespuesta = await response.text();

  // Si el backend devolvió HTML (404 Not Found o 500 Server Error)
  if (textoRespuesta.trim().startsWith("<")) {
    console.error("📄 Respuesta HTML del backend:\n", textoRespuesta);
    await client.auth.signOut();
    throw new Error(`Error en el servidor (HTTP ${response.status}). Verificá que la ruta exista en el backend o que la base de datos no haya fallado.`);
  }

  const body = JSON.parse(textoRespuesta);

  if (!response.ok) {
    // Si da 401 o 400: limpiar sesión en Supabase y lanzar el error exacto del back
    await client.auth.signOut();
    throw new Error(body.error || body.message || "No autorizado para ingresar.");
  }

  // 7. Mapear el usuario devuelto
  const u = body.usuario || body.user || {};
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