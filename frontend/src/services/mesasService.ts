import { API_BASE_URL } from "../.././apiConfig";
import { File } from "expo-file-system";
import { fetch } from "expo/fetch";
import { headersConToken } from "./tokenService";

export type TipoMesa = "estandar" | "vip" | "movilidad_reducida";
export type EstadoMesa = "vacia" | "ocupada";

export interface Mesa {
  id?: string;
  numero: number;
  comensales: number;
  tipo: TipoMesa;
  disponibilidad: EstadoMesa;
  foto: string;
  qrCode?: string;
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

const ESTADO_MESA_TO_API: Record<EstadoMesa, "free" | "occupied"> = {
  vacia: "free",
  ocupada: "occupied",
};

// Mapeo inverso: valores de la API (schema Zod / Supabase) a los del frontend
const API_TIPO_TO_FRONT: Record<string, TipoMesa> = {
  standard: "estandar",
  vip: "vip",
  reduced_mobility: "movilidad_reducida",
};

const API_ESTADO_TO_FRONT: Record<string, EstadoMesa> = {
  free: "vacia",
  occupied: "ocupada",
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

// Convierte una fila de restaurant_tables (snake_case) al modelo del frontend
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

// Valida solo los campos del paso 1 (número y comensales).
// La fotografía pertenece al paso 2 y se valida en validateMesaForm.
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
    console.warn("Backend /mesas no disponible, listado vacío:", error);
  }
  return [];
}

export async function registrarMesa(payload: {
  numero: number;
  comensales: number;
  tipo: TipoMesa;
  foto: string;
}): Promise<Mesa> {
  // El backend espera un multipart/form-data con estos campos (multer)
  const formData = new FormData();
  formData.append("table_number", String(payload.numero));
  formData.append("capacity", String(payload.comensales));
  formData.append("table_type", TIPO_MESA_TO_API[payload.tipo]);
  formData.append("foto", new File(payload.foto), fileNameFromUri(payload.foto));

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/mesas`, {
      method: "POST",
      // No seteamos Content-Type: expo/fetch fija el boundary del multipart automáticamente
      headers: await headersConToken(),
      body: formData,
    });
  } catch (error: any) {
    // Backend no disponible: no registramos en local, propagamos el error
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

  // Mapeamos la fila devuelta por el backend (guarda el id real de Supabase
  // para poder cambiar su estado después).
  return mapMesaDesdeApi(data.data || data);
}

export async function actualizarDisponibilidadMesa(
  mesa: Mesa,
  nuevaDisponibilidad: EstadoMesa
) {
  // Sin un id real (uuid) no podemos llamar al PATCH del backend
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

// Deriva un nombre de archivo con extensión correcta desde la URI local
function fileNameFromUri(uri: string): string {
  const original = uri.split("/").pop() || "foto.jpg";
  if (/\.(jpg|jpeg|png|webp)$/i.test(original)) return original;
  return `${original.split(".")[0] || "foto"}.jpg`;
}