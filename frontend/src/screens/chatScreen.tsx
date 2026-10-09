import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../config/supabase";
import {
  obtenerMensajesChat,
  enviarMensajeChat,
  MensajeChat,
} from "../services/chatService";

interface Props {
  tableId: string;
  numeroMesa: number;
  usuarioActual: {
    id: string;
    nombres: string;
    apellidos: string;
    perfil: string;
  };
  onVolver: () => void;
}

export function ChatMozoScreen({
  tableId,
  numeroMesa,
  usuarioActual,
  onVolver,
}: Props) {
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [cargando, setCargando] = useState(true);

  const flatListRef = useRef<FlatList>(null);
  const esMozo = usuarioActual.perfil === "mozo";

  useEffect(() => {
    cargarHistorial();

    // Suscripción Realtime a la tabla 'chats' filtrada por esta mesa
    const canal = supabase
      .channel(`chat_mesa_${tableId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chats",
          filter: `table_id=eq.${tableId}`,
        },
        (payload) => {
          const nuevo = payload.new as MensajeChat;
          setMensajes((prev) => {
            if (prev.some((m) => m.id === nuevo.id)) return prev;
            return [...prev, nuevo];
          });
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [tableId]);

  const cargarHistorial = async () => {
    try {
      setCargando(true);
      const data = await obtenerMensajesChat(tableId);
      setMensajes(data);
    } catch (err: any) {
      console.warn("Error cargando mensajes:", err.message);
    } finally {
      setCargando(false);
    }
  };

  const handleEnviar = async () => {
    if (!texto.trim() || enviando) return;

    const mensajeAEnviar = texto.trim();
    setTexto("");
    setEnviando(true);

    try {
      // La persistencia y las notificaciones push las resuelve el backend,
      // que conoce el remitente real y los destinatarios correctos.
      await enviarMensajeChat({
        table_id: tableId,
        sender_id: usuarioActual.id,
        message: mensajeAEnviar,
        chat_type: "table_waiter",
      });
    } catch (err: any) {
      console.warn("⚠️ Error al enviar mensaje:", err.message);
      setTexto(mensajeAEnviar);
    } finally {
      setEnviando(false);
    }
  };

  const renderMensaje = ({ item }: { item: MensajeChat }) => {
    const esMio = item.sender_id === usuarioActual.id;
    const hora = item.created_at
      ? new Date(item.created_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

    return (
      <View
        className={`mb-2 max-w-[80%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
          esMio
            ? "self-end bg-mostaza rounded-tr-none border border-mostaza"
            : "self-start bg-white rounded-tl-none border border-stone-200"
        }`}
      >
        {!esMio && (
          <Text className="mb-0.5 text-[11px] font-bold text-vino">
            {esMozo ? `Mesa #${numeroMesa} (Cliente)` : "Mozo de Salón"}
          </Text>
        )}

        <Text
          className={`text-sm ${
            esMio ? "font-semibold text-stone-900" : "text-stone-800"
          }`}
        >
          {item.message}
        </Text>

        <Text
          className={`mt-1 text-[10px] text-right ${
            esMio ? "text-stone-700" : "text-stone-400"
          }`}
        >
          {hora}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-amber-50"
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
    >
      {/* Header estilo WhatsApp con temática Oriental */}
      <View className="flex-row items-center justify-between border-b border-mostaza/30 bg-vino px-4 py-3 shadow-md">

        <View className="items-center flex-1">
          <Text
            style={{ fontFamily: "LaOriental" }}
            className="text-lg uppercase text-mostaza"
          >
            Consulta al Mozo
          </Text>
          <Text className="text-[11px] font-bold text-emerald-300">
            Mesa #{numeroMesa} • En Vivo
          </Text>
        </View>
      </View>

      {/* Lista de Mensajes */}
      <View className="flex-1 px-4 pt-3">
        {cargando ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#800020" />
            <Text className="mt-2 text-xs font-semibold text-vino">
              Conectando con el mozo...
            </Text>
          </View>
        ) : mensajes.length === 0 ? (
          <View className="flex-1 items-center justify-center p-6">
            <Text className="text-5xl mb-2">💬</Text>
            <Text
              style={{ fontFamily: "LaOriental" }}
              className="text-base uppercase text-vino text-center font-bold"
            >
              Sala de Consulta Abierta
            </Text>
            <Text className="mt-1 text-center text-xs text-stone-500">
              Escribí tu consulta. Le llegará una notificación a los mozos de turno.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={mensajes}
            keyExtractor={(item) => item.id}
            renderItem={renderMensaje}
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
      <View className="flex-row items-center border-t border-mostaza/30 bg-white px-3 py-2">
        <TextInput
          value={texto}
          onChangeText={setTexto}
          placeholder="Escribir consulta al mozo..."
          placeholderTextColor="#a8a29e"
          className="flex-1 rounded-2xl border border-stone-300 bg-stone-50 px-4 py-2.5 text-s text-stone-800"
          multiline
          maxLength={300}
        />

        <TouchableOpacity
          onPress={handleEnviar}
          disabled={!texto.trim() || enviando}
          className={`ml-2 h-11 w-11 items-center justify-center rounded-2xl ${
            !texto.trim() || enviando ? "border border-stone-300 bg-white" : "bg-vino active:bg-terracota"
          }`}
        >
          {enviando ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text className="text-lg text-mostaza">➤</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}