// src/screens/carritoScreen.tsx
import React, { useState, useRef, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, Image, Alert, ActivityIndicator, Modal } from "react-native";
import { useCart, ItemCarrito } from "../context/carritoContext";
import { ConfirmModal } from "../components/ConfirmModal";
import { CompanySpinner } from "../components/CompanySpinner";
import { FeedbackModal } from "../components/FeedbackModal";
import { crearPedidoApi, modificarPedidoRechazadoApi, Pedido } from "../services/pedidosService";
import { supabase } from "../config/supabase";

interface CarritoScreenProps {
  numeroMesa: number;
  clienteId: string;
  onVolver: () => void;
  onPedidoConfirmado: (pedido: Pedido) => void;
  /** Pedido rechazado que se está corrigiendo. Si viene definido, el envío
   *  corrige esa orden en vez de crear una nueva. */
  pedidoIdEnEdicion?: string | null;
  motivoRechazo?: string | null;
  onCerrarEdicion?: () => void;
}

export function CarritoScreen({
  numeroMesa,
  clienteId,
  onVolver,
  onPedidoConfirmado,
  pedidoIdEnEdicion,
  motivoRechazo,
  onCerrarEdicion,
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

  const modoEdicion = Boolean(pedidoIdEnEdicion);

  const [enviando, setEnviando] = useState(false);
  const [modalEsperaMozo, setModalEsperaMozo] = useState(false);
  const [pedidoCreado, setPedidoCreado] = useState<Pedido | null>(null);
  const [confirmandoVaciar, setConfirmandoVaciar] = useState(false);
  const [vaciando, setVaciando] = useState(false);
  const [itemAEliminar, setItemAEliminar] = useState<ItemCarrito | null>(null);
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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canalRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const detenerSeguimiento = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (canalRef.current) {
      supabase.removeChannel(canalRef.current);
      canalRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (vaciarTimerRef.current) clearTimeout(vaciarTimerRef.current);
      detenerSeguimiento();
    };
  }, []);

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

  /**
   * Reacción común al polling y a Realtime. Al ser rechazado el pedido se
   * navega al seguimiento (no se queda en un toast) para que el cliente lea
   * el motivo y pueda corregir la comanda desde ahí.
   */
  const manejarCambioEstado = (
    estado: string,
    motivo: string | null | undefined,
    pedidoId: string
  ) => {
    if (estado === "in_preparation") {
      detenerSeguimiento();
      setModalEsperaMozo(false);
      onPedidoConfirmado({ id: pedidoId, status: "in_preparation" } as Pedido);
      return;
    }

    if (estado === "cancelled") {
      detenerSeguimiento();
      setModalEsperaMozo(false);
      onPedidoConfirmado({
        id: pedidoId,
        status: "cancelled",
        rejection_reason: motivo || "El mozo no pudo confirmar tu pedido.",
      } as Pedido);
    }
  };

  const handleRealizarPedido = async () => {
    if (carrito.length === 0) {
      abrirAviso(
        modoEdicion ? "Comanda vacía" : "Carrito Vacío",
        modoEdicion
          ? "No podés reenviar una comanda vacía. Volvé a agregar productos o cancelá la edición."
          : "Agregá productos antes de confirmar el pedido.",
        "informacion"
      );
      return;
    }

    setEnviando(true);
    try {
      const productosPayload = carrito.map((item) => ({
        id_producto: item.id,
        cantidad: Number(item.cantidad),
      }));

      let orden: Pedido;
      let pedidoId: string;

      if (modoEdicion && pedidoIdEnEdicion) {
        // Corrige la orden rechazada: el backend reemplaza los ítems y la
        // devuelve a 'pending' para que el mozo vuelva a confirmarla.
        const res = await modificarPedidoRechazadoApi(pedidoIdEnEdicion, {
          productos: productosPayload,
        });
        orden = res.pedido;
        pedidoId = orden.id;
      } else {
        const resBackend: any = await crearPedidoApi({
          id_cliente: clienteId,
          numero_mesa: Number(numeroMesa),
          productos: productosPayload,
          order_type: "dine_in",
        });

        orden = resBackend?.pedido || resBackend;
        pedidoId = orden.id;
      }

      if (!pedidoId) {
        throw new Error("No se pudo identificar el pedido.");
      }

      setPedidoCreado(orden);
      setModalEsperaMozo(true);
      vaciarCarrito();

      // Suscripción Realtime con el ID exacto
      canalRef.current = supabase
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
            manejarCambioEstado(
              pedidoActualizado.status,
              pedidoActualizado.rejection_reason,
              pedidoId
            );
          }
        )
        .subscribe();

      // Polling de respaldo cada 2.5s para no depender únicamente del websocket
      pollRef.current = setInterval(async () => {
        try {
          const { data: ordenActual } = await supabase
            .from("orders")
            .select("id, status, rejection_reason")
            .eq("id", pedidoId)
            .maybeSingle();

          if (ordenActual) {
            manejarCambioEstado(
              ordenActual.status,
              ordenActual.rejection_reason,
              ordenActual.id
            );
          }
        } catch {
          // Ignorado en microcorte
        }
      }, 2500);
    } catch (err: any) {
      abrirAviso(
        modoEdicion ? "Error al reenviar el pedido" : "Error al enviar pedido",
        err.message || "Intente nuevamente.",
        "error"
      );
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
        mensaje: modoEdicion
          ? "Quitaste todos los productos. Agregá algo de nuevo para poder reenviar la comanda."
          : "Se eliminaron todos los productos de tu pedido.",
      });
    }, 800);
  };

  const cancelarVaciar = () => {
    setConfirmandoVaciar(false);
  };

  const confirmarEliminarItem = () => {
    if (itemAEliminar) eliminarDelCarrito(itemAEliminar.id);
    setItemAEliminar(null);
  };

  const cancelarEliminarItem = () => setItemAEliminar(null);

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
            onPress={() => setItemAEliminar(item)}
            className="rounded-lg bg-terracota/20 px-2 py-0.5 mb-2 active:bg-terracota/40"
          >
            <Text className="text-[10px] font-bold text-terracota">✕</Text>
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

      {/* Aviso de edición de comanda rechazada */}
      {modoEdicion && (
        <View className="mb-3 rounded-2xl border-2 border-red-300 bg-red-50 p-3">
          <View className="flex-row items-center justify-between">
            <Text className="flex-1 text-xs font-black uppercase text-red-800">
              Editando comanda rechazada
            </Text>
            {onCerrarEdicion && (
              <TouchableOpacity
                onPress={onCerrarEdicion}
                className="ml-2 rounded-lg bg-red-200/60 px-2 py-1 active:bg-red-200"
              >
                <Text className="text-[10px] font-bold text-red-800">Cancelar</Text>
              </TouchableOpacity>
            )}
          </View>
          {motivoRechazo && (
            <Text className="mt-1 text-[11px] text-red-700">
              Motivo del mozo: {motivoRechazo}
            </Text>
          )}
        </View>
      )}

      {/* Encabezado */}
      <View className="relative flex-row items-center justify-between mb-5 border-b border-mostaza/20 pb-5">
        <Text style={{ fontFamily: "LaOriental" }} className="absolute inset-x-0 z-10 text-center text-xl uppercase text-vino pointer-events-none pb-3">
          {modoEdicion ? "Reenviar pedido" : `Pedido Mesa #${numeroMesa}`}
        </Text>
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
              {modoEdicion
                ? "No podés reenviar una comanda vacía. Agregá productos o tocá Cancelar para volver."
                : "Agregá platos o bebidas desde la carta para armar tu pedido."}
            </Text>
          </View>
        }
      />

      {/* Resumen final y botón de envío de comanda */}
      {carrito.length > 0 && (
        <View className="border-t border-mostaza/30 pt-3 pb-4">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-sm font-medium text-stone-600">Tiempo de preparación estimado:</Text>
            <Text className="text-sm font-bold text-vino">⏱ {tiempoEstimadoTotal} min</Text>
          </View>

          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-bold text-stone-800">Total pedido:</Text>
            <Text className="text-3xl font-black text-calabaza">${total.toLocaleString("es-AR")}</Text>
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
                  {modoEdicion ? "Reenviar Comanda al Mozo" : "Enviar Pedido al Mozo"}
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

      {/* MODAL DE ESPERA: ESPERANDO CONFIRMACIÓN DEL MOZO */}
      <Modal visible={modalEsperaMozo} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/80 px-6">
          <View className="w-full max-w-sm rounded-3xl border-2 border-mostaza bg-vino p-6 shadow-2xl items-center">
            <ActivityIndicator size="large" color="#E5B25D" className="mb-3" />
            <Text
              style={{ fontFamily: "LaOriental" }}
              className="text-xl uppercase text-mostaza text-center"
            >
              Esperando confirmación
            </Text>
            <Text className="mt-2 text-center text-xs text-amber-100/90 leading-relaxed">
              Tu pedido para la <Text className="font-bold text-mostaza">Mesa #{numeroMesa}</Text> fue recibido.
            </Text>
            <Text className="mt-2 text-center text-[11px] text-amber-200/70">
              El pedido necesita confirmación del mozo para comenzar a ser preparado.
            </Text>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={confirmandoVaciar}
        titulo="Vaciar carrito"
        mensaje={
          modoEdicion
            ? "¿Desea quitar todos los productos? Tu comanda rechazada no se modifica hasta que la reenvíes, y no podrás enviarla vacía."
            : "¿Desea vaciar el carrito? Se eliminarán todos los productos de tu pedido."
        }
        textoConfirmar="Vaciar"
        textoCancelar="Cancelar"
        tipo="peligro"
        cargando={vaciando}
        onConfirm={confirmarVaciar}
        onCancel={cancelarVaciar}
      />

      <ConfirmModal
        visible={itemAEliminar !== null}
        tipo="peligro"
        titulo="¿Quitar producto?"
        mensaje={
          <>
            ¿Deseas quitar{" "}
            <Text className="font-bold text-mostaza">{itemAEliminar?.nombre}</Text> del carrito?
          </>
        }
        textoConfirmar="Sí, quitar"
        textoCancelar="Cancelar"
        onConfirm={confirmarEliminarItem}
        onCancel={cancelarEliminarItem}
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