import { getSupabaseClient } from "../config/supabase";

// Margen de seguridad antes del vencimiento para refrescar anticipadamente
const MARGEN_SEGURIDAD_MS = 30_000;

// Devuelve un access_token vigente de Supabase, refrescándolo si está por vencer.
// Devuelve null cuando no hay sesión activa (login local de demo).
export async function obtenerTokenValido(): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data } = await supabase.auth.getSession();
  const sesion = data.session;
  if (!sesion) return null;

  const expiraEnMs = (sesion.expires_at ?? 0) * 1000;
  if (expiraEnMs - Date.now() > MARGEN_SEGURIDAD_MS) {
    return sesion.access_token;
  }

  try {
    const { data: refrescada, error } = await supabase.auth.refreshSession();
    if (error) throw error;
    return refrescada.session?.access_token ?? sesion.access_token;
  } catch (error: any) {
    console.warn("No se pudo refrescar el token de sesión:", error.message);
    return sesion.access_token;
  }
}

// Cabeceras HTTP prefabricadas con el token vigente para los fetch contra el backend
export async function headersConToken(
  extra?: Record<string, string>
): Promise<Record<string, string>> {
  const token = await obtenerTokenValido();
  const headers: Record<string, string> = { ...extra };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}