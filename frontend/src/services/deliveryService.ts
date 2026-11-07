import { API_BASE_URL } from "../../apiConfig";
import { headersConToken } from "./tokenService";

export interface PedidoDelivery {
  id: string;
  status: string;
  order_type: "delivery";
  client_id: string;
  delivery_driver_id?: string | null;
  delivery_address?: string | null;
  delivery_lat?: number | null;
  delivery_lng?: number | null;
  total_amount?: string | number | null;
  tip_amount?: string | number | null;
  discount_amount?: string | number | null;
  estimated_delivery_time?: number | null;
  created_at: string;
  client?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  } | null;
  delivery_driver?: {
    id: string;
    first_name?: string;
    last_name?: string;
  } | null;
  items?: {
    id: string;
    quantity: number;
    unit_price?: number | string;
    product?: { name?: string; price?: number | string } | null;
  }[];
}

const extraerData = async (res: Response) => {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (json as any)?.detalle ||
        (json as any)?.error ||
        `HTTP ${res.status} al procesar el pedido de delivery`
    );
  }
  return (json as any)?.data;
};

export const obtenerDeliveryApi = async (
  status?: string,
  repartidorId?: string
): Promise<PedidoDelivery[]> => {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (repartidorId) params.set("repartidor_id", repartidorId);

  const query = params.toString();
  const res = await fetch(
    `${API_BASE_URL}/delivery${query ? `?${query}` : ""}`,
    { headers: await headersConToken({ "Content-Type": "application/json" }) }
  );

  const data = await extraerData(res);
  return (data || []) as PedidoDelivery[];
};

export const tomarPedidoDeliveryApi = async (pedidoId: string) => {
  const res = await fetch(`${API_BASE_URL}/delivery/${pedidoId}/tomar`, {
    method: "PATCH",
    headers: await headersConToken({ "Content-Type": "application/json" }),
    body: JSON.stringify({}),
  });
  return extraerData(res);
};

export const entregarPedidoDeliveryApi = async (pedidoId: string) => {
  const res = await fetch(`${API_BASE_URL}/delivery/${pedidoId}/entregar`, {
    method: "PATCH",
    headers: await headersConToken({ "Content-Type": "application/json" }),
    body: JSON.stringify({}),
  });
  return extraerData(res);
};
