import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { supabase } from "../config/supabase";
import { useCart, ItemCarrito } from "../context/carritoContext";
import { FeedbackModal } from "../components/FeedbackModal";
import { DetallePedidoCard } from "../components/DetallePedidoCard";
import { DeliveryMap } from "../components/DeliveryMap";
import { obtenerJugadasPedido } from "../services/juegosService";
import { confirmarRecepcionPedidoApi } from "../services/pedidosService";

interface Props {
  pedidoId: string;
  onVolver: () => void;
  onIrAJuegos?: () => void;
  onConfirmarRecepcion: (pedidoId: string, numMesa: string | number) => void;
  onEditarComanda?: (motivo: string | null) => void;
  /** Abre el chat con el repartidor asignado al pedido a domicilio. */
  onAbrirChatRepartidor?: (
    pedidoId: string,
    direccion: string,
    createdAt: string | null
  ) => void;
}

const ETAPAS_DINE_IN = [
  { clave: "pending", titulo: "Recibido", iconoActivo: require("../../assets/images/audit-y.png"), iconoPendiente: require("../../assets/images/audit-g.png"), descripcion: "Esperando confirmación del mozo" },
  { clave: "in_preparation", titulo: "En Cocina", iconoActivo: require("../../assets/images/chef-y.png"), iconoPendiente: require("../../assets/images/chef-g.png"), descripcion: "Preparando sus platos y bebidas" },
  { clave: "ready", titulo: "Listo", iconoActivo: require("../../assets/images/serving-y.png"), iconoPendiente: require("../../assets/images/serving-g.png"), descripcion: "Su pedido está listo para ser servido" },
  { clave: "delivered", titulo: "Servido", iconoActivo: require("../../assets/images/dish-y.png"), iconoPendiente: require("../../assets/images/dish-g.png"), descripcion: "¡A disfrutar su comida!" },
];

const ETAPAS_DELIVERY = [
  { clave: "pending", titulo: "Recibido", iconoActivo: require("../../assets/images/audit-y.png"), iconoPendiente: require("../../assets/images/audit-g.png"), descripcion: "Esperando aprobación de la administración" },
  { clave: "in_preparation", titulo: "En Preparación", iconoActivo: require("../../assets/images/chef-y.png"), iconoPendiente: require("../../assets/images/chef-g.png"), descripcion: "Cocinando tu pedido" },
  { clave: "ready", titulo: "Listo", iconoActivo: require("../../assets/images/dish-y.png"), iconoPendiente: require("../../assets/images/dish-g.png"), descripcion: "Esperando que un repartidor lo retire" },
  { clave: "on_the_way", titulo: "En Camino", iconoActivo: require("../../assets/images/audit-car.png"), iconoPendiente: require("../../assets/images/audit-g.png"), descripcion: "El repartidor se dirige a tu domicilio" },
  { clave: "delivered", titulo: "Entregado", iconoActivo: require("../../assets/images/confirm-y.png"), iconoPendiente: require("../../assets/images/audit-g.png"), descripcion: "Confirmá la recepción en la app" },
  { clave: "received", titulo: "Recibido", iconoActivo: require("../../assets/images/food-y.png"), iconoPendiente: require("../../assets/images/food-v.png"), descripcion: "¡A disfrutar tu pedido!" },
];

const formatearFechaHora = (iso?: string | null) => {
  if (!iso) return "";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "";
  return `${fecha.toLocaleDateString([], {
    day: "2-digit",
    month: "2-digit",
  })} ${fecha.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
};

export function EstadoPedidoScreen({
  pedidoId,
  onVolver,
  onIrAJuegos,
  onConfirmarRecepcion,
  onEditarComanda,
  onAbrirChatRepartidor,
}: Props) {
  const { reemplazarCarrito } = useCart();
  const [pedido, setPedido] = useState<any | null>(null);
  const [cargando, setCargando] = useState(true);
  const [descuentoPct, setDescuentoPct] = useState(0);
  const [modalRechazoVisible, setModalRechazoVisible] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState<string>("");
  const [confirmandoRecepcion, setConfirmandoRecepcion] = useState(false);
  const [tick, setTick] = useState(0);
  const yaNotificoRechazoRef = useRef(false);
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const [feedback, setFeedback] = useState<{
    visible: boolean;
    tipo: "exito" | "error" | "informacion";
    titulo: string;
    mensaje: string;
  }>({ visible: false, tipo: "exito", titulo: "", mensaje: "" });

  const verificarEstadoYNotificar = (datosPedido: any) => {
    if (!datosPedido) return;

    const st = String(datosPedido.status || "").toLowerCase();
    const esRechazado = st === "rejected" || st === "cancelled" || st === "rechazado";

    if (esRechazado && !yaNotificoRechazoRef.current) {
      yaNotificoRechazoRef.current = true;
      const esDelivery = datosPedido.order_type === "delivery";
      const motivo =
        datosPedido.rejection_reason ||
        datosPedido.motivo_rechazo ||
        datosPedido.reason ||
        (esDelivery
          ? "La administración rechazó el pedido a domicilio. Por favor, revisá y ajustá tu pedido."
          : "El mozo rechazó la comanda. Por favor, revisá y ajustá tu pedido.");

      setMotivoRechazo(motivo);
      setModalRechazoVisible(true);
    }
  };

  const cargarPedido = async () => {
    try {
      const [{ data, error }, jugadas] = await Promise.all([
        supabase
          .from("orders")
          .select(`
             id,
             status,
             rejection_reason,
             total_amount,
             discount_amount,
             tip_amount,
             estimated_delivery_time,
             created_at,
             order_type,
             delivery_address,
             delivery_lat,
             delivery_lng,
             delivery_driver_id,
             restaurant_tables (table_number),
             order_items (
               id,
               quantity,
               unit_price,
               products (id, name, description, price, prep_time, photos, category)
             )
          `)
          .eq("id", pedidoId)
          .single(),
        obtenerJugadasPedido(pedidoId),
      ]);

      if (!error && data) {
        const ganadora = jugadas.find(
          (j) =>
            Number(j.discount_percentage || 0) > 0 &&
            Boolean(j.won_on_first_try)
        );
        setDescuentoPct(Number(ganadora?.discount_percentage || 0));
        setPedido(data);
        verificarEstadoYNotificar(data);
      }
    } catch (e: any) {
      console.warn("Error cargando estado:", e.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarPedido();

    const canal = supabase
      .channel(`seguimiento_${pedidoId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${pedidoId}`,
        },
        (payload: any) => {
          const nuevo = payload.new;
          if (nuevo) {
            verificarEstadoYNotificar(nuevo);
          }
          cargarPedido();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [pedidoId]);

  // Mantiene actualizado el contador de minutos transcurridos del delivery.
  const esDeliveryPedido = pedido?.order_type === "delivery";
  useEffect(() => {
    if (!esDeliveryPedido) return;
    const intervalo = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(intervalo);
  }, [esDeliveryPedido]);

  if (cargando) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FCE7CB]">
        <ActivityIndicator size="large" color="#800020" />
      </View>
    );
  }

  const estadoActual = String(pedido?.status || "pending").toLowerCase();
  const esDelivery = pedido?.order_type === "delivery";
  const numMesa = pedido?.restaurant_tables?.table_number ?? "S/N";
  const direccionEntrega = pedido?.delivery_address || "Domicilio del cliente";
  const estaRechazado = estadoActual === "rejected" || estadoActual === "cancelled" || estadoActual === "rechazado";
  const estaEntregado = estadoActual === "delivered";
  const estaRecibido = estadoActual === "received";
  const estaEnCamino = estadoActual === "on_the_way";

  const etapas = esDelivery ? ETAPAS_DELIVERY : ETAPAS_DINE_IN;
  const claveParaIndice =
    estadoActual === "bill_requested" || estadoActual === "paid"
      ? etapas[etapas.length - 1].clave
      : estadoActual;
  const indiceActual = etapas.findIndex((e) => e.clave === claveParaIndice);

  const fechaCreacion = pedido?.created_at ? new Date(pedido.created_at) : null;
  const minutosTranscurridos =
    fechaCreacion && !Number.isNaN(fechaCreacion.getTime())
      ? Math.max(0, Math.floor((Date.now() - fechaCreacion.getTime()) / 60_000))
      : 0;

  const latDestino = Number(pedido?.delivery_lat);
  const lngDestino = Number(pedido?.delivery_lng);
  const tieneCoords =
    esDelivery &&
    pedido?.delivery_lat != null &&
    pedido?.delivery_lng != null &&
    Number.isFinite(latDestino) &&
    Number.isFinite(lngDestino);

  const manejarEditarComanda = () => {
    setModalRechazoVisible(false);

    // Reconstruimos los ítems para volver al carrito tal cual estaban
    const items: ItemCarrito[] = (pedido?.order_items || [])
      .filter((it: any) => it?.products?.id)
      .map((it: any) => ({
        id: it.products.id,
        nombre: it.products.name || "Producto",
        descripcion: it.products.description || "",
        precio: Number(it.products.price ?? it.unit_price) || 0,
        categoria: it.products.category || "dish",
        tiempoElaboracion: Number(it.products.prep_time) || 0,
        fotos: Array.isArray(it.products.photos) ? it.products.photos : [],
        cantidad: Number(it.quantity) || 1,
      }));

    if (items.length > 0) {
      reemplazarCarrito(items);
    }

    if (onEditarComanda) {
      onEditarComanda(motivoRechazo || pedido?.rejection_reason || null);
    } else {
      onVolver();
    }
  };

  const confirmarRecepcion = async () => {
    setConfirmandoRecepcion(true);
    try {
      await confirmarRecepcionPedidoApi(pedidoId);
      await cargarPedido();
      setFeedback({
        visible: true,
        tipo: "exito",
        titulo: "¡Recepción confirmada!",
        mensaje:
          "El repartidor ya puede cobrar tu pedido. Cuando termine, la cuenta pasará a estar disponible para el pago.",
      });
    } catch (err: any) {
      setFeedback({
        visible: true,
        tipo: "error",
        titulo: "No se pudo confirmar",
        mensaje: err?.message || "Intentá nuevamente en unos segundos.",
      });
    } finally {
      setConfirmandoRecepcion(false);
    }
  };

  const textoEspera = (() => {
    if (!esDelivery) return "Esperando Entrega...";
    if (estaEnCamino) return "El repartidor está en camino";
    if (estadoActual === "ready") return "Esperando que un repartidor lo retire";
    if (estadoActual === "in_preparation") return "Preparando tu pedido...";
    return "Esperando aprobación de la administración";
  })();

  return (
    <View className="flex-1 bg-[#FCE7CB]">
      {/* Header */}
      <View className="my-3 flex-row items-center justify-center border-b border-mostaza/70 pb-3 px-4 pt-2">
        <View className="items-center w-full justify-center flex-col">
          <Text
            style={{ fontFamily: "LaOriental" }}
            className={`uppercase text-vino text-center w-full ${
              esDelivery ? "text-lg" : "text-2xl"
            }`}
            numberOfLines={2}
          >
            {esDelivery ? direccionEntrega : `Mesa #${numMesa}`}
          </Text>
          <Text className="text-sm font-bold text-stone-500">
            Seguimiento del pedido
          </Text>
          {esDelivery && pedido?.created_at && (
            <Text className="mt-0.5 text-[11px] font-semibold text-stone-500 text-center">
              {formatearFechaHora(pedido.created_at)} • {minutosTranscurridos} min
              transcurridos
            </Text>
          )}
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        className="flex-1 h-full"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="flex-grow px-4"
      >
        {/* Banner de Rechazo (si está rechazado) */}
        {estaRechazado ? (
          <View className="mb-4 rounded-2xl border-2 border-red-500 bg-red-950/80 p-4 shadow-md">
            <Text className="text-xs font-bold uppercase tracking-wider text-red-300">
              ⚠️ {esDelivery ? "Pedido rechazado por la administración" : "Pedido rechazado por el mozo"}
            </Text>
            <Text className="mt-1 text-sm font-semibold text-white">
              Motivo: "{pedido?.rejection_reason || motivoRechazo || "Sin especificar"}"
            </Text>
            <TouchableOpacity
              onPress={manejarEditarComanda}
              className="mt-3 rounded-xl bg-mostaza py-2.5 px-4 items-center"
            >
              <Text style={{ fontFamily: "LaOriental" }} className="text-xs uppercase text-vino font-black">
                {esDelivery ? "Modificar Pedido y Reenviar" : "Modificar Comanda y Reenviar"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Banner Normal de Tiempo Estimado */
          <View className="mb-4 rounded-2xl border-2 border-mostaza bg-vino p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-amber-200/80 uppercase font-semibold">
                {esDelivery
                  ? estaRecibido
                    ? "¡Pedido recibido!"
                    : estaEntregado
                    ? "¡Pedido entregado!"
                    : estaEnCamino
                    ? "En camino"
                    : "Tiempo estimado de entrega"
                  : estaEntregado
                  ? "¡Pedido servido!"
                  : "Tiempo estimado"}
              </Text>
              <Text className="text-3xl font-black text-mostaza">
                {esDelivery
                  ? estaRecibido
                    ? "¡Listo!"
                    : estaEntregado
                    ? "Confirmá"
                    : `⏱ ~${pedido?.estimated_delivery_time || 15} min`
                  : estaEntregado
                  ? "¡En tu mesa!"
                  : `⏱ ~${pedido?.estimated_delivery_time || 15} min`}
              </Text>
            </View>
            {esDelivery && estaEntregado && (
              <Text className="mt-2 text-xs text-amber-100/90">
                El repartidor confirmó la entrega. Tocá "Confirmar recepción" para
                habilitar el cobro del pedido.
              </Text>
            )}
          </View>
        )}

        {/* Línea de Etapas / Progreso */}
        <View className="mb-4 rounded-2xl border border-mostaza/70 bg-amber-50 p-4 shadow-sm">
          <Text style={{ fontFamily: "LaOriental" }} className="mb-3 text-xl uppercase text-vino">
            {esDelivery ? "Estado del Envío" : "Estado de Preparación"}
          </Text>

          <View className="gap-y-3">
            {etapas.map((etapa, idx) => {
              const completado = !estaRechazado && indiceActual >= 0 && idx <= indiceActual;
              const activo = !estaRechazado && indiceActual >= 0 && idx === indiceActual;

              return (
                <View key={etapa.clave} className="flex-row items-center">
                  <View
                    className={`h-10 w-10 items-center justify-center rounded-full border-2 ${
                      activo
                        ? "border-mostaza bg-vino"
                        : completado
                        ? "border-emerald-600 bg-emerald-500"
                        : "border-stone-300 bg-stone-100"
                    }`}
                  >
                    {completado && !activo ? (
                      <Text className="text-lg text-white font-bold">✓</Text>
                    ) : (
                      <Image
                        source={activo ? etapa.iconoActivo : etapa.iconoPendiente}
                        className="h-6 w-6"
                        resizeMode="contain"
                      />
                    )}
                  </View>

                  <View className="ml-3 flex-1">
                    <Text
                      className={`text-s font-bold ${
                        activo ? "text-vino" : completado ? "text-emerald-700" : "text-stone-400"
                      }`}
                    >
                      {etapa.titulo}
                    </Text>
                    <Text className="text-sm text-stone-500">{etapa.descripcion}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Mapa con la ruta restaurante → domicilio */}
        {tieneCoords && (
          <View className="mb-4 rounded-2xl border border-mostaza/70 bg-white p-3 shadow-sm">
            <Text style={{ fontFamily: "LaOriental" }} className="mb-2 text-lg uppercase text-vino">
              Ruta de entrega
            </Text>
            <DeliveryMap
              mode="route"
              latitude={latDestino}
              longitude={lngDestino}
              height={240}
            />
            <Text className="mt-2 text-[11px] text-stone-500" numberOfLines={2}>
              🏮 Jardín Imperial → 🏠 {direccionEntrega}
            </Text>
          </View>
        )}

        {/* Acciones de delivery */}
        {esDelivery && (estaEnCamino || estaEntregado) && (
          <View className="mb-4 flex-row gap-2">
            <TouchableOpacity
              onPress={() => scrollRef.current?.scrollToEnd({ animated: true })}
              className="flex-1 items-center justify-center rounded-2xl border-2 border-mostaza bg-vino py-2.5 active:bg-terracota"
            >
              <Text
                style={{ fontFamily: "LaOriental" }}
                className="text-xs uppercase tracking-wide text-mostaza"
              >
                Ver ruta
              </Text>
            </TouchableOpacity>

            {onAbrirChatRepartidor && (
              <TouchableOpacity
                onPress={() =>
                  onAbrirChatRepartidor(
                    pedidoId,
                    direccionEntrega,
                    pedido?.created_at ?? null
                  )
                }
                className="flex-1 flex-row items-center justify-center rounded-2xl border-2 border-vino bg-mostaza py-2.5 active:bg-mostaza/80"
              >
                <Image
                  source={require("../../assets/images/chat-v.png")}
                  className="mr-1.5 h-5 w-5"
                  resizeMode="contain"
                />
                <Text
                  style={{ fontFamily: "LaOriental" }}
                  className="text-xs uppercase tracking-wide text-vino"
                >
                  Chat repartidor
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Resumen del pedido */}
        <DetallePedidoCard
          pedido={pedido}
          descuentoPct={descuentoPct}
          className="mb-2"
        />
      </ScrollView>

      {/* BOTÓN AL PIE DE LA PÁGINA */}
      <View className="py-3 border-t border-mostaza/70 px-4">
        {estaRechazado ? (
          <TouchableOpacity
            onPress={manejarEditarComanda}
            className="w-full rounded-2xl py-3.5 shadow-sm items-center justify-center bg-calabaza active:bg-terracota"
          >
            <Text
              style={{ fontFamily: "LaOriental" }}
              className="text-center text-sm uppercase tracking-wider text-white"
            >
              Editar Pedido Rechazado
            </Text>
          </TouchableOpacity>
        ) : esDelivery ? (
          estaEntregado ? (
            <TouchableOpacity
              onPress={confirmarRecepcion}
              disabled={confirmandoRecepcion}
              className={`w-full rounded-2xl py-3.5 shadow-sm items-center justify-center ${
                confirmandoRecepcion
                  ? "bg-emerald-700 opacity-70"
                  : "bg-emerald-600 active:bg-emerald-700"
              }`}
            >
              {confirmandoRecepcion ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text
                  style={{ fontFamily: "LaOriental" }}
                  className="text-center text-lg uppercase tracking-wider text-white"
                >
                  Confirmar recepción
                </Text>
              )}
            </TouchableOpacity>
          ) : estaRecibido ? (
            <TouchableOpacity
              onPress={() => onConfirmarRecepcion(pedidoId, direccionEntrega)}
              className="w-full rounded-2xl py-3.5 shadow-sm items-center justify-center bg-emerald-600 active:bg-emerald-700"
            >
              <Text
                style={{ fontFamily: "LaOriental" }}
                className="text-center text-lg uppercase tracking-wider text-white"
              >
                Pagar cuenta
              </Text>
            </TouchableOpacity>
          ) : (
            <View className="w-full rounded-2xl py-3.5 shadow-sm items-center justify-center bg-stone-300 opacity-60">
              <Text
                style={{ fontFamily: "LaOriental" }}
                className="text-center text-base uppercase tracking-wider text-stone-500"
              >
                {textoEspera}
              </Text>
            </View>
          )
        ) : (
          <TouchableOpacity
            onPress={() => onConfirmarRecepcion(pedidoId, numMesa)}
            disabled={!estaEntregado}
            className={`w-full rounded-2xl py-3.5 shadow-sm items-center justify-center ${
              estaEntregado
                ? "bg-emerald-600 active:bg-emerald-700"
                : "bg-stone-300 opacity-60"
            }`}
          >
            <Text
              style={{ fontFamily: "LaOriental" }}
              className={`text-center text-lg uppercase tracking-wider ${
                estaEntregado ? "text-white" : "text-stone-500"
              }`}
            >
              {estaEntregado ? "Pagar cuenta" : "Esperando Entrega..."}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* MODAL EMERGENTE DE RECHAZO CON MOTIVO */}
      <Modal visible={modalRechazoVisible} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/80 px-6">
          <View className="w-full max-w-sm rounded-3xl border border-red-500 bg-vino p-6 shadow-2xl">
            <Text
              style={{ fontFamily: "LaOriental" }}
              className="text-center text-2xl text-red-400 uppercase"
            >
              {esDelivery ? "Pedido Rechazado" : "Comanda Rechazada"}
            </Text>

            <View className="my-4 rounded-xl bg-black/40 p-4 border border-red-500/30">
              <Text className="text-xs uppercase text-amber-200/70 font-bold mb-1">
                {esDelivery ? "Motivo de la administración:" : "Motivo del mozo:"}
              </Text>
              <Text className="text-sm font-semibold text-white leading-relaxed">
                "{motivoRechazo}"
              </Text>
            </View>

            <Text className="text-center text-xs text-amber-100/90 mb-5">
              Su carrito se conservó con todos los productos para que pueda realizar las modificaciones solicitadas.
            </Text>

            <TouchableOpacity
              onPress={manejarEditarComanda}
              className="w-full items-center rounded-xl bg-mostaza py-3.5 shadow active:bg-mostaza/80"
            >
              <Text
                style={{ fontFamily: "LaOriental" }}
                className="text-center text-sm uppercase text-vino font-black"
              >
                Modificar Pedido
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <FeedbackModal
        visible={feedback.visible}
        tipo={feedback.tipo}
        titulo={feedback.titulo}
        mensaje={feedback.mensaje}
        onClose={() => setFeedback((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
}
