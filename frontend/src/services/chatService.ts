import { API_BASE_URL } from "../../apiConfig";
import { supabase } from "../config/supabase";
import { headersConToken } from "./tokenService";

export interface MensajeChat {
  id: string;
  table_id: string;
  sender_id: string;
  sender_name?: string;
  sender_role?: "cliente" | "mozo" | string;
  chat_type: "table_waiter" | string;
  message: string;
  created_at: string;
}

export interface EnviarMensajePayload {
  table_id: string;
  sender_id: string;
  message: string;
  chat_type?: "table_waiter";
  order_id?: string | null;
}

export const obtenerMensajesChat = async (tableId: string): Promise<MensajeChat[]> => {
  if (!tableId) return [];

  // 1. Intento por backend
  try {
    const res = await fetch(`${API_BASE_URL}/chat?table_id=${tableId}`, {
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
    const { data, error } = await supabase
      .from("chats")
      .select("*")
      .eq("table_id", tableId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data as MensajeChat[]) || [];
  } catch (err: any) {
    console.warn("⚠️ Error obteniendo mensajes en Supabase:", err.message);
    return [];
  }
};

export const enviarMensajeChat = async (payload: EnviarMensajePayload): Promise<MensajeChat> => {
  const bodyData = {
    table_id: payload.table_id,
    sender_id: payload.sender_id,
    message: payload.message,
    chat_type: payload.chat_type || "table_waiter",
    order_id: payload.order_id || null,
  };

  // 1. Intento por backend: ${API_BASE_URL}/chat
  // El remitente lo resuelve el backend desde el token de sesión, por eso no se envía sender_id.
  try {
    const res = await fetch(`${API_BASE_URL}/chat`, {
      method: "POST",
      headers: await headersConToken({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        table_id: bodyData.table_id,
        message: bodyData.message,
        chat_type: bodyData.chat_type,
        order_id: bodyData.order_id,
      }),
    });

    if (res.ok) {
      const json = await res.json();
      return json.data;
    }

    // El backend respondió con error (401/403/400/500): no se reintenta por Supabase
    // porque esa vía saltaría la validación del remitente y la notificación push.
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
      /network|failed to fetch|Network request failed|Load failed/i.test(error?.message || "");

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
