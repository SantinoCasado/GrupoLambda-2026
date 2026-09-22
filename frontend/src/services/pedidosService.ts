import { API_BASE_URL } from "./../../apiConfig";
import { supabase } from "../config/supabase";

export interface ItemPedidoPayload {
  id_producto: string;
  cantidad: number;
}

export interface CrearPedidoPayload {
  id_cliente: string;
  numero_mesa: number;
  productos: ItemPedidoPayload[];
  order_type?: "dine_in" | "takeaway" | "delivery";
}

export interface Pedido {
  id: string;
  table_id: string;
  client_id: string;
  waiter_id?: string | null;
  status: "pending_waiter" | "in_preparation" | "confirmed" | "delivered" | "finished" | string;
  total_amount: string | number;
  estimated_delivery_time: number;
  created_at: string;
  rejection_reason?: string | null;
}

export const crearPedidoApi = async (payload: CrearPedidoPayload): Promise<Pedido> => {
  const res = await fetch(`${API_BASE_URL}/pedidos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id_cliente: payload.id_cliente,
      numero_mesa: Number(payload.numero_mesa),
      productos: payload.productos,
      order_type: payload.order_type || "dine_in",
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${res.status} al procesar el pedido`);
  }

  const json = await res.json();
  return json.data;
};

export const confirmarPedidoPorMozoApi = async (
  pedidoId: string,
  waiterId: string,
  estado: "confirmed" | "in_preparation" | "cancelled",
  rejectionReason?: string
) => {
  const res = await fetch(`${API_BASE_URL}/pedidos/${pedidoId}/confirmar`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      waiter_id: waiterId,
      estado,
      rejection_reason: rejectionReason,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Error ${res.status} al confirmar pedido`);
  }

  return await res.json();
};

export const obtenerEstadoPedidoApi = async (pedidoId: string): Promise<Pedido> => {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", pedidoId)
    .single();

  if (error) throw new Error(error.message);
  return data as Pedido;
};