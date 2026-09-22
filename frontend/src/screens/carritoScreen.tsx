import { notificarMozos } from "../services/pushNotificationClientService";
import { FeedbackModal } from "../components/FeedbackModal";
import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCart, ItemCarrito } from "../context/carritoContext";
import { crearPedidoApi, Pedido } from "../services/pedidosService";
import { supabase } from "../config/supabase";

interface CarritoScreenProps {
  numeroMesa: number;
  clienteId: string;
  onVolver: () => void;
  onPedidoConfirmado: (pedido: Pedido) => void;
}

export function CarritoScreen({
  numeroMesa,
  clienteId,
  onVolver,
  onPedidoConfirmado,
}: CarritoScreenProps) {
  const {
    carrito,
    eliminarDelCarrito,
    agregarAlCarrito,
    restarDelCarrito,
    total,
    tiempoEstimadoTotal,
    vaciarCarrito,
  } = useCart();

  const [enviando, setEnviando] = useState(false);
  const [modalEsperaMozo, setModalEsperaMozo] = useState(false);
  const [pedidoCreado, setPedidoCreado] = useState<Pedido | null>(null);

const handleRealizarPedido = async () => {
    if (carrito.length === 0) {
      abrirAviso("Carrito Vacío", "Agregá productos antes de confirmar el pedido.", "informacion");
      return;
    }

    setEnviando(true);
    try {
      const productosPayload = carrito.map((item) => ({
        id_producto: item.id,
        cantidad: Number(item.cantidad),
      }));

      const resBackend: any = await crearPedidoApi({
        id_cliente: clienteId,
        numero_mesa: Number(numeroMesa),
        productos: productosPayload,
        order_type: "dine_in",
      });

      // Se extrae la orden real enviada por el backend
      const orden: Pedido = resBackend?.pedido || resBackend;
      const pedidoId = orden.id;

      if (!pedidoId) {
        throw new Error("No se pudo identificar el pedido creado.");
      }

      await notificarMozos(
        `🍽️ Nuevo Pedido - Mesa #${numeroMesa}`,
        `Comanda por $${total.toLocaleString("es-AR")} lista para ser revisada y confirmada.`,
        { order_id: pedidoId, table_id: orden.table_id }
      );

      setPedidoCreado(orden);
      setModalEsperaMozo(true);
      vaciarCarrito();

      // Polling de respaldo cada 2.5s para no depender únicamente del websocket
      const timer = setInterval(async () => {
        try {
          const { data: ordenActual } = await supabase
            .from("orders")
            .select("id, status, rejection_reason")
            .eq("id", pedidoId)
            .maybeSingle();

          if (ordenActual) {
            if (ordenActual.status === "in_preparation" || ordenActual.status === "confirmed") {
              clearInterval(timer);
              supabase.removeChannel(canal);
              setModalEsperaMozo(false);
              onPedidoConfirmado(ordenActual as any);
            } else if (ordenActual.status === "cancelled") {
              clearInterval(timer);
              supabase.removeChannel(canal);
              setModalEsperaMozo(false);
              abrirAviso(
                "Pedido Cancelado",
                ordenActual.rejection_reason || "El mozo no pudo confirmar tu pedido.",
                "error"
              );
            }
          }
        } catch {
          // Ignorado en microcorte
        }
      }, 2500);

      // Suscripción Realtime con el ID exacto
      const canal = supabase
        .channel(`pedido_${pedidoId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "orders",
            filter: `id=eq.${pedidoId}`,
          },
          (payload) => {
            const pedidoActualizado = payload.new as Pedido;
            if (
              pedidoActualizado.status === "in_preparation" ||
              pedidoActualizado.status === "confirmed"
            ) {
              clearInterval(timer);
              supabase.removeChannel(canal);
              setModalEsperaMozo(false);
              onPedidoConfirmado(pedidoActualizado);
            } else if (pedidoActualizado.status === "cancelled") {
              clearInterval(timer);
              supabase.removeChannel(canal);
              setModalEsperaMozo(false);
              abrirAviso(
                "Pedido Cancelado",
                pedidoActualizado.rejection_reason || "El mozo no pudo confirmar tu pedido en este momento.",
                "error"
              );
            }
          }
        )
        .subscribe();
    } catch (err: any) {
      abrirAviso("Error al enviar pedido", err.message || "Intente nuevamente.", "error");
    } finally {
      setEnviando(false);
    }
  };

  const renderItem = ({ item }: { item: ItemCarrito }) => {
    const fotoPrincipal = item.fotos && item.fotos.length > 0 ? item.fotos[0] : null;

    return (
      <View className="mb-3 flex-row items-center rounded-2xl border border-mostaza/30 bg-white p-3 shadow-md">
        {fotoPrincipal ? (
          <Image
            source={{ uri: fotoPrincipal }}
            className="h-16 w-16 rounded-xl"
            resizeMode="cover"
          />
        ) : (
          <View className="h-16 w-16 items-center justify-center rounded-xl border border-stone-200 bg-stone-100">
            <Text className="text-2xl">{item.categoria === "dish" ? "🍲" : "🍹"}</Text>
          </View>
        )}

        <View className="ml-3 flex-1 justify-between">
          <Text className="text-sm font-bold text-vino" numberOfLines={1}>
            {item.nombre}
          </Text>
          <Text className="text-[11px] text-stone-500">⏱ {item.tiempoElaboracion} min</Text>
          <Text className="mt-1 text-xs font-semibold text-stone-700">
            ${item.precio} x {item.cantidad} ={" "}
            <Text className="font-black text-calabaza">
              ${item.precio * item.cantidad}
            </Text>
          </Text>
        </View>

        <View className="items-end justify-between pl-2">
          <TouchableOpacity
            onPress={() => eliminarDelCarrito(item.id)}
            className="mb-2 rounded-lg bg-terracota/20 px-2 py-0.5 active:bg-terracota/40"
          >
            <Text className="text-[10px] font-bold text-terracota">✕ Quitar</Text>
          </TouchableOpacity>

          <View className="flex-row items-center rounded-xl border border-stone-200 bg-stone-100 px-1 py-1">
            <TouchableOpacity
              onPress={() => restarDelCarrito(item.id)}
              className="h-6 w-6 items-center justify-center rounded-lg bg-stone-200 active:bg-stone-300"
            >
              <Text className="text-sm font-black text-stone-700">−</Text>
            </TouchableOpacity>

            <Text className="px-2.5 text-xs font-black text-vino">
              {item.cantidad}
            </Text>

            <TouchableOpacity
              onPress={() => agregarAlCarrito(item)}
              className="h-6 w-6 items-center justify-center rounded-lg bg-vino active:bg-terracota"
            >
              <Text className="text-sm font-black text-mostaza">＋</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // Estado para el modal de feedback
  const [modalFeedback, setModalFeedback] = useState<{
    visible: boolean;
    tipo: "exito" | "error" | "informacion";
    titulo: string;
    mensaje: string;
  }>({
    visible: false,
    tipo: "informacion",
    titulo: "",
    mensaje: "",
  });

  const abrirAviso = (
    titulo: string,
    mensaje: string,
    tipo: "exito" | "error" | "informacion" = "informacion"
  ) => {
    setModalFeedback({
      visible: true,
      tipo,
      titulo,
      mensaje,
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-amber-50 px-4 pt-2">
      {/* Header */}
      <View className="mb-4 flex-row items-center justify-between border-b border-mostaza/30 pb-3">
        <TouchableOpacity onPress={onVolver} className="px-2 py-1">
          <Text className="font-bold text-vino">← Volver</Text>
        </TouchableOpacity>

        <View className="items-center">
          <Text style={{ fontFamily: "LaOriental" }} className="text-xl uppercase text-vino">
            Comanda Mesa #{numeroMesa}
          </Text>
          <Text className="text-[10px] font-bold text-stone-500">
            Todos los comensales
          </Text>
        </View>

        {carrito.length > 0 ? (
          <TouchableOpacity onPress={vaciarCarrito} className="px-2 py-1">
            <Text className="text-xs font-bold text-terracota">Vaciar</Text>
          </TouchableOpacity>
        ) : (
          <View className="w-12" />
        )}
      </View>

      {/* Lista de productos */}
      <FlatList
        data={carrito}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="items-center justify-center py-24">
            <Text className="mb-3 text-5xl">🛒</Text>
            <Text style={{ fontFamily: "LaOriental" }} className="text-lg uppercase text-vino">
              Tu comanda está vacía
            </Text>
            <Text className="mt-1 text-xs text-stone-500">
              Agregá platos o bebidas desde la carta para armar el pedido.
            </Text>
          </View>
        }
      />

      {/* Resumen final con importe acumulado */}
      {carrito.length > 0 && (
        <View className="border-t border-mostaza/30 bg-amber-50 pb-4 pt-3">
          <View className="mb-1 flex-row items-center justify-between">
            <Text className="text-xs font-medium text-stone-600">
              Tiempo estimado total de cocina:
            </Text>
            <Text className="text-xs font-bold text-vino">
              ⏱ ~{tiempoEstimadoTotal} min
            </Text>
          </View>

          {/* Importe acumulado */}
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-base font-bold text-stone-800">
              Importe Total Acumulado:
            </Text>
            <Text className="text-3xl font-black text-calabaza">
              ${total.toLocaleString("es-AR")}
            </Text>
          </View>

          <TouchableOpacity
            disabled={enviando}
            onPress={handleRealizarPedido}
            className="items-center rounded-2xl border-2 border-mostaza bg-vino py-3.5 shadow-md active:bg-terracota"
          >
            {enviando ? (
              <ActivityIndicator size="small" color="#E5B25D" />
            ) : (
              <Text
                style={{ fontFamily: "LaOriental" }}
                className="text-base font-bold uppercase tracking-wider text-mostaza"
              >
                Enviar Pedido al Mozo
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* MODAL DE ESPERA: ESPERANDO CONFIRMACIÓN DEL MOZO */}
      <Modal visible={modalEsperaMozo} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/80 px-6">
          <View className="w-full max-w-sm rounded-3xl border-2 border-mostaza bg-vino p-6 shadow-2xl items-center">
            <ActivityIndicator size="large" color="#E5B25D" className="mb-3" />
            <Text
              style={{ fontFamily: "LaOriental" }}
              className="text-xl uppercase text-mostaza text-center"
            >
              Esperando al Mozo
            </Text>
            <Text className="mt-2 text-center text-xs text-amber-100/90 leading-relaxed">
              Tu pedido para la <Text className="font-bold text-mostaza">Mesa #{numeroMesa}</Text> fue recibido.
            </Text>
            <Text className="mt-2 text-center text-[11px] text-amber-200/70">
              El pedido no se enviará a cocina ni barra hasta que el mozo lo confirme.
            </Text>
          </View>
        </View>
      </Modal>
      <FeedbackModal
        visible={modalFeedback.visible}
        tipo={modalFeedback.tipo}
        titulo={modalFeedback.titulo}
        mensaje={modalFeedback.mensaje}
        onClose={() => setModalFeedback((prev) => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
}