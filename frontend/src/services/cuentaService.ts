import { supabase } from "../config/supabase";
import { API_BASE_URL } from "../../apiConfig";

export interface ItemCuenta {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface DetalleCuenta {
  pedidoId: string;
  numeroMesa: string | number;
  items: ItemCuenta[];
  subtotal: number;
  porcentajeDescuento: number;
  montoDescuento: number;
  porcentajePropina: number;
  montoPropina: number;
  totalFinal: number;
  estado: string;
  /** Presente sólo en pedidos a domicilio. */
  direccionEntrega?: string | null;
  orderType?: string;
}

export interface EstadoSesionCliente {
  mesaId?: string;
  numeroMesa?: string | number;
  pedidoId?: string;
  pedidoStatus?: string;
  propina?: number;
  pantallaDestino: "inicio" | "menu" | "estado_pedido" | "pedido_recibido" | "cuenta";
  /** Datos del pedido a domicilio, para reconstruir el contexto de entrega. */
  orderType?: string;
  deliveryAddress?: string | null;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
}

/**
 * Convierte el `tip_amount` guardado en el pedido al porcentaje de propina
 * permitido por la app. Normalmente `tip_amount` es un monto en pesos, aunque
 * datos viejos pueden tener guardado directamente el porcentaje (0, 5, 10...).
 */
function normalizarPorcentajePropina(
  tipGuardada: number,
  totalBase: number,
  baseIncluyePropina = true
): number {
  if (tipGuardada <= 0) return 0;

  // Si el valor guardado es menor o igual a 20, ya es el porcentaje (ej: 5, 10, 15, 20)
  if (tipGuardada <= 20) return tipGuardada;

  // Si es un monto en pesos, calculamos a qué porcentaje correspondía.
  // Cuando total_amount ya incluía la propina, la base era (total - propina).
  const baseAprox = baseIncluyePropina
    ? Math.max(1, totalBase - tipGuardada)
    : Math.max(1, totalBase);
  const porcentajeCalculado = Math.round((tipGuardada / baseAprox) * 100);

  // Normalizamos a los valores permitidos de propina de la app
  const opciones = [0, 5, 10, 15, 20];
  return opciones.reduce((prev, curr) =>
    Math.abs(curr - porcentajeCalculado) < Math.abs(prev - porcentajeCalculado)
      ? curr
      : prev
  );
}

/**
 * Deriva el porcentaje de propina a partir de los montos ya guardados en el
 * pedido. El repartidor lo necesita para generar la factura al cobrar.
 *
 * `total_amount` = subtotal - descuento + propina, por lo que la base es
 * `total_amount - tip_amount + discount_amount`.
 */
export function porcentajePropinaDesdePedido(
  tipAmount: unknown,
  totalAmount: unknown,
  discountAmount: unknown
): number {
  const propina = Number(tipAmount || 0);
  const total = Number(totalAmount || 0);
  const descuento = Number(discountAmount || 0);

  if (!Number.isFinite(propina) || propina <= 0) return 0;

  const base = total - propina + descuento;
  if (!Number.isFinite(base) || base <= 0) return 0;

  return Math.max(0, Math.round((propina / base) * 100));
}

export async function recuperarEstadoActivoCliente(
  userId: string
): Promise<EstadoSesionCliente> {
  try {
    console.log("🔍 [RecuperarSesion] Verificando estado para userId:", userId);

    // 1. Buscar si tiene un pedido activo (no pagado y no cancelado)
    const { data: pedidos, error: errPedidos } = await supabase
      .from("orders")
      .select("*")
      .eq("client_id", userId)
      .not("status", "in", '("paid","cancelled")')
      .order("created_at", { ascending: false })
      .limit(1);

    if (errPedidos) {
      console.warn("⚠️ [RecuperarSesion] Error al buscar pedidos:", errPedidos.message);
    }

    const pedido = pedidos && pedidos.length > 0 ? pedidos[0] : null;

    if (pedido) {
      console.log("📦 [RecuperarSesion] Pedido activo encontrado:", pedido.id, "Estado:", pedido.status);

      const esDelivery = pedido.order_type === "delivery";

      // Traer número de mesa de forma directa y segura. Para delivery el
      // "identificador" visible es la dirección de entrega.
      let numMesa: string | number = esDelivery
        ? pedido.delivery_address || "Domicilio"
        : "S/N";

      if (!esDelivery && pedido.table_id) {
        const { data: mesa } = await supabase
          .from("restaurant_tables")
          .select("table_number")
          .eq("id", pedido.table_id)
          .maybeSingle();

        if (mesa?.table_number !== undefined) {
          numMesa = mesa.table_number;
        }
      }

      const mesaId = pedido.table_id ?? undefined;
      const direccionEntrega = esDelivery
        ? pedido.delivery_address ?? null
        : undefined;

      const datosEntrega = esDelivery
        ? {
            orderType: "delivery",
            deliveryAddress: direccionEntrega,
            deliveryLat: pedido.delivery_lat ?? null,
            deliveryLng: pedido.delivery_lng ?? null,
          }
        : { orderType: pedido.order_type ?? "dine_in" };

      // Si pidió la cuenta -> Directo a CuentaScreen
      if (pedido.status === "bill_requested") {
        const porcentajePropina = normalizarPorcentajePropina(
          Number(pedido.tip_amount || 0),
          Number(pedido.total_amount || 0)
        );

        return {
          mesaId,
          numeroMesa: numMesa,
          pedidoId: pedido.id,
          pedidoStatus: pedido.status,
          propina: porcentajePropina,
          pantallaDestino: "cuenta",
          ...datosEntrega,
        };
      }

      // Un pedido a domicilio entregado todavía necesita que el cliente
      // confirme la recepción desde el seguimiento.
      if (esDelivery && pedido.status === "delivered") {
        return {
          mesaId,
          numeroMesa: numMesa,
          pedidoId: pedido.id,
          pedidoStatus: pedido.status,
          pantallaDestino: "estado_pedido",
          ...datosEntrega,
        };
      }

      // Pedido a domicilio recibido -> pantalla post-entrega (propina, reseña
      // y pago). El cobro lo hace el repartidor en la puerta.
      if (esDelivery && pedido.status === "received") {
        return {
          mesaId,
          numeroMesa: numMesa,
          pedidoId: pedido.id,
          pedidoStatus: pedido.status,
          pantallaDestino: "pedido_recibido",
          ...datosEntrega,
        };
      }

      // Si el pedido ya fue entregado -> Pantalla de post-entrega (juegos, encuesta, pedir cuenta)
      if (!esDelivery && pedido.status === "delivered") {
        // Si ya escaneó el QR de propina, la recuperamos para que la pantalla
        // muestre directamente el botón "Pagar cuenta" con la propina incluida.
        const porcentajePropina = normalizarPorcentajePropina(
          Number(pedido.tip_amount || 0),
          Number(pedido.total_amount || 0) - Number(pedido.discount_amount || 0),
          false
        );

        return {
          mesaId,
          numeroMesa: numMesa,
          pedidoId: pedido.id,
          pedidoStatus: pedido.status,
          ...(porcentajePropina > 0 ? { propina: porcentajePropina } : {}),
          pantallaDestino: "pedido_recibido",
          ...datosEntrega,
        };
      }

      // pending, in_preparation, ready, on_the_way, etc. -> Seguimiento
      return {
        mesaId,
        numeroMesa: numMesa,
        pedidoId: pedido.id,
        pedidoStatus: pedido.status,
        pantallaDestino: "estado_pedido",
        ...datosEntrega,
      };
    }

    // 2. Si no tiene comanda todavía, verificar si el metre ya le asignó mesa
    const { data: espera } = await supabase
      .from("waiting_list")
      .select("assigned_table_id, status")
      .eq("user_id", userId)
      .eq("status", "assigned")
      .limit(1)
      .maybeSingle();

    if (espera?.assigned_table_id) {
      console.log("🪑 [RecuperarSesion] Mesa ya asignada en waiting_list:", espera.assigned_table_id);
      
      const { data: mesa } = await supabase
        .from("restaurant_tables")
        .select("table_number")
        .eq("id", espera.assigned_table_id)
        .maybeSingle();

      return {
        mesaId: espera.assigned_table_id,
        numeroMesa: mesa?.table_number ?? "S/N",
        pantallaDestino: "menu",
      };
    }

    console.log("🚪 [RecuperarSesion] Sin estadía activa previa. Va a la puerta.");
    return { pantallaDestino: "inicio" };
  } catch (error) {
    console.error("❌ [RecuperarSesion] Error general:", error);
    return { pantallaDestino: "inicio" };
  }
}

/** Obtiene todos los datos para armar la factura estilo Mercado Pago */
export async function obtenerDetalleCuenta(
  pedidoId: string,
  porcentajePropina: number
): Promise<DetalleCuenta> {
  console.log("👉 Iniciando obtenerDetalleCuenta para:", pedidoId);

  // Guarda de seguridad contra UUIDs vacíos
  if (!pedidoId || pedidoId.trim() === "") {
    console.warn("⚠️ [obtenerDetalleCuenta] pedidoId inválido o vacío. Abortando consulta.");
    throw new Error("ID de pedido no proporcionado.");
  }
  
  // 1. Obtener pedido
  const { data: pedido, error: errPedido } = await supabase
    .from("orders")
    .select("*")
    .eq("id", pedidoId)
    .single();

  if (errPedido || !pedido) {
    console.error("❌ Error al traer pedido:", errPedido);
    throw new Error("No se pudo cargar el pedido.");
  }

  // 2. Obtener número de mesa desde restaurant_tables (o la dirección si es delivery)
  const esDelivery = pedido.order_type === "delivery";
  let numeroMesa: string | number = esDelivery
    ? pedido.delivery_address || "Domicilio"
    : "S/N";

  if (!esDelivery && pedido.table_id) {
    const { data: mesa } = await supabase
      .from("restaurant_tables")
      .select("table_number")
      .eq("id", pedido.table_id)
      .maybeSingle();

    if (mesa?.table_number !== undefined) {
      numeroMesa = mesa.table_number;
    }
  }

  // 3. Obtener ítems consumidos (con columnas reales: product_id, quantity, unit_price)
  const { data: itemsRaw, error: errItems } = await supabase
    .from("order_items")
    .select("id, product_id, quantity, unit_price")
    .eq("order_id", pedidoId);

  if (errItems) {
    console.error("❌ Error al traer order_items:", errItems);
    throw new Error("No se pudieron cargar los ítems del pedido.");
  }

  // Obtenemos los nombres de productos
  const items: ItemCuenta[] = [];
  let subtotalCalculado = 0;

  for (const it of itemsRaw || []) {
    let nombre = "Producto";
    if (it.product_id) {
      // Intentamos en products y luego en menu_items
      const { data: prod } = await supabase
        .from("products")
        .select("name")
        .eq("id", it.product_id)
        .maybeSingle();

      if (prod?.name) {
        nombre = prod.name;
      } else {
        const { data: menuProd } = await supabase
          .from("menu_items")
          .select("name")
          .eq("id", it.product_id)
          .maybeSingle();
        if (menuProd?.name) nombre = menuProd.name;
      }
    }

    const cantidad = Number(it.quantity || 1);
    const precio = Number(it.unit_price || 0);
    const subtotalLinea = cantidad * precio;

    subtotalCalculado += subtotalLinea;
    items.push({
      id: it.id,
      name: nombre,
      quantity: cantidad,
      unit_price: precio,
      subtotal: subtotalLinea,
    });
  }

  const subtotal = subtotalCalculado > 0 ? subtotalCalculado : Number(pedido.total_amount || 0);

  // 4. Descuento de juegos (primer intento)
  let porcentajeDescuento = 0;
  try {
    // Puede haber varias jugadas por pedido: solo una puede tener descuento > 0.
    const { data: jugadas } = await supabase
      .from("game_discounts")
      .select("discount_percentage, won_on_first_try")
      .eq("order_id", pedidoId);

    const ganadora = (jugadas || []).find(
      (j: any) =>
        Number(j.discount_percentage || 0) > 0 &&
        (j.won_on_first_try === true || j.won_on_first_try === "true")
    );

    if (ganadora) {
      porcentajeDescuento = Number(ganadora.discount_percentage || 0);
    }
  } catch (e) {
    console.warn("No se pudo leer descuento de juegos:", e);
  }

  // 5. Cálculos finales
  const propinaSegura = Number(porcentajePropina) > 20 ? 10 : Math.max(0, Number(porcentajePropina) || 0);
  const montoDescuento = (subtotal * porcentajeDescuento) / 100;
  const subtotalConDescuento = Math.max(0, subtotal - montoDescuento);
  const montoPropina = (subtotalConDescuento * propinaSegura) / 100;
  const totalFinal = subtotalConDescuento + montoPropina;

  return {
    pedidoId,
    numeroMesa,
    items,
    subtotal,
    porcentajeDescuento,
    montoDescuento,
    porcentajePropina,
    montoPropina,
    totalFinal,
    estado: pedido.status,
    direccionEntrega: esDelivery ? pedido.delivery_address ?? null : undefined,
    orderType: pedido.order_type ?? "dine_in",
  };
}

/**
 * Guarda la propina elegida por QR en el pedido, sin solicitar todavía la
 * cuenta (el estado sigue siendo 'delivered'). Así la propina ya se ve en el
 * detalle del pedido y sobrevive a recargas/remontajes de la pantalla.
 * Devuelve el monto de propina guardado.
 */
export async function guardarPropinaPedido(
  pedidoId: string,
  porcentajePropina: number
): Promise<number> {
  if (!pedidoId) {
    throw new Error("No hay un pedido activo para registrar la propina.");
  }

  // Reutilizamos el mismo cálculo que CuentaScreen para que el monto mostrado
  // en el detalle coincida exactamente con el que se va a cobrar.
  const detalle = await obtenerDetalleCuenta(pedidoId, porcentajePropina);

  const { error } = await supabase
    .from("orders")
    .update({
      tip_amount: detalle.montoPropina,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pedidoId);

  if (error) {
    console.error("❌ Error en guardarPropinaPedido:", error.message);
    throw error;
  }

  console.log("✅ Propina guardada:", detalle.montoPropina);
  return detalle.montoPropina;
}

/** Pone el pedido en 'bill_requested' y actualiza montos */
export async function solicitarCuentaApi(
  pedidoId: string,
  totalFinal: number,
  montoPropina: number,
  montoDescuento: number
) {
  console.log("👉 Actualizando orders a 'bill_requested'...");

  // 1) Cerramos los montos en Supabase. El backend de cobro lee estos valores
  //    para no volver a aplicar descuento ni propina.
  const payload: any = {
    status: "bill_requested",
    total_amount: totalFinal,
    tip_amount: montoPropina,
    discount_amount: montoDescuento,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("orders")
    .update(payload)
    .eq("id", pedidoId);

  if (error) {
    console.error("❌ Error en solicitarCuentaApi:", error.message);
    throw error;
  }

  // 2) Avisamos al backend para que envíe la push al mozo o al repartidor
  //    según el tipo de pedido. Es best-effort: si falla la red, la cuenta ya
  //    quedó registrada y el personal igual la ve por Realtime.
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    await fetch(`${API_BASE_URL}/pedidos/${pedidoId}/solicitar-cuenta`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch (pushError: any) {
    console.warn(
      "⚠️ No se pudo notificar la solicitud de cuenta al personal:",
      pushError?.message
    );
  }

  console.log("✅ Pedido actualizado con éxito a bill_requested");
}

/** Suscripción en tiempo real para saber cuándo el mozo confirma el pago */
export function escucharPagoConfirmado(pedidoId: string, onPaid: () => void) {
  const canal = supabase
    .channel(`order_paid_${pedidoId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "orders",
        filter: `id=eq.${pedidoId}`,
      },
      (payload) => {
        if (payload.new && payload.new.status === "paid") {
          onPaid();
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(canal);
  };
}

/** Acción del Mozo para confirmar el cobro y liberar la mesa */
export async function confirmarPagoPorMozo(
  pedidoId: string,
  mesaId: string | null,
  propinaPorcentaje: number = 0
): Promise<void> {
  console.log("👉 [confirmarPagoPorMozo] Datos enviados:", {
    pedidoId,
    mesaId,
    propinaPorcentaje,
  });

  // 1. Obtener sesión y token activo
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  console.log("🔑 [confirmarPagoPorMozo] Token presente:", Boolean(token));

  // 2. Probar URL
  // NOTA: Verificá si tu backend usa /api/pedidos o /pedidos en index/app.ts
  const url = `${API_BASE_URL}/pedidos/cobrar`;
  console.log("🌐 [confirmarPagoPorMozo] Llamando a URL:", url);

  const payload = {
    pedido_id: String(pedidoId),
    propina: Number(propinaPorcentaje) || 0,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  console.log("📡 [confirmarPagoPorMozo] HTTP Status Code:", response.status);

  const rawText = await response.text();
  console.log("📄 [confirmarPagoPorMozo] Respuesta cruda backend:", rawText);

  let data: any = null;
  try {
    data = JSON.parse(rawText);
  } catch (e) {
    // Si no es JSON (ej. error 404 HTML de Express o 502)
  }

  if (!response.ok) {
    throw new Error(
      data?.error || data?.message || `Error ${response.status}: ${rawText || "Sin respuesta del servidor"}`
    );
  }

  // 3. Liberar mesa en Supabase como reaseguro
  if (mesaId) {
    await supabase
      .from("restaurant_tables")
      .update({ availability: "free" })
      .eq("id", mesaId);
  }
}