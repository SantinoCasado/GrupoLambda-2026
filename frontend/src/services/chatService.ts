import { API_BASE_URL } from "../.././apiConfig";
import { supabase } from "../config/supabase";

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
    const res = await fetch(`${API_BASE_URL}/chat?table_id=${tableId}`);
    if (res.ok) {
      const json = await res.json();
      return json.data || [];
    }
  } catch {
    // Si falla el backend, pasa al fallback
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
  try {
    const res = await fetch(`${API_BASE_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyData),
    });

    if (res.ok) {
      const json = await res.json();
      return json.data;
    }
  } catch {
    // Falla de red hacia Express, pasa al fallback
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