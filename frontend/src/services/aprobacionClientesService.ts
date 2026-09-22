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
): Promise<{ exito: boolean; mensaje: string }> {
  // Conversión a valor en inglés de la BD
  const nextStatus = decision === "aprobado" ? "approved" : "rejected";

  try {
    const token = await obtenerTokenAuth();

    const response = await fetch(`${API_URL}/api/clientes/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        status: nextStatus,
      }),
    });

    const json = await response.json();

    if (!response.ok) {
      throw new Error(json.error || json.detalle || "Error al actualizar estado");
    }

    return {
      exito: true,
      mensaje: json.mensaje || (decision === "aprobado" ? "Cliente aprobado con éxito." : "Cliente rechazado."),
    };
  } catch (err: any) {
    console.warn("⚠️ [Aprobación] Falló PATCH en backend, aplicando directo en Supabase:", err.message);

    const { error } = await supabase
      .from("users")
      .update({ status: nextStatus })
      .eq("id", id)
      .eq("role", "registered_client");

    if (error) {
      return { exito: false, mensaje: error.message };
    }

    return {
      exito: true,
      mensaje: decision === "aprobado" ? "Cliente aprobado (directo en BD)." : "Cliente rechazado.",
    };
  }
}