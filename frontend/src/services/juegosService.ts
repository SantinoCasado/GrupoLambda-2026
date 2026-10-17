import { supabase } from "../config/supabase";

export interface GameDiscountRecord {
  id?: string;
  order_id: string;
  client_id?: string;
  game_name: string;
  discount_percentage: number;
  won_on_first_try: boolean;
  played_at?: string;
}

/**
 * Consulta si la comanda ya utilizó su intento de juego.
 */
export async function obtenerDescuentoJuego(orderId: string): Promise<GameDiscountRecord | null> {
  const { data, error } = await supabase
    .from("game_discounts")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle();

  if (error) {
    console.warn("Error al consultar descuento de juego:", error.message);
    return null;
  }
  return data;
}

/**
 * Registra el resultado del juego solo si es el primer intento.
 * Si ya se jugó para este pedido, ignora la solicitud.
 */
export async function registrarResultadoJuego(
  orderId: string,
  clientId: string | undefined,
  gameName: string,
  gano: boolean,
  porcentajeGanado: number = 10
): Promise<{ aplicado: boolean; mensaje: string }> {
  // 1. Verificar si ya jugó
  const previo = await obtenerDescuentoJuego(orderId);
  if (previo) {
    return {
      aplicado: false,
      mensaje: "Ya se utilizó el intento disponible para este pedido.",
    };
  }

  // 2. Si ganó en el primer intento, se le asigna el porcentaje. Si perdió, 0%.
  const porcentaje = gano ? porcentajeGanado : 0;

  const payload: GameDiscountRecord = {
    order_id: orderId,
    client_id: clientId,
    game_name: gameName,
    discount_percentage: porcentaje,
    won_on_first_try: gano,
  };

  const { error } = await supabase.from("game_discounts").insert([payload]);

  if (error) {
    console.error("Error al registrar descuento:", error.message);
    return { aplicado: false, mensaje: error.message };
  }

  return {
    aplicado: true,
    mensaje: gano
      ? `¡Felicitaciones! Obtuvo un ${porcentaje}% de descuento en su cuenta.`
      : "No logró ganar en este intento. ¡Mejor suerte la próxima!",
  };
}