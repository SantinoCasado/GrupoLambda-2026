import { supabase, getSupabaseClient } from "../config/supabase";
import { API_URL } from "../config/api";

export interface ClientePendiente {
  id: string;
  nombres: string;
  apellidos: string;
  dni: string;
  email: string;
  fotoUri: string;
  fechaRegistro: string;
  estado: string;
}

async function obtenerTokenAuth(): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data.session?.access_token || null;
}

export async function obtenerClientesPendientes(): Promise<ClientePendiente[]> {
  try {
    const token = await obtenerTokenAuth();

    // Query param en inglés estricto: ?estado=pending o ?status=pending
    const response = await fetch(`${API_URL}/api/clientes?estado=pending`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (response.ok) {
      const json = await response.json();
      const lista = json.data || [];

      return lista.map((u: any) => ({
        id: u.id,
        nombres: u.first_name || "Sin nombre",
        apellidos: u.last_name || "",
        dni: u.dni || "S/D",
        email: u.email || "",
        fotoUri: u.photo_url || "https://via.placeholder.com/150",
        fechaRegistro: u.created_at
          ? new Date(u.created_at).toLocaleDateString("es-AR")
          : "Reciente",
        estado: u.status,
      }));
    }
  } catch (err: any) {
    console.warn("⚠️ [Aprobación] Falló GET al backend, aplicando fallback a Supabase:", err.message);
  }

  // Fallback directo en Supabase con role y status en inglés
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("role", "registered_client")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("⚠️ Error en consulta directa a Supabase:", error.message);
    return [];
  }

  return (data || []).map((u: any) => ({
    id: u.id,
    nombres: u.first_name || "Sin nombre",
    apellidos: u.last_name || "",
    dni: u.dni || "S/D",
    email: u.email || "",
    fotoUri: u.photo_url || "https://via.placeholder.com/150",
    fechaRegistro: u.created_at
      ? new Date(u.created_at).toLocaleDateString("es-AR")
      : "Reciente",
    estado: u.status,
  }));
}

export async function responderSolicitudCliente(
  id: string,
  decision: "aprobado" | "rechazado"
): Promise<{ exito: boolean; mensaje: string; correoEnviado: boolean }> {
  // Conversión a valor en inglés de la BD
  const nextStatus = decision === "aprobado" ? "approved" : "rejected";

  const token = await obtenerTokenAuth();

  let response: Response;

  try {
    response = await fetch(`${API_URL}/api/clientes/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        status: nextStatus,
      }),
    });
  } catch (err: any) {
    // El backend es el único que dispara el correo y la push notification.
    // Si no lo alcanzamos, la solicitud NO se procesa: se propaga el error para
    // que la pantalla avise y el cliente siga pendiente.
    console.warn("⚠️ [Aprobación] Backend inalcanzable al actualizar el estado:", err?.message);
    throw new Error("No se pudo conectar con el servidor. Verificá tu conexión e intentá de nuevo.");
  }

  // Una instancia de Render reiniciándose o caída devuelve HTML, no JSON.
  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const detalle = typeof json?.detalle === "string" ? json.detalle : null;
    const error = json?.error || detalle || `No se pudo actualizar el estado del cliente (HTTP ${response.status}).`;
    console.warn(`⚠️ [Aprobación] El backend rechazó la solicitud (HTTP ${response.status}):`, error);
    throw new Error(error);
  }

  return {
    exito: true,
    mensaje: decision === "aprobado" ? "Cliente aprobado." : "Cliente rechazado.",
    // El backend confirma el envío con este flag. Si no lo manda, no se afirma
    // que el correo se envió, porque el fallo de SMTP no llega hasta acá.
    correoEnviado: json?.correoEnviado === true,
  };
}