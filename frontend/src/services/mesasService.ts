import { API_BASE_URL } from "../.././apiConfig";
import { File } from "expo-file-system";
import { fetch } from "expo/fetch";
import { headersConToken } from "./tokenService";
import { supabase } from "../config/supabase";

export type TipoMesa = "estandar" | "vip" | "movilidad_reducida";
export type EstadoMesa = "vacia" | "ocupada" | "reservada";

export interface Mesa {
  id?: string;
  numero: number;
  comensales: number;
  tipo: TipoMesa;
  disponibilidad: EstadoMesa;
  foto: string;
  qrCode?: string;
}

export interface ClienteEnEspera {
  id: string; // ID en waiting_list
  user_id?: string;
  client_name: string;
  client_photo: string;
  status: "waiting" | "assigned" | "cancelled";
  assigned_table_id?: string | null;
  joined_at?: string;
}

export interface MesaFormErrors {
  numero?: string;
  comensales?: string;
  tipo?: string;
  foto?: string;
}

// Mapeo de los valores del frontend a los de la API (schema Zod del backend)
const TIPO_MESA_TO_API: Record<TipoMesa, "standard" | "vip" | "reduced_mobility"> = {
  estandar: "standard",
  vip: "vip",
  movilidad_reducida: "reduced_mobility",
};

const ESTADO_MESA_TO_API: Record<EstadoMesa, "free" | "occupied" | "cleaning"> = {
  vacia: "free",
  ocupada: "occupied",
  reservada: "cleaning",
};

// Mapeo inverso: valores de la API a los del frontend
const API_TIPO_TO_FRONT: Record<string, TipoMesa> = {
  standard: "estandar",
  vip: "vip",
  reduced_mobility: "movilidad_reducida",
  disability: "movilidad_reducida",
};

const API_ESTADO_TO_FRONT: Record<string, EstadoMesa> = {
  free: "vacia",
  available: "vacia",
  occupied: "ocupada",
  cleaning: "reservada",
  reserved: "reservada",
};

interface MesaDesdeApi {
  id?: string;
  table_number: number;
  capacity: number;
  table_type: string;
  photo_url: string;
  qr_data?: string;
  availability: string;
}

function mapMesaDesdeApi(row: MesaDesdeApi): Mesa {
  return {
    id: row.id,
    numero: row.table_number,
    comensales: row.capacity,
    tipo: API_TIPO_TO_FRONT[row.table_type] ?? "estandar",
    disponibilidad: API_ESTADO_TO_FRONT[row.availability] ?? "vacia",
    foto: row.photo_url,
    qrCode: row.qr_data,
  };
}

export function validateMesaPaso1(data: {
  numero: string;
  comensales: string;
}): MesaFormErrors {
  const errors: MesaFormErrors = {};
  const num = Number(data.numero);
  if (!data.numero.trim()) {
    errors.numero = "El número de mesa es obligatorio.";
  } else if (isNaN(num) || !Number.isInteger(num) || num <= 0) {
    errors.numero = "Debe ser un número entero mayor a 0.";
  }

  const com = Number(data.comensales);
  if (!data.comensales.trim()) {
    errors.comensales = "La cantidad de comensales es obligatoria.";
  } else if (isNaN(com) || !Number.isInteger(com) || com <= 0) {
    errors.comensales = "Debe ser un número entero mayor a 0.";
  } else if (com > 8) {
    errors.comensales = "Máximo 8 comensales por mesa.";
  }
  return errors;
}

export function validateMesaForm(data: {
  numero: string;
  comensales: string;
  tipo: TipoMesa;
  foto: string | null;
}): MesaFormErrors {
  const errors = validateMesaPaso1({
    numero: data.numero,
    comensales: data.comensales,
  });
  if (!data.foto) {
    errors.foto = "La fotografía de la mesa es obligatoria.";
  }
  return errors;
}

export async function obtenerMesas(): Promise<Mesa[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/mesas`, {
      headers: await headersConToken(),
    });
    if (response.ok) {
      const data = await response.json();
      const filas = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
      return filas.map(mapMesaDesdeApi);
    }
  } catch (error) {
    console.warn("Backend /mesas no disponible, probando fallback Supabase:", error);
  }

  // Fallback directo a Supabase
  const { data } = await supabase
    .from("restaurant_tables")
    .select("*")
    .order("table_number", { ascending: true });

  return (data || []).map(mapMesaDesdeApi);
}

export async function registrarMesa(payload: {
  numero: number;
  comensales: number;
  tipo: TipoMesa;
  foto: string;
}): Promise<Mesa> {
  const formData = new FormData();
  formData.append("table_number", String(payload.numero));
  formData.append("capacity", String(payload.comensales));
  formData.append("table_type", TIPO_MESA_TO_API[payload.tipo]);
  formData.append("foto", new File(payload.foto), fileNameFromUri(payload.foto));

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/mesas`, {
      method: "POST",
      headers: await headersConToken(),
      body: formData,
    });
  } catch (error: any) {
    console.warn("Backend /mesas no disponible:", error.message);
    throw new Error("No se pudo conectar con el servidor. Intente nuevamente.");
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(
      typeof data.detalle === "string"
        ? data.detalle
        : data.message || data.error || "No se pudo registrar la mesa."
    );
  }
  return mapMesaDesdeApi(data.data || data);
}

export async function actualizarDisponibilidadMesa(
  mesa: Mesa,
  nuevaDisponibilidad: EstadoMesa
) {
  if (!mesa.id) {
    throw new Error("La mesa no tiene un id válido; no se puede cambiar su estado.");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/mesas/${mesa.id}/estado`, {
      method: "PATCH",
      headers: await headersConToken({ "Content-Type": "application/json" }),
      body: JSON.stringify({ availability: ESTADO_MESA_TO_API[nuevaDisponibilidad] }),
    });
  } catch (error: any) {
    throw new Error(`No se pudo conectar con el servidor: ${error.message}`);
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(
      typeof data.detalle === "string"
        ? data.detalle
        : data.message || data.error || "No se pudo cambiar el estado de la mesa."
    );
  }
}

// ==========================================
// OPERACIONES PARA EL METRE (09 y 10)
// ==========================================

// 1. Obtener la lista de espera actual
export async function obtenerListaEspera(): Promise<ClienteEnEspera[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/empleados/waiting-list`, {
      headers: await headersConToken(),
    });
    if (response.ok) {
      const data = await response.json();
      return Array.isArray(data.data) ? data.data : [];
    }
  } catch (error: any) {
    console.warn("Fallback a Supabase para lista de espera:", error.message);
  }

  const { data, error } = await supabase
    .from("waiting_list")
    .select("*")
    .eq("status", "waiting")
    .order("joined_at", { ascending: true });

  if (error) {
    console.error("Error al obtener waiting_list de Supabase:", error.message);
    return [];
  }
  return (data || []) as ClienteEnEspera[];
}

// 2. Asignar una mesa a un cliente (dispara push notification en backend)
export async function asignarMesa(
  waitingId: string,
  tableId: string
): Promise<{ exito: boolean; mensaje: string }> {
  try {
    const url = API_BASE_URL.endsWith("/api")
      ? `${API_BASE_URL}/mesas/asignar-mesa`
      : `${API_BASE_URL}/api/mesas/asignar-mesa`;

    const response = await fetch(url, {
      method: "PATCH", // 👈 Debe ser PATCH según mesas.routes.ts
      headers: await headersConToken({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        waiting_id: waitingId,
        table_id: tableId,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        exito: true,
        mensaje: data.message || "Mesa asignada con éxito.",
      };
    }
  } catch (error: any) {
    console.warn("Fallo asignación en backend, aplicando fallback a Supabase:", error.message);
  }

  // Fallback directo en Supabase si falla el backend o token
  const { error: waitErr } = await supabase
    .from("waiting_list")
    .update({ assigned_table_id: tableId, status: "assigned" })
    .eq("id", waitingId);

  if (waitErr) return { exito: false, mensaje: waitErr.message };

  const { error: tableErr } = await supabase
    .from("restaurant_tables")
    .update({ availability: "occupied" })
    .eq("id", tableId);

  if (tableErr) return { exito: false, mensaje: tableErr.message };

  return { exito: true, mensaje: "Mesa asignada correctamente (BD directa)." };
}

// 3. Eliminar cliente de la lista de espera
export async function eliminarDeListaEspera(waitingId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("waiting_list")
      .delete()
      .eq("id", waitingId);

    if (error) throw error;
    return true;
  } catch (error: any) {
    console.error("Error al eliminar de waiting_list:", error.message);
    return false;
  }
}

function fileNameFromUri(uri: string): string {
  const original = uri.split("/").pop() || "foto.jpg";
  if (/\.(jpg|jpeg|png|webp)$/i.test(original)) return original;
  return `${original.split(".")[0] || "foto"}.jpg`;
}