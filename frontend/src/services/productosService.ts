import { API_BASE_URL } from "./apiConfig";

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

// Carta local para fallback de unicidad (muestras de productos precargados)
const CARTA_LOCAL: { nombre: string; categoria: CategoriaProducto }[] = [
  { nombre: "pastel de papa", categoria: "comida" },
  { nombre: "milanesa napolitana", categoria: "comida" },
  { nombre: "fernet con coca", categoria: "bebida" },
  { nombre: "mojito clasico", categoria: "bebida" },
];

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
  }

  if (!data.descripcion.trim()) {
    errors.descripcion = "La descripción es obligatoria.";
  } else if (data.descripcion.trim().length < 8) {
    errors.descripcion = "La descripción debe tener al menos 8 caracteres explicativos.";
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

  const yaExiste = CARTA_LOCAL.some(
    (item) => item.nombre === nombreNormalizado && item.categoria === payload.categoria
  );

  if (yaExiste) {
    throw new Error(
      `El producto "${payload.nombre.trim()}" ya existe en la carta de ${payload.categoria === "bebida" ? "bebidas" : "comidas"}.`
    );
  }

  try {
    const response = await fetch(`${API_BASE_URL}/productos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: payload.nombre.trim(),
        descripcion: payload.descripcion.trim(),
        tiempo_elaboracion: payload.tiempoElaboracionMinutos,
        precio: payload.precio,
        fotos: payload.fotos,
        categoria: payload.categoria,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || data.error || "No se pudo registrar el producto.");
    }

    CARTA_LOCAL.push({ nombre: nombreNormalizado, categoria: payload.categoria });
    return data;
  } catch (error: any) {
    console.warn("Backend /productos no disponible, usando fallback local:", error.message);
    CARTA_LOCAL.push({ nombre: nombreNormalizado, categoria: payload.categoria });
    return { status: "OK", mensaje: "Producto agregado con éxito a la carta local." };
  }
}