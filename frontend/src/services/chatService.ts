import { API_BASE_URL } from "../../apiConfig";
import { supabase } from "../config/supabase";
import { headersConToken } from "./tokenService";

export interface MensajeChat {
  id: string;
  table_id: string | null;
  order_id?: string | null;
  sender_id: string;
  sender_name?: string;
  sender_role?: "cliente" | "mozo" | "repartidor" | string;
  chat_type: "table_waiter" | "delivery" | string;
  message: string;
  created_at: string;
  users?: {
    first_name?: string;
    last_name?: string;
    role?: string;
  } | null;
}

export interface ChatFiltro {
  tableId?: string | null;
  orderId?: string | null;
}

export interface EnviarMensajePayload {
  /** Chat de mesa: mesa asignada. */
  table_id?: string | null;
  /** Chat de delivery: pedido a domicilio. */
  order_id?: string | null;
  sender_id: string;
  message: string;
  chat_type?: "table_waiter" | "delivery";
}

const normalizarFiltro = (filtro: ChatFiltro | string): ChatFiltro =>
  typeof filtro === "string" ? { tableId: filtro } : filtro;

export const obtenerMensajesChat = async (
  filtro: ChatFiltro | string
): Promise<MensajeChat[]> => {
  const { tableId, orderId } = normalizarFiltro(filtro);

  if (!tableId && !orderId) return [];

  // 1. Intento por backend
  try {
    const params = new URLSearchParams();
    if (tableId) params.set("table_id", tableId);
    if (orderId) params.set("order_id", orderId);

    const res = await fetch(`${API_BASE_URL}/chat?${params.toString()}`, {
      headers: await headersConToken(),
    });
    if (res.ok) {
      const json = await res.json();
      return json.data || [];
    }
  } catch {
    // Si falla el backend por red, pasa al fallback
  }

  // 2. Fallback garantizado: consulta directa a Supabase
  try {
    let query = supabase.from("chats").select("*");

    if (tableId) query = query.eq("table_id", tableId);
    if (orderId) query = query.eq("order_id", orderId);

    const { data, error } = await query.order("created_at", {
      ascending: true,
    });

    if (error) throw error;
    return (data as MensajeChat[]) || [];
  } catch (err: any) {
    console.warn("⚠️ Error obteniendo mensajes en Supabase:", err.message);
    return [];
  }
};

export const enviarMensajeChat = async (
  payload: EnviarMensajePayload
): Promise<MensajeChat> => {
  const chatType = payload.chat_type || "table_waiter";
  const tableId = payload.table_id || null;
  const orderId = payload.order_id || null;

  const bodyData = {
    table_id: tableId,
    order_id: orderId,
    sender_id: payload.sender_id,
    message: payload.message,
    chat_type: chatType,
  };

  // 1. Intento por backend: ${API_BASE_URL}/chat
  // El remitente lo resuelve el backend desde el token de sesión, por eso no
  // se envía sender_id.
  try {
    const res = await fetch(`${API_BASE_URL}/chat`, {
      method: "POST",
      headers: await headersConToken({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        ...(tableId ? { table_id: tableId } : {}),
        ...(orderId ? { order_id: orderId } : {}),
        message: payload.message,
        chat_type: chatType,
      }),
    });

    if (res.ok) {
      const json = await res.json();
      return json.data;
    }

    // El backend respondió con error (401/403/400/500): no se reintenta por
    // Supabase porque esa vía saltaría la validación del remitente y la
    // notificación push.
    const detalle = await res.json().catch(() => ({}));
    throw new Error(
      typeof detalle?.detalle === "string"
        ? detalle.detalle
        : detalle?.error || "No se pudo enviar el mensaje."
    );
  } catch (error: any) {
    // Solo cae al fallback cuando el backend fue inalcanzable
    const esFallaDeRed =
      error instanceof TypeError ||
      /network|failed to fetch|Network request failed|Load failed/i.test(
        error?.message || ""
      );

    if (!esFallaDeRed) throw error;

    console.warn(
      "⚠️ Backend /chat inalcanzable, insertando directo en Supabase (sin notificación push):",
      error.message
    );
  }

  // 2. Fallback garantizado: inserción directa en la tabla 'chats' de Supabase
  const { data, error } = await supabase
    .from("chats")
    .insert([bodyData])
    .select()
    .single();

  if (error) {
    console.error("❌ Error al insertar mensaje en Supabase:", error.message);
    throw new Error(error.message);
  }

  return data as MensajeChat;
};
