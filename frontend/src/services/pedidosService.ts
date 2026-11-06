import { API_BASE_URL } from "./../../apiConfig";
import { supabase } from "../config/supabase";
import { headersConToken } from "./tokenService";

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

export type PedidoStatus =
  | "pending"
  | "in_preparation"
  | "ready"
  | "delivered"
  | "received"
  | "cancelled";

export interface Pedido {
  id: string;
  table_id: string;
  client_id: string;
  waiter_id?: string | null;
  status: PedidoStatus;
  total_amount: string | number;
  estimated_delivery_time: number;
  created_at: string;
  rejection_reason?: string | null;
}

export const crearPedidoApi = async (payload: CrearPedidoPayload): Promise<Pedido> => {
  const res = await fetch(`${API_BASE_URL}/pedidos`, {
    method: "POST",
    headers: await headersConToken({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      id_cliente: payload.id_cliente,
      numero_mesa: Number(payload.numero_mesa),
      productos: payload.productos,
      order_type: payload.order_type || "dine_in",
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    console.warn("[crearPedidoApi] Error del backend:", res.status, errorData);
    throw new Error(
      errorData.detalle
        ? `${errorData.error || "Error del servidor"}: ${errorData.detalle}`
        : errorData.error || `HTTP ${res.status} al procesar el pedido`
    );
  }

  const json = await res.json();
  return json.data;
};

/**
 * Corrige un pedido que el mozo rechazó. El backend reemplaza los ítems,
 * recalcula los totales y devuelve la orden a estado 'pending' para que
 * el mozo vuelva a confirmarla. Solo el cliente dueño puede llamarla.
 */
export const modificarPedidoRechazadoApi = async (
  pedidoId: string,
  payload: ModificarPedidoRechazadoPayload
): Promise<ModificarPedidoRechazadoResponse> => {
  const res = await fetch(`${API_BASE_URL}/pedidos/${pedidoId}`, {
    method: "PUT",
    headers: await headersConToken({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      productos: payload.productos,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.error || `HTTP ${res.status} al modificar el pedido`
    );
  }

  const json = await res.json();
  return json.data;
};

export interface ModificarPedidoRechazadoPayload {
  productos: ItemPedidoPayload[];
}

export interface ModificarPedidoRechazadoResponse {
  pedido: Pedido;
  total: number;
  tiempoEstimado: number;
}

export const confirmarPedidoPorMozoApi = async (
  pedidoId: string,
  waiterId: string,
  estado: "confirmed" | "in_preparation" | "cancelled",
  rejectionReason?: string
) => {
  const res = await fetch(`${API_BASE_URL}/pedidos/${pedidoId}/confirmar`, {
    method: "PUT",
    headers: await headersConToken({ "Content-Type": "application/json" }),
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

export const marcarItemListoApi = async (itemId: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/pedidos/items/${itemId}/listo`, {
    method: "PATCH",
    headers: await headersConToken({ "Content-Type": "application/json" }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${res.status} al marcar ítem listo`);
  }
};

export const marcarPedidoEntregadoApi = async (pedidoId: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/pedidos/${pedidoId}/entregar`, {
    method: "PATCH",
    headers: await headersConToken({ "Content-Type": "application/json" }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${res.status} al marcar el pedido como entregado`);
  }
};

export interface TicketsPedido {
  id: string;
  created_at: string;
  status: string;
  restaurant_tables?: { table_number: number } | null;
  order_items?: {
    id: string;
    quantity: number;
    products?: {
      id: string;
      name: string;
      category: string;
      // Los endpoints /pedidos/cocina y /pedidos/bar todavía no los incluyen;
      // se ignoran hasta que el backend los agregue al select.
      prep_time?: number | string;
      photos?: string[] | null;
    } | null;
  }[];
}

export const obtenerTicketsCocinaApi = async (): Promise<TicketsPedido[]> => {
  const res = await fetch(`${API_BASE_URL}/pedidos/cocina`, {
    headers: await headersConToken({ "Content-Type": "application/json" }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${res.status} al obtener tickets de cocina`);
  }

  const json = await res.json();
  return (json.data || []) as TicketsPedido[];
};

export const obtenerTicketsBarApi = async (): Promise<TicketsPedido[]> => {
  const res = await fetch(`${API_BASE_URL}/pedidos/bar`, {
    headers: await headersConToken({ "Content-Type": "application/json" }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${res.status} al obtener tickets de bar`);
  }

  const json = await res.json();
  return (json.data || []) as TicketsPedido[];
};

export interface ProductoMetadatos {
  prepTime: number;
  fotos: string[];
}

/**
 * Mapa id_de_producto -> tiempo de elaboración (minutos) y fotos.
 * Fallback temporal: los endpoints de cocina/bar no devuelven
 * products.prep_time ni products.photos, así que la pantalla de
 * preparación los consulta directo de Supabase.
 */
export const obtenerMetadatosProductosApi = async (): Promise<
  Record<string, ProductoMetadatos>
> => {
  const { data, error } = await supabase
    .from("products")
    .select("id, prep_time, photos");

  if (error) throw new Error(error.message);

  const mapa: Record<string, ProductoMetadatos> = {};
  for (const fila of data || []) {
    mapa[fila.id] = {
      prepTime: Number((fila as any).prep_time) || 0,
      fotos: Array.isArray((fila as any).photos) ? ((fila as any).photos as string[]) : [],
    };
  }
  return mapa;
};