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

interface Props {
  pedidoId: string;
  onVolver: () => void;
  onIrAJuegos?: () => void;
  onConfirmarRecepcion: (pedidoId: string, numMesa: string | number) => void;
  onEditarComanda?: (motivo: string | null) => void;
}

const ETAPAS = [
  { clave: "pending", titulo: "Recibido", iconoActivo: require("../../assets/images/audit-y.png"), iconoPendiente: require("../../assets/images/audit-g.png"), descripcion: "Esperando confirmación del mozo" },
  { clave: "in_preparation", titulo: "En Cocina", iconoActivo: require("../../assets/images/chef-y.png"), iconoPendiente: require("../../assets/images/chef-g.png"), descripcion: "Preparando sus platos y bebidas" },
  { clave: "ready", titulo: "Listo", iconoActivo: require("../../assets/images/serving-y.png"), iconoPendiente: require("../../assets/images/serving-g.png"), descripcion: "Su pedido está listo para ser servido" },
  { clave: "delivered", titulo: "Servido", iconoActivo: require("../../assets/images/dish-y.png"), iconoPendiente: require("../../assets/images/dish-g.png"), descripcion: "¡A disfrutar su comida!" },
];

export function EstadoPedidoScreen({
  pedidoId,
  onVolver,
  onIrAJuegos,
  onConfirmarRecepcion,
  onEditarComanda,
}: Props) {
  const { reemplazarCarrito } = useCart();
  const [pedido, setPedido] = useState<any | null>(null);
  const [cargando, setCargando] = useState(true);
  const [modalRechazoVisible, setModalRechazoVisible] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState<string>("");
  const yaNotificoRechazoRef = useRef(false);

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
      const motivo =
        datosPedido.rejection_reason ||
        datosPedido.motivo_rechazo ||
        datosPedido.reason ||
        "El mozo rechazó la comanda. Por favor, revise y ajuste su pedido.";

      setMotivoRechazo(motivo);
      setModalRechazoVisible(true);
    }
  };

  const cargarPedido = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
           id,
           status,
           rejection_reason,
           total_amount,
           estimated_delivery_time,
           created_at,
           restaurant_tables (table_number),
           order_items (
             id,
             quantity,
             unit_price,
             products (id, name, description, price, prep_time, photos, category)
           )
        `)
        .eq("id", pedidoId)
        .single();

      if (!error && data) {
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

  if (cargando) {
    return (
      <View className="flex-1 items-center justify-center bg-amber-50">
        <ActivityIndicator size="large" color="#800020" />
      </View>
    );
  }

  const estadoActual = String(pedido?.status || "pending").toLowerCase();
  const numMesa = pedido?.restaurant_tables?.table_number ?? "S/N";
  const estaRechazado = estadoActual === "rejected" || estadoActual === "cancelled" || estadoActual === "rechazado";
  const estaEntregado = estadoActual === "delivered";
  const indiceActual = ETAPAS.findIndex((e) => e.clave === estadoActual);

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

  return (
    <View className="flex-1 bg-amber-50 px-4 pt-2">
      {/* Header */}
      <View className="mb-3 flex-row items-center justify-center border-b border-mostaza/30 pb-3">
        <View className="items-center w-full justify-center flex-col">
          <Text
            style={{ fontFamily: "LaOriental" }}
            className="text-xl uppercase text-vino text-center w-full"
          >
            Mesa #{numMesa}
          </Text>
          <Text className="text-xs font-bold text-stone-500">
            Seguimiento del pedido
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Banner de Rechazo (si está rechazado) */}
        {estaRechazado ? (
          <View className="mb-4 rounded-2xl border-2 border-red-500 bg-red-950/80 p-4 shadow-md">
            <Text className="text-xs font-bold uppercase tracking-wider text-red-300">
              ⚠️ Pedido rechazado por el mozo
            </Text>
            <Text className="mt-1 text-sm font-semibold text-white">
              Motivo: "{pedido?.rejection_reason || motivoRechazo || "Sin especificar"}"
            </Text>
            <TouchableOpacity
              onPress={manejarEditarComanda}
              className="mt-3 rounded-xl bg-mostaza py-2.5 px-4 items-center"
            >
              <Text style={{ fontFamily: "LaOriental" }} className="text-xs uppercase text-vino font-black">
                Modificar Comanda y Reenviar
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Banner Normal de Tiempo Estimado */
          <View className="mb-4 rounded-2xl border-2 border-mostaza bg-vino p-4 shadow-md">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-xs text-amber-200/80 uppercase font-semibold">
                  {estaEntregado ? "¡Pedido servido!" : "Tiempo estimado"}
                </Text>
                <Text className="text-2xl font-black text-mostaza">
                  {estaEntregado ? "¡En tu mesa!" : `⏱ ~${pedido?.estimated_delivery_time || 15} min`}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Línea de Etapas / Progreso */}
        <View className="mb-4 rounded-2xl border border-mostaza/30 bg-white p-4 shadow-sm">
          <Text style={{ fontFamily: "LaOriental" }} className="mb-3 text-sm uppercase text-vino">
            Estado de Preparación
          </Text>

          <View className="gap-y-3">
            {ETAPAS.map((etapa, idx) => {
              const completado = !estaRechazado && indiceActual >= 0 && idx <= indiceActual;
              const activo = !estaRechazado && indiceActual >= 0 && idx === indiceActual;

              return (
                <View key={etapa.clave} className="flex-row items-center">
                  <View
                    className={`h-8 w-8 items-center justify-center rounded-full border-2 ${
                      activo
                        ? "border-mostaza bg-vino"
                        : completado
                        ? "border-emerald-600 bg-emerald-500"
                        : "border-stone-300 bg-stone-100"
                    }`}
                  >
                    {completado && !activo ? (
                      <Text className="text-xs text-white font-bold">✓</Text>
                    ) : (
                      <Image
                        source={activo ? etapa.iconoActivo : etapa.iconoPendiente}
                        className="h-4 w-4"
                        resizeMode="contain"
                      />
                    )}
                  </View>

                  <View className="ml-3 flex-1">
                    <Text
                      className={`text-xs font-bold ${
                        activo ? "text-vino" : completado ? "text-emerald-700" : "text-stone-400"
                      }`}
                    >
                      {etapa.titulo}
                    </Text>
                    <Text className="text-[10px] text-stone-500">{etapa.descripcion}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Resumen de la Comanda */}
        <View className="mb-2 rounded-2xl border border-mostaza/30 bg-white p-4 shadow-sm">
          <Text style={{ fontFamily: "LaOriental" }} className="mb-2 text-sm uppercase text-vino">
            Detalle del Pedido
          </Text>

          {(pedido?.order_items || []).map((it: any) => (
            <View key={it.id} className="flex-row justify-between border-b border-stone-100 py-1.5">
              <Text className="text-xs font-semibold text-stone-800">
                {it.quantity}x {it.products?.name}
              </Text>
              <Text className="text-xs font-bold text-calabaza">
                ${Number(it.unit_price) * it.quantity}
              </Text>
            </View>
          ))}

          <View className="mt-2 flex-row justify-between pt-2 border-t border-mostaza/20">
            <Text className="text-xs font-bold text-vino">TOTAL</Text>
            <Text className="text-base font-black text-calabaza">
              ${Number(pedido?.total_amount || 0).toLocaleString("es-AR")}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* BOTÓN AL PIE DE LA PÁGINA */}
      <View className="py-3 border-t border-mostaza/20 bg-amber-50">
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
              className={`text-center text-sm uppercase tracking-wider ${
                estaEntregado ? "text-white" : "text-stone-500"
              }`}
            >
              {estaEntregado ? "Pasar a pagar" : "Esperando Entrega..."}
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
              Comanda Rechazada
            </Text>

            <View className="my-4 rounded-xl bg-black/40 p-4 border border-red-500/30">
              <Text className="text-xs uppercase text-amber-200/70 font-bold mb-1">
                Motivo del mozo:
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