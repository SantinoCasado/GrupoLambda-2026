import { API_BASE_URL } from "./apiConfig";
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

// Lista en memoria para pruebas inmediatas y gestión de disponibilidad
let MESAS_LOCAL: Mesa[] = [
  {
    numero: 1,
    comensales: 4,
    tipo: "estandar",
    disponibilidad: "vacia",
    foto: "https://via.placeholder.com/300",
    qrCode: JSON.stringify({ mesa: 1, tipo: "estandar" }),
  },
  {
    numero: 2,
    comensales: 2,
    tipo: "vip",
    disponibilidad: "ocupada",
    foto: "https://via.placeholder.com/300",
    qrCode: JSON.stringify({ mesa: 2, tipo: "vip" }),
  },
];

export function validateMesaForm(data: {
  numero: string;
  comensales: string;
  tipo: TipoMesa;
  foto: string | null;
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
    qrCode: JSON.stringify({ mesa: payload.numero, tipo: payload.tipo }),
  };

  try {
    const response = await fetch(`${API_BASE_URL}/mesas`, {
      method: "POST",
      headers: await headersConToken({ "Content-Type": "application/json" }),
      body: JSON.stringify(nuevaMesa),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || data.error || "No se pudo registrar la mesa.");
    }
    MESAS_LOCAL.push(nuevaMesa);
    return data;
  } catch (error: any) {
    console.warn("Fallback local para mesas:", error.message);
    MESAS_LOCAL.push(nuevaMesa);
    return nuevaMesa;
  }
}

export async function actualizarDisponibilidadMesa(
  numero: number,
  nuevaDisponibilidad: EstadoMesa
) {
  const mesa = MESAS_LOCAL.find((m) => m.numero === numero);
  if (mesa) {
    mesa.disponibilidad = nuevaDisponibilidad;
  }

  try {
    await fetch(`${API_BASE_URL}/mesas/${numero}/disponibilidad`, {
      method: "PATCH",
      headers: await headersConToken({ "Content-Type": "application/json" }),
      body: JSON.stringify({ disponibilidad: nuevaDisponibilidad }),
    });
  } catch (error) {
    console.warn("No se pudo persistir en backend el cambio de estado:", error);
  }
}