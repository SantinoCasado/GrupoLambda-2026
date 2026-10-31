import { useEffect, useState } from "react";
import { supabase } from "../config/supabase";

/**
 * Estados en los que el pedido ya fue aprobado por el mozo (es decir, pasó de
 * 'pending'). Cualquier otro estado (pending, cancelled, rejected) significa
 * que todavía no hay una comanda confirmada.
 */
const ESTADOS_APROBADOS = [
  "in_preparation",
  "ready",
  "delivered",
  "received",
  "bill_requested",
  "paid",
];

/**
 * Indica si el pedido activo del cliente ya fue aprobado por el mozo.
 *
 * Lee el estado una sola vez al cargar (sin suscripción en tiempo real): cuando
 * cambia `pedidoId` consulta `orders.status` y lo compara contra la lista de
 * estados aprobados. Si no hay id, devuelve `false`.
 */
export function usePedidoAprobado(pedidoId: string | null | undefined): boolean {
  const [pedidoAprobado, setPedidoAprobado] = useState(false);

  useEffect(() => {
    // Sin pedido activo (o mientras se edita una comanda rechazada) no hay nada
    // que consultar.
    if (!pedidoId) {
      setPedidoAprobado(false);
      return;
    }

    let cancelado = false;

    const consultarEstado = async () => {
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("status")
          .eq("id", pedidoId)
          .maybeSingle();

        if (cancelado) return;

        if (error) {
          console.warn("⚠️ [usePedidoAprobado] No se pudo leer el estado del pedido:", error.message);
          setPedidoAprobado(false);
          return;
        }

        const estado = String(data?.status || "").toLowerCase();
        setPedidoAprobado(ESTADOS_APROBADOS.includes(estado));
      } catch (e: any) {
        if (cancelado) return;
        console.warn("⚠️ [usePedidoAprobado] Error consultando el pedido:", e?.message);
        setPedidoAprobado(false);
      }
    };

    void consultarEstado();

    return () => {
      cancelado = true;
    };
  }, [pedidoId]);

  return pedidoAprobado;
}
