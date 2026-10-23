import type { EncuestaData } from "../services/encuestasService";

export interface PuntoDia {
  fecha: string; // YYYY-MM-DD (día local)
  etiqueta: string; // DD/MM
  promedio: number; // sin redondear
  cantidad: number;
}

export interface ResumenEncuestas {
  total: number;
  promedios: { sabor: number; atencion: number; comodidad: number };
  distribucionSatisfaccion: number[]; // [1★, 2★, 3★, 4★, 5★]
  dias: PuntoDia[]; // últimas 6 jornadas con datos, orden cronológico
}

/** Devuelve el valor si es un rating utilizable (> 0), si no null */
const valorValido = (valor: unknown): number | null => {
  const n = Number(valor);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Promedio de los ratings válidos de una encuesta (null si no tiene ninguno) */
export const promedioDeEncuesta = (encuesta: EncuestaData): number | null => {
  const valores = [encuesta.rating_food, encuesta.rating_service, encuesta.rating_cleanliness]
    .map(valorValido)
    .filter((v): v is number => v !== null);
  if (valores.length === 0) return null;
  return valores.reduce((acc, v) => acc + v, 0) / valores.length;
};

/** Promedio de una dimensión, dividiendo solo por las encuestas que la valoraron */
const promedioDimension = (
  encuestas: EncuestaData[],
  selector: (encuesta: EncuestaData) => number
): number => {
  let suma = 0;
  let cantidad = 0;
  encuestas.forEach((encuesta) => {
    const valor = valorValido(selector(encuesta));
    if (valor === null) return;
    suma += valor;
    cantidad += 1;
  });
  return cantidad > 0 ? suma / cantidad : 0;
};

// Clave por día local (no usar toISOString: desplaza la fecha por UTC)
const claveDia = (fecha: Date) =>
  `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;

const etiquetaDia = (fecha: Date) =>
  `${String(fecha.getDate()).padStart(2, "0")}/${String(fecha.getMonth() + 1).padStart(2, "0")}`;

/**
 * Agrega las encuestas en los datos que consumen los tres gráficos.
 * Única fuente de verdad para la pantalla de encuesta y la de estadísticas.
 */
export function calcularResumenEncuestas(encuestas: EncuestaData[]): ResumenEncuestas {
  const distribucionSatisfaccion = [0, 0, 0, 0, 0];
  const porDia = new Map<string, { etiqueta: string; suma: number; cantidad: number }>();

  encuestas.forEach((encuesta) => {
    const promedio = promedioDeEncuesta(encuesta);

    // Torta: promedio de las tres valoraciones, redondeado a estrella entera
    if (promedio !== null) {
      const starIdx = Math.min(5, Math.max(1, Math.round(promedio))) - 1;
      distribucionSatisfaccion[starIdx] += 1;
    }

    // Lineal: un punto por día con el promedio de las encuestas de ese día
    if (promedio === null || !encuesta.created_at) return;
    const fecha = new Date(encuesta.created_at);
    if (Number.isNaN(fecha.getTime())) return;

    const clave = claveDia(fecha);
    const acumulado = porDia.get(clave) ?? { etiqueta: etiquetaDia(fecha), suma: 0, cantidad: 0 };
    acumulado.suma += promedio;
    acumulado.cantidad += 1;
    porDia.set(clave, acumulado);
  });

  const dias: PuntoDia[] = [...porDia.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([fecha, dia]) => ({
      fecha,
      etiqueta: dia.etiqueta,
      promedio: dia.suma / dia.cantidad,
      cantidad: dia.cantidad,
    }));

  return {
    total: encuestas.length,
    promedios: {
      sabor: promedioDimension(encuestas, (e) => e.rating_food),
      atencion: promedioDimension(encuestas, (e) => e.rating_service),
      comodidad: promedioDimension(encuestas, (e) => e.rating_cleanliness),
    },
    distribucionSatisfaccion,
    dias,
  };
}
