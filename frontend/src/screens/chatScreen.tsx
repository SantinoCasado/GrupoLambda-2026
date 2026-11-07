import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
} from "react-native";
import {
  KeyboardChatScrollView,
  KeyboardStickyView,
} from "../components/keyboardControllerCompat";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../config/supabase";
import {
  obtenerMensajesChat,
  enviarMensajeChat,
  MensajeChat,
} from "../services/chatService";

import type { ScrollViewProps } from "react-native";
import type { KeyboardChatScrollViewProps } from "../components/keyboardControllerCompat";

/**
 * Adapta `KeyboardChatScrollView` (un ScrollView) para poder usarlo como el
 * componente de scroll de un `FlatList`. Así conservamos la virtualización de
 * los mensajes y dejamos que la librería calcule el offset del teclado de
 * forma nativa (sin la matemática de `KeyboardAvoidingView`, que provocaba que
 * la barra quedara tapada en Android).
 */
const ChatScrollView = React.forwardRef<
  React.ComponentRef<typeof KeyboardChatScrollView>,
  KeyboardChatScrollViewProps
>(function ChatScrollView(props, ref) {
  // El ScrollView termina por encima de la barra de entrada y del inset
  // inferior de la pantalla, así que hay que descontar ese inset del empuje
  // que aplica el teclado.
  const { bottom } = useSafeAreaInsets();

  return (
    <KeyboardChatScrollView
      ref={ref}
      automaticallyAdjustContentInsets={false}
      contentInsetAdjustmentBehavior="never"
      offset={bottom}
      {...props}
    />
  );
});

interface Props {
  tableId?: string;
  numeroMesa?: number;
  /** Pedido a domicilio al que pertenece el chat. */
  orderId?: string;
  /** Activa el encabezado y el contrato de chat de delivery. */
  modoDelivery?: boolean;
  direccionEntrega?: string;
  fechaPedido?: string | null;
  usuarioActual: {
    id: string;
    nombres: string;
    apellidos: string;
    perfil: string;
  };
  onVolver: () => void;
}

const formatearFecha = (iso?: string | null) => {
  if (!iso) return "";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "";
  return `${fecha.toLocaleDateString([], {
    day: "2-digit",
    month: "2-digit",
  })} ${fecha.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
};

const minutosDesde = (iso?: string | null) => {
  if (!iso) return 0;
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - fecha.getTime()) / 60_000));
};

export function ChatMozoScreen({
  tableId,
  numeroMesa,
  orderId,
  modoDelivery = false,
  direccionEntrega,
  fechaPedido,
  usuarioActual,
  onVolver,
}: Props) {
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [tick, setTick] = useState(0);

  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();
  const esMozo = usuarioActual.perfil === "mozo";
  const soyCliente = usuarioActual.perfil.startsWith("cliente");

  const filtro = modoDelivery
    ? { orderId: orderId || null }
    : { tableId: tableId || null };

  const filtroRealtime = modoDelivery
    ? `order_id=eq.${orderId}`
    : `table_id=eq.${tableId}`;

  // Mantiene actualizado el contador de minutos del encabezado de delivery.
  useEffect(() => {
    if (!modoDelivery) return;
    const intervalo = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(intervalo);
  }, [modoDelivery]);

  const cargarHistorial = useCallback(async () => {
    try {
      setCargando(true);
      const data = await obtenerMensajesChat(filtro);
      setMensajes(data);
    } catch (err: any) {
      console.warn("Error cargando mensajes:", err.message);
    } finally {
      setCargando(false);
    }
  }, [modoDelivery ? orderId : tableId]);

  useEffect(() => {
    // Sin mesa ni pedido no hay conversación que cargar.
    if (modoDelivery ? !orderId : !tableId) {
      setCargando(false);
      return;
    }

    cargarHistorial();

    // Suscripción Realtime a la tabla 'chats' filtrada por mesa o pedido.
    const canal = supabase
      .channel(
        modoDelivery ? `chat_delivery_${orderId}` : `chat_mesa_${tableId}`
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chats",
          filter: filtroRealtime,
        },
        (payload) => {
          const nuevo = payload.new as MensajeChat;
          setMensajes((prev) => {
            if (prev.some((m) => m.id === nuevo.id)) return prev;
            return [...prev, nuevo];
          });
          setTimeout(
            () => flatListRef.current?.scrollToEnd({ animated: true }),
            100
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [tableId, orderId, modoDelivery, filtroRealtime, cargarHistorial]);

  const handleEnviar = async () => {
    if (!texto.trim() || enviando) return;

    const mensajeAEnviar = texto.trim();
    setTexto("");
    setEnviando(true);

    try {
      // La persistencia y las notificaciones push las resuelve el backend,
      // que conoce el remitente real y los destinatarios correctos.
      await enviarMensajeChat({
        ...(modoDelivery
          ? { order_id: orderId, chat_type: "delivery" as const }
          : { table_id: tableId, chat_type: "table_waiter" as const }),
        sender_id: usuarioActual.id,
        message: mensajeAEnviar,
      });
    } catch (err: any) {
      console.warn("⚠️ Error al enviar mensaje:", err.message);
      setTexto(mensajeAEnviar);
    } finally {
      setEnviando(false);
    }
  };

  const renderScrollComponent = useCallback(
    (props: ScrollViewProps) => <ChatScrollView {...props} />,
    []
  );

  const renderMensaje = ({ item }: { item: MensajeChat }) => {
    const esMio = item.sender_id === usuarioActual.id;
    const hora = item.created_at
      ? new Date(item.created_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

    const fecha = item.created_at
      ? new Date(item.created_at).toLocaleDateString([], {
          day: "2-digit",
          month: "2-digit",
        })
      : "";

    const etiquetaRemitente = modoDelivery
      ? soyCliente
        ? "Repartidor"
        : "Cliente"
      : esMozo
      ? `Mesa #${numeroMesa}`
      : "Mozo de Salón";

    return (
      <View
        className={`mb-2 max-w-[80%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
          esMio
            ? "self-end bg-mostaza rounded-tr-none border border-mostaza"
            : "self-start bg-white rounded-tl-none border border-stone-200"
        }`}
      >
        {!esMio && (
          <Text className="mb-0.5 text-sm font-bold text-vino">
            {etiquetaRemitente}
          </Text>
        )}

        <Text
          style={{
            fontFamily: "sans-serif",
            fontSize: 14,
            color: esMio ? "#1c1917" : "#292524",
            fontWeight: esMio ? "600" : "400",
          }}
        >
          {item.message}
        </Text>

        <Text
          className={`mt-1 text-[10px] text-right ${
            esMio ? "text-stone-700" : "text-stone-400"
          }`}
        >
          {fecha} {hora}
        </Text>
      </View>
    );
  };

  const titulo = modoDelivery
    ? soyCliente
      ? "Chat con el Repartidor"
      : "Chat con el Cliente"
    : esMozo
    ? "Consultas de la Mesa"
    : "Consulta al Mozo";

  const minutos = minutosDesde(fechaPedido);

  return (
    <View className="flex-1 bg-amber-50">
      {/* Header estilo WhatsApp con temática Oriental */}
      <View className="flex-row items-center border-b border-mostaza/30 bg-vino px-4 py-3 shadow-md">
        {/* Izquierda: botón volver. Este bloque y el contrapeso de la derecha
            tienen el mismo flex, así el título queda centrado en la caja. */}
        <View className="flex-1 items-start">
          <TouchableOpacity
            onPress={onVolver}
            accessibilityRole="button"
            accessibilityLabel="Volver"
            className="items-center justify-center rounded-xl border-2 border-mostaza bg-terracota px-2 py-1 active:bg-terracota/70"
          >
            <Image
              source={require("../../assets/images/left-arrow-y.png")}
              className="h-6 w-6 mr-1"
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        {/* Centro: título y subtítulo */}
        <View className="items-center flex-shrink">
          <Text
            style={{ fontFamily: "LaOriental" }}
            className="text-lg uppercase text-mostaza text-center"
            numberOfLines={1}
          >
            {titulo}
          </Text>

          {modoDelivery ? (
            <>
              <Text
                className="max-w-[240px] text-[11px] font-bold text-amber-100 text-center"
                numberOfLines={1}
              >
                📍 {direccionEntrega || "Domicilio del cliente"}
              </Text>
              <Text className="text-[10px] font-semibold text-emerald-300 text-center">
                {formatearFecha(fechaPedido)}
                {fechaPedido ? " • " : ""}
                {minutos} min transcurridos • En vivo
              </Text>
            </>
          ) : (
            <Text className="text-sm font-bold text-emerald-300">
              Mesa #{numeroMesa} • En Vivo
            </Text>
          )}
        </View>

        {/* Contrapeso derecho: mismo ancho que el bloque izquierdo */}
        <View className="flex-1" />
      </View>

      {/* Lista de Mensajes */}
      <View className="flex-1 px-4 pt-3">
        {cargando ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#800020" />
            <Text className="mt-2 text-xs font-semibold text-vino">
              {modoDelivery
                ? "Conectando con el repartidor..."
                : "Conectando con el mozo..."}
            </Text>
          </View>
        ) : mensajes.length === 0 ? (
          <View className="flex-1 items-center justify-center p-6">
            <Text className="text-5xl mb-2">💬</Text>
            <Text
              style={{ fontFamily: "LaOriental" }}
              className="text-base uppercase text-vino text-center font-bold"
            >
              {modoDelivery ? "Chat de Entrega Abierto" : "Sala de Consulta Abierta"}
            </Text>
            <Text className="mt-1 text-center text-xs text-stone-500">
              {modoDelivery
                ? soyCliente
                  ? "Escribile al repartidor para coordinar la entrega de tu pedido."
                  : "Escribile al cliente para coordinar la entrega del pedido."
                : "Escribí tu consulta. Le llegará una notificación a los mozos de turno."}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            style={{ flex: 1 }}
            data={mensajes}
            keyExtractor={(item) => item.id}
            renderItem={renderMensaje}
            renderScrollComponent={renderScrollComponent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 10 }}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
          />
        )}
      </View>

      {/* Barra de Entrada de Texto */}
      <KeyboardStickyView offset={{ opened: insets.bottom }}>
        <View className="flex-row items-center border-t border-mostaza/30 bg-white px-3 py-2">
          <TextInput
            value={texto}
            onChangeText={setTexto}
            placeholder={
              modoDelivery
                ? soyCliente
                  ? "Escribir al repartidor..."
                  : "Escribir al cliente..."
                : "Escribir consulta al mozo..."
            }
            placeholderTextColor="#a8a29e"
            className="flex-1 rounded-2xl border border-stone-300 bg-stone-50 px-4 py-2.5 text-lg text-stone-800"
            multiline
            maxLength={300}
          />

          <TouchableOpacity
            onPress={handleEnviar}
            disabled={!texto.trim() || enviando}
            className={`ml-2 h-12 w-12 items-center justify-center rounded-2xl ${
              !texto.trim() || enviando
                ? "border border-stone-300 bg-white"
                : "bg-vino active:bg-terracota"
            }`}
          >
            {enviando ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-xl text-mostaza">➤</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardStickyView>
    </View>
  );
}
