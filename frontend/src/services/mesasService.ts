import { API_BASE_URL } from "./apiConfig";
import { File } from "expo-file-system";
import { fetch } from "expo/fetch";
import { headersConToken } from "./tokenService";

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

// Lista en memoria para pruebas inmediatas y gestión de disponibilidad
let MESAS_LOCAL: Mesa[] = [
  {
    numero: 1,
    comensales: 4,
    tipo: "estandar",
    disponibilidad: "vacia",
    foto: "https://via.placeholder.com/300",
    qrCode: "RESTO-TFI-MESA-1",
  },
  {
    numero: 2,
    comensales: 2,
    tipo: "vip",
    disponibilidad: "ocupada",
    foto: "https://via.placeholder.com/300",
    qrCode: "RESTO-TFI-MESA-2",
  },
  {
    numero: 3,
    comensales: 2,
    tipo: "vip",
    disponibilidad: "ocupada",
    foto: "https://via.placeholder.com/300",
    qrCode: "RESTO-TFI-MESA-3",
  },
  {
    numero: 4,
    comensales: 2,
    tipo: "vip",
    disponibilidad: "ocupada",
    foto: "https://via.placeholder.com/300",
    qrCode: "RESTO-TFI-MESA-4",
  },
  {
    numero: 5,
    comensales: 2,
    tipo: "vip",
    disponibilidad: "ocupada",
    foto: "https://via.placeholder.com/300",
    qrCode: "RESTO-TFI-MESA-5",
  },
];

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
      return data.data || data;
    }
  } catch (error) {
    console.warn("Backend /mesas no disponible, usando local:", error);
  }
  return MESAS_LOCAL;
}

export async function registrarMesa(payload: {
  numero: number;
  comensales: number;
  tipo: TipoMesa;
  foto: string;
}): Promise<Mesa> {
  const existe = MESAS_LOCAL.some((m) => m.numero === payload.numero);
  if (existe) {
    throw new Error(`La mesa número ${payload.numero} ya existe en el restaurante.`);
  }

  const nuevaMesa: Mesa = {
    ...payload,
    disponibilidad: "vacia",
    qrCode: `RESTO-TFI-MESA-${payload.numero}`,
  };

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
    // Backend no disponible: mantenemos el fallback local para que la demo siga funcionando
    console.warn("Backend /mesas no disponible, registrando de forma local:", error.message);
    MESAS_LOCAL.push(nuevaMesa);
    return nuevaMesa;
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(
      typeof data.detalle === "string"
        ? data.detalle
        : data.message || data.error || "No se pudo registrar la mesa."
    );
  }

  // Guardamos el id real (uuid) que devuelve Supabase para poder cambiar su estado después
  nuevaMesa.id = data.data?.id || data.id;
  MESAS_LOCAL.push(nuevaMesa);
  return data;
}

export async function actualizarDisponibilidadMesa(
  numero: number,
  nuevaDisponibilidad: EstadoMesa
) {
  const mesa = MESAS_LOCAL.find((m) => m.numero === numero);
  if (mesa) {
    mesa.disponibilidad = nuevaDisponibilidad;
  } else {
    console.warn(`La mesa #${numero} no existe en el listado local.`);
    return;
  }

  // Sin un id real (uuid) no podemos llamar al backend. Ocurre con los datos mock,
  // que se cargan cuando aún no existe el endpoint GET /mesas.
  if (!mesa.id) {
    console.warn("La mesa no tiene id real; el estado se actualizó solo localmente.");
    return;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/mesas/${mesa.id}/estado`, {
      method: "PATCH",
      headers: await headersConToken({ "Content-Type": "application/json" }),
      body: JSON.stringify({ availability: ESTADO_MESA_TO_API[nuevaDisponibilidad] }),
    });
  } catch (error: any) {
    // Backend no disponible: el estado ya quedó actualizado localmente
    console.warn("No se pudo persistir en backend el cambio de estado:", error.message);
    return;
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