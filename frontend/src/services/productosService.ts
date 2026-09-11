import { API_BASE_URL } from "./apiConfig";
import { File } from "expo-file-system";
import { fetch as expoFetch } from "expo/fetch";
import { obtenerTokenValido } from "./tokenService";
import { getSupabaseClient } from "../config/supabase";

export type CategoriaProducto = "comida" | "bebida";

export interface ProductoPayload {
  nombre: string;
  descripcion: string;
  tiempoElaboracionMinutos: number;
  precio: number;
  fotos: string[];
  categoria: CategoriaProducto;
}

export interface ProductoFormErrors {
  nombre?: string;
  descripcion?: string;
  tiempoElaboracion?: string;
  precio?: string;
  fotos?: string;
}

const CATEGORIA_TO_API: Record<CategoriaProducto, "dish" | "drink"> = {
  comida: "dish",
  bebida: "drink",
};

// Tiempo máximo de espera para no colgar la app cuando el backend no responde
const TIEMPO_MAXIMO_ESPERA_MS = 15000;

// Consulta la existencia real del producto en la base (Supabase) para evitar duplicados
async function productoExisteEnDB(
  nombreNormalizado: string,
  categoria: CategoriaProducto
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { data, error } = await supabase
      .from("products")
      .select("id")
      .ilike("name", nombreNormalizado)
      .eq("category", CATEGORIA_TO_API[categoria]);

    if (error) throw error;
    return Array.isArray(data) && data.length > 0;
  } catch (error: any) {
    console.warn("No se pudo consultar la carta desde la base:", error.message);
    return false;
  }
}

export function validateProductoForm(
  data: {
    nombre: string;
    descripcion: string;
    tiempoElaboracion: string;
    precio: string;
    fotos: (string | null)[];
  },
  categoria: CategoriaProducto
): ProductoFormErrors {
  const errors: ProductoFormErrors = {};
  const esBebida = categoria === "bebida";

  if (!data.nombre.trim()) {
    errors.nombre = `El nombre de la ${esBebida ? "bebida" : "comida"} es obligatorio.`;
  } else if (data.nombre.trim().length < 3) {
    errors.nombre = "El nombre debe tener al menos 3 caracteres.";
  } else if (data.nombre.trim().length > 50) {
    errors.nombre = "El nombre no puede superar los 50 caracteres.";
  }

  if (!data.descripcion.trim()) {
    errors.descripcion = "La descripción es obligatoria.";
  } else if (data.descripcion.trim().length < 8) {
    errors.descripcion = "La descripción debe tener al menos 8 caracteres explicativos.";
  } else if (data.descripcion.trim().length > 200) {
    errors.descripcion = "La descripción no puede superar los 200 caracteres.";
  }

  const tiempoNum = Number(data.tiempoElaboracion);
  if (!data.tiempoElaboracion.trim()) {
    errors.tiempoElaboracion = "Ingrese el tiempo de preparación.";
  } else if (isNaN(tiempoNum) || !Number.isInteger(tiempoNum) || tiempoNum <= 0) {
    errors.tiempoElaboracion = "Debe ser un número entero mayor a 0.";
  } else if (tiempoNum > (esBebida ? 15 : 60)) {
    errors.tiempoElaboracion = `El tiempo no puede superar los ${esBebida ? 15 : 60} minutos.`;
  }

  const precioNum = Number(data.precio.replace(",", "."));
  if (!data.precio.trim()) {
    errors.precio = "Ingrese el precio de venta.";
  } else if (isNaN(precioNum) || precioNum <= 0) {
    errors.precio = "El precio debe ser un número válido mayor a $0.";
  }

  const fotosCargadas = data.fotos.filter((f) => f !== null && f !== "");
  if (fotosCargadas.length < 3) {
    errors.fotos = `Debe cargar obligatoriamente las 3 fotos individuales (${fotosCargadas.length}/3).`;
  }

  return errors;
}

export async function registrarProducto(payload: ProductoPayload) {
  const nombreNormalizado = payload.nombre.trim().toLowerCase();

  const yaExiste = await productoExisteEnDB(nombreNormalizado, payload.categoria);

  if (yaExiste) {
    throw new Error(
      `El producto "${payload.nombre.trim()}" ya existe en la carta de ${payload.categoria === "bebida" ? "bebidas" : "comidas"}.`
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIEMPO_MAXIMO_ESPERA_MS);

  try {
    const formData = new FormData();
    formData.append("name", payload.nombre.trim());
    formData.append("description", payload.descripcion.trim());
    formData.append("prep_time", String(payload.tiempoElaboracionMinutos));
    formData.append("price", String(payload.precio));
    formData.append("category", CATEGORIA_TO_API[payload.categoria]);

    payload.fotos
      .filter((uri) => uri && uri.trim() !== "")
      .forEach((uri) => {
        const file = new File(uri);
        formData.append("fotos", file, fileNameFromUri(uri));
      });

    const token = await obtenerTokenValido();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await expoFetch(`${API_BASE_URL}/productos`, {
      method: "POST",
      headers,
      body: formData,
      signal: controller.signal,
    });

    const data = await response.json();
    if (!response.ok) {
      const detalle = typeof data.detalle === "string"
        ? data.detalle
        : JSON.stringify(data.detalle || "");
      throw new Error(detalle || data.message || data.error || "No se pudo registrar el producto.");
    }

    return data;
  } catch (error: any) {
    if (error.name === "AbortError") {
      throw new Error(
        "Se agotó el tiempo de espera del servidor. Verificá que el backend esté corriendo e intentá de nuevo."
      );
    }
    console.warn("Fallo al registrar el producto contra el backend:", error.message);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Deriva un nombre de archivo con extensión correcta desde la URI local
function fileNameFromUri(uri: string): string {
  const original = uri.split("/").pop() || "foto.jpg";
  if (/\.(jpg|jpeg|png|webp)$/i.test(original)) return original;
  return `${original.split(".")[0] || "foto"}.jpg`;
}
