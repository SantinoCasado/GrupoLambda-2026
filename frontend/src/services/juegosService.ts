import { API_BASE_URL } from "../../apiConfig";

/** Nombres de juego usados como clave en la tabla `game_discounts`. */
export const NOMBRE_JUEGO = {
  memotest: "memotest",
  puzzle: "puzzle",
  bolita: "shellgame",
} as const;

/** Porcentaje que otorga cada juego al ganar en el primer intento. */
export const DESCUENTO_JUEGO = {
  memotest: 10,
  puzzle: 15,
  bolita: 20,
} as const;

export interface JugadaPedido {
  id?: string;
  order_id: string;
  client_id?: string;
  game_name: string;
  discount_percentage: number;
  won_on_first_try: boolean;
  played_at?: string;
}

export interface ResultadoJugada {
  jugada: JugadaPedido;
  descuento_aplicado: number;
  mensaje: string;
}

/** Devuelve el `game_name` del juego que ya ganó el descuento del pedido, o null. */
export function juegoGanador(jugadas: JugadaPedido[]): string | null {
  const ganadora = jugadas.find((j) => Number(j.discount_percentage) > 0);
  return ganadora ? ganadora.game_name : null;
}

/** Historial de jugadas/descuentos de un pedido (GET /api/juegos/pedido/:order_id). */
export async function obtenerJugadasPedido(orderId: string): Promise<JugadaPedido[]> {
  if (!orderId) return [];

  try {
    const respuesta = await fetch(`${API_BASE_URL}/juegos/pedido/${orderId}`);
    if (!respuesta.ok) {
      console.warn(`⚠️ [Juegos] No se pudo leer el pedido (HTTP ${respuesta.status}).`);
      return [];
    }

    const json = await respuesta.json();
    return Array.isArray(json?.data) ? (json.data as JugadaPedido[]) : [];
  } catch (error) {
    console.warn("⚠️ [Juegos] Error al consultar las jugadas del pedido:", error);
    return [];
  }
}

/**
 * Registra una victoria al primer intento. El backend es la única fuente de
 * verdad: rechaza el descuento si el pedido ya ganó en otro juego.
 */
export async function registrarJugadaPedido(payload: {
  order_id: string;
  client_id: string;
  game_name: string;
  discount_percentage: number;
  won_on_first_try: boolean;
}): Promise<ResultadoJugada | null> {
  try {
    const respuesta = await fetch(`${API_BASE_URL}/juegos/jugada`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!respuesta.ok) {
      const detalle = await respuesta.text();
      console.warn(`⚠️ [Juegos] El backend rechazó la jugada (HTTP ${respuesta.status}): ${detalle}`);
      return null;
    }

    const json = await respuesta.json();
    return (json?.data as ResultadoJugada) ?? null;
  } catch (error) {
    console.warn("⚠️ [Juegos] Error al registrar la jugada:", error);
    return null;
  }
}
