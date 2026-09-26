// src/screens/carritoScreen.tsx
import React, { useState, useRef, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, Image, Alert, ActivityIndicator, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCart, ItemCarrito } from "../context/carritoContext";
import { ConfirmModal } from "../components/ConfirmModal";
import { CompanySpinner } from "../components/CompanySpinner";
import { FeedbackModal } from "../components/FeedbackModal";
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
  const insets = useSafeAreaInsets();
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
  const [confirmandoVaciar, setConfirmandoVaciar] = useState(false);
  const [vaciando, setVaciando] = useState(false);
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
  const vaciarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    return () => {
      if (vaciarTimerRef.current) clearTimeout(vaciarTimerRef.current);
    };
  }, []);

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

  const confirmarVaciar = () => {
    setConfirmandoVaciar(false);
    setVaciando(true);
    vaciarTimerRef.current = setTimeout(() => {
      vaciarCarrito();
      setVaciando(false);
      setModalFeedback({
        visible: true,
        tipo: "exito",
        titulo: "¡Carrito vaciado!",
        mensaje: "Se eliminaron todos los productos de tu pedido.",
      });
    }, 800);
  };

  const cancelarVaciar = () => {
    setConfirmandoVaciar(false);
  };

  const renderItem = ({ item }: { item: ItemCarrito }) => {
    const fotoPrincipal = item.fotos && item.fotos.length > 0 ? item.fotos[0] : null;

    return (
      <View className="mb-3 flex-row items-center rounded-2xl bg-white p-3 shadow-md border border-mostaza/30">
        {/* Foto miniatura o fallback con emoji */}
        {fotoPrincipal ? (
          <Image
            source={{ uri: fotoPrincipal }}
            className="h-16 w-16 rounded-xl"
            resizeMode="cover"
          />
        ) : (
          <View className="h-16 w-16 rounded-xl bg-stone-100 items-center justify-center border border-stone-200">
            <Text className="text-2xl">{item.categoria === "dish" ? "🍲" : "🍹"}</Text>
          </View>
        )}

        {/* Detalles del ítem */}
        <View className="ml-3 flex-1 justify-between">
          <Text className="font-bold text-vino text-sm" numberOfLines={1}>
            {item.nombre}
          </Text>
          <Text className="text-[11px] text-stone-500">⏱ {item.tiempoElaboracion} min</Text>

          <Text className="text-xs font-semibold text-stone-700 mt-1">
            ${item.precio} x {item.cantidad} ={" "}
            <Text className="font-black text-calabaza">${item.precio * item.cantidad}</Text>
          </Text>
        </View>

        {/* Controles: Botón quitar directo + Control [- cant +] */}
        <View className="items-end justify-between pl-2">
          <TouchableOpacity
            onPress={() => eliminarDelCarrito(item.id)}
            className="rounded-lg bg-terracota/20 px-2 py-0.5 mb-2 active:bg-terracota/40"
          >
            <Text className="text-[10px] font-bold text-terracota">✕ Quitar</Text>
          </TouchableOpacity>

          <View className="flex-row items-center bg-stone-100 rounded-xl px-1 py-1 border border-stone-200">
            {/* Botón Restar */}
            <TouchableOpacity
              onPress={() => restarDelCarrito(item.id)}
              className="h-6 w-6 items-center justify-center rounded-lg bg-stone-200 active:bg-stone-300"
            >
              <Text className="text-sm font-black text-stone-700">−</Text>
            </TouchableOpacity>

            {/* Cantidad */}
            <Text className="text-xs font-black text-vino px-2.5">
              {item.cantidad}
            </Text>

            {/* Botón Sumar */}
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

  return (
    <View className="flex-1 px-6 pt-4 bg-amber-50/40">
      {/* Nombres del equipo */}
      <View className="absolute right-4 z-10 items-end" style={{ top: insets.top + 16 }}>
        <Text className="text-[10px] text-vino/70">Rocío Sanchez</Text>
        <Text className="text-[10px] text-vino/70">Santino Casado</Text>
        <Text className="text-[10px] text-vino/70">Sebastián Andreozzi</Text>
        <Text className="text-[10px] text-vino/70">Valentín Brazanovich</Text>
      </View>

      {/* Cabecera */}
      <View className="mb-2">
        <Image
          source={require("../../assets/images/logo-name.png")}
          className="h-16 w-auto self-center"
          resizeMode="contain"
        />
        <Image
          source={require("../../assets/images/separator.png")}
          className="my-2 h-5 w-full"
          resizeMode="contain"
        />
      </View>

      {/* Encabezado */}
      <View className="relative flex-row items-center justify-between mb-1 border-b border-mostaza/20 pb-5">
        <Text style={{ fontFamily: "LaOriental" }} className="absolute inset-x-0 z-10 text-center text-xl uppercase text-vino pointer-events-none pb-3">
          Comanda Mesa #{numeroMesa}
        </Text>
        <Text className="text-sm font-bold text-vino">🛒</Text>
        {carrito.length > 0 ? (
          <TouchableOpacity onPress={() => setConfirmandoVaciar(true)} className="ml-auto h-8 items-center justify-center rounded-xl bg-terracota/10 px-3 active:bg-terracota/20 z-20">
            <Text className="text-terracota text-xs font-bold">Vaciar</Text>
          </TouchableOpacity>
        ) : (
          <View className="ml-auto h-8" />
        )}
      </View>

      {/* Lista de productos en la comanda */}
      <FlatList
        data={carrito}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="items-center justify-center py-24">
            <Image
              source={require("../../assets/images/cart-y.png")}
              className="h-16 w-16 mb-3"
              resizeMode="contain"
            />
            <Text style={{ fontFamily: "LaOriental" }} className="text-lg uppercase text-vino">
              Tu comanda está vacía
            </Text>
            <Text className="text-xs text-stone-500 mt-1">
              Agregá platos o bebidas desde la carta para armar tu pedido.
            </Text>
          </View>
        }
      />

      {/* Resumen final y botón de envío de comanda */}
      {carrito.length > 0 && (
        <View className="border-t border-mostaza/30 pt-3 pb-4">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-xs font-medium text-stone-600">Tiempo de preparación estimado:</Text>
            <Text className="text-xs font-bold text-vino">⏱ {tiempoEstimadoTotal} min</Text>
          </View>

          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-base font-bold text-stone-800">Total pedido:</Text>
            <Text className="text-2xl font-black text-calabaza">${total.toLocaleString("es-AR")}</Text>
          </View>

          <TouchableOpacity
            disabled={enviando}
            onPress={handleRealizarPedido}
            className="flex-row items-center justify-center rounded-2xl border border-amber-400/40 bg-vino py-3 active:bg-terracota shadow-md"
          >
            {enviando ? (
              <ActivityIndicator size="small" color="#E5B25D" />
            ) : (
              <>
                <Image
                  source={require("../../assets/images/sello.png")}
                  className="h-7 w-7"
                  resizeMode="contain"
                />
                <Text style={{ fontFamily: "LaOriental" }} className="mx-5 text-center text-l uppercase tracking-wider text-mostaza">
                  Enviar Pedido al Mozo
                </Text>
                <Image
                  source={require("../../assets/images/sello.png")}
                  className="h-7 w-7"
                  resizeMode="contain"
                />
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom padding for safe area */}
      <View style={{ height: insets.bottom }} />

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

      <ConfirmModal
        visible={confirmandoVaciar}
        titulo="Vaciar carrito"
        mensaje="¿Desea vaciar el carrito? Se eliminarán todos los productos de tu pedido."
        textoConfirmar="Vaciar"
        textoCancelar="Cancelar"
        tipo="peligro"
        cargando={vaciando}
        onConfirm={confirmarVaciar}
        onCancel={cancelarVaciar}
      />

      <CompanySpinner visible={vaciando} mensaje="Vaciando carrito..." />

      <FeedbackModal
        visible={modalFeedback.visible}
        tipo={modalFeedback.tipo}
        titulo={modalFeedback.titulo}
        mensaje={modalFeedback.mensaje}
        onClose={() => setModalFeedback((p) => ({ ...p, visible: false }))}
      />
    </View>
  );
}