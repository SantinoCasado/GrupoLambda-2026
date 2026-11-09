import { API_BASE_URL } from "../../apiConfig";
import { headersConToken } from "./tokenService";

export interface ClienteReserva {
  first_name: string;
  last_name: string;
  photo_url?: string;
  email?: string;
}

export interface MesaReserva {
  id?: string;
  table_number: number | string;
  capacity?: number;
  table_type?: string;
}

export interface Reserva {
  id: string;
  client_id: string;
  table_id?: string;
  reservation_date: string;
  guests_count: number;
  status: "pending" | "approved" | "rejected" | "cancelled" | "completed";
  rejection_reason?: string;
  created_at: string;
  client?: ClienteReserva;
  table?: MesaReserva;
}

// Punto 24: Crear reserva
export async function crearReservaApi(
  fechaISO: string,
  cantidadComensales: number
): Promise<{ ok: boolean; data?: Reserva; error?: string }> {
  try {
    const headers = await headersConToken({ "Content-Type": "application/json" });
    const url = `${API_BASE_URL}/reservas`;

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        reservation_date: fechaISO,
        guests_count: cantidadComensales,
      }),
    });

    const textoRespuesta = await res.text();

    // Si el servidor devolvió HTML (error 404, 500, etc.)
    if (textoRespuesta.trim().startsWith("<")) {
      console.error(`❌ [Backend Error ${res.status}] URL: ${url}\nRespuesta HTML:\n`, textoRespuesta);
      return {
        ok: false,
        error: `Error del servidor (HTTP ${res.status}). Revisá que el endpoint exista en el backend.`,
      };
    }

    const json = JSON.parse(textoRespuesta);

    if (!res.ok) {
      return { ok: false, error: json.error || "Error al procesar la reserva" };
    }

    return { ok: true, data: json.reserva };
  } catch (err: any) {
    console.error("❌ Error en crearReservaApi:", err);
    return { ok: false, error: err?.message || "Error de conexión con el servidor" };
  }
}

// Punto 24: Mis reservas
export async function obtenerMisReservasApi(): Promise<Reserva[]> {
  try {
    const headers = await headersConToken();
    const res = await fetch(`${API_BASE_URL}/reservas/mias`, { headers });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

// Punto 25: Listar reservas (con filtro opcional ?estado=pending)
export async function obtenerReservasApi(estado?: string): Promise<Reserva[]> {
  try {
    const headers = await headersConToken();
    const url = estado
      ? `${API_BASE_URL}/reservas?estado=${estado}`
      : `${API_BASE_URL}/reservas`;

    console.log(`📡 [GET Reservas] Solicitando: ${url}`);
    const res = await fetch(url, { headers });
    const texto = await res.text();

    if (!res.ok) {
      console.error(`❌ [GET Reservas Error ${res.status}]:`, texto);
      return [];
    }

    const data = JSON.parse(texto);
    console.log(`✅ [GET Reservas OK] Trajo ${data.length} reservas`);
    return data;
  } catch (err: any) {
    console.error("❌ [GET Reservas Catch Error]:", err?.message);
    return [];
  }
}

// Punto 25: Aprobar reserva enviando la mesa asignada seleccionada
export async function aprobarReservaApi(reservaId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const headers = await headersConToken();
    const res = await fetch(`${API_BASE_URL}/reservas/${reservaId}/aprobar`, {
      method: "PATCH",
      headers,
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error || "No se pudo aprobar la reserva" };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Error de red" };
  }
}

// Obtener mesas para asignación en el modal
export async function obtenerMesasParaReservaApi(): Promise<Array<{
  id: string;
  table_number: number;
  capacity: number;
  table_type?: string;
  availability?: string;
}>> {
  try {
    const headers = await headersConToken();
    const res = await fetch(`${API_BASE_URL}/mesas`, { headers });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

// Punto 25: Rechazar reserva con motivo
export async function rechazarReservaApi(
  reservaId: string,
  motivo: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const headers = await headersConToken({ "Content-Type": "application/json" });
    const res = await fetch(`${API_BASE_URL}/reservas/${reservaId}/rechazar`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ motivo }),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error || "No se pudo rechazar la reserva" };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Error de red" };
  }
}

// Punto 26: Check-in escaneando QR de la mesa
export async function checkInReservaApi(tableId: string): Promise<{
  ok: boolean;
  mensaje?: string;
  mesa?: { id: string; table_number: number };
  error?: string;
}> {
  try {
    const headers = await headersConToken({ "Content-Type": "application/json" });
    const res = await fetch(`${API_BASE_URL}/reservas/check-in`, {
      method: "POST",
      headers,
      body: JSON.stringify({ table_id: tableId }),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error || "No se pudo realizar el check-in" };
    return { ok: true, mensaje: json.mensaje, mesa: json.mesa };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Error de conexión" };
  }
}