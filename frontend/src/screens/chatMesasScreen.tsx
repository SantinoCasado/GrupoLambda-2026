import { ChineseFrame } from "../components/ChineseFrame";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { obtenerMesas, Mesa } from "../services/mesasService";

interface Props {
  usuarioActual: any;
  onAbrirChatMesa: (tableId: string, numeroMesa: number) => void;
}

export function ChatMesasScreen({
  usuarioActual,
  onAbrirChatMesa,
}: Props) {
  const insets = useSafeAreaInsets();
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargarMesas = async () => {
    try {
      setCargando(true);
      const listaMesas = await obtenerMesas();
      setMesas(listaMesas);
    } catch (err: any) {
      console.warn("Error cargando mesas:", err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarMesas();
  }, []);

  return (
    <SafeAreaView className="flex-1">
      <StatusBar style="light" />

      {/* Nombres del equipo */}
      <View className="absolute right-4 z-10 items-end" style={{ top: insets.top + 16 }}>
        <Text className="text-[10px] text-vino/70">Rocío Sanchez</Text>
        <Text className="text-[10px] text-vino/70">Santino Casado</Text>
        <Text className="text-[10px] text-vino/70">Sebastián Andreozzi</Text>
        <Text className="text-[10px] text-vino/70">Valentín Brazanovich</Text>
      </View>

      {/* Cabecera */}
      <View className="px-5 pt-4">
        <View className="mb-4">
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
          <ChineseFrame className="mt-2 bg-vino">
            <View className="items-center rounded-xl bg-mostaza/15 px-4 py-4">
              <Text style={{ fontFamily: "LaOriental" }} className="text-2xl text-mostaza uppercase">
                Chat Mesas
              </Text>
              <Text className="mt-1 text-xs font-semibold text-amber-100">
                Responder las consultas de los clientes
              </Text>
            </View>
          </ChineseFrame>
        </View>
      </View>

      {/* Contenido */}
      {cargando ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#E5B25D" />
        </View>
      ) : (
        <FlatList
          className="flex-1 px-5"
          data={mesas}
          keyExtractor={(m, index) => String(m.id || index)}
          renderItem={({ item: mesa }) => {
            const ocupada = mesa.disponibilidad === "ocupada";
            return (
              <TouchableOpacity
                onPress={() => onAbrirChatMesa(mesa.id || "", mesa.numero)}
                className={`mb-2.5 flex-row items-center justify-between rounded-xl border-2 bg-caramelo/20 p-3.5 active:bg-black/50 ${
                  ocupada ? "border-terracota" : "border-emerald-500"
                }`}
              >
                <View>
                  <Text
                    style={{ fontFamily: "LaOriental" }}
                    className={`text-base ${ocupada ? "text-terracota" : "text-emerald-500"}`}
                  >
                    Mesa #{mesa.numero}
                  </Text>
                  <Text className="text-xs">
                    <Text className="font-semibold text-calabaza">Estado: </Text>
                    <Text className={`font-bold ${ocupada ? "text-terracota" : "text-emerald-500"}`}>
                      {ocupada ? "OCUPADA" : "LIBRE"}
                    </Text>
                  </Text>
                </View>

                <View className="flex-row items-center gap-1">
                  <Text className="text-xs font-bold text-calabaza">Abrir Chat</Text>
                  <Text className="text-lg">💬</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}