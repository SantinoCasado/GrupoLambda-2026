import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Image, Vibration } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { UsuarioSeed } from "../data/usuariosPrecargados";
import { ChineseFrame } from "../components/ChineseFrame";

export type HomeDestino =
  | "empleados"
  | "mesas"
  | "clientes"
  | "producto"
  | "registro_metre";

interface Props {
  usuario: UsuarioSeed;
  onNavigate: (destino: HomeDestino) => void;
}

export default function HomeScreen({ usuario, onNavigate }: Props) {
  const insets = useSafeAreaInsets();

  const navegar = (destino: HomeDestino) => {
    Vibration.vibrate([0, 40]);
    onNavigate(destino);
  };

  const perfil = usuario.perfil;

  // ---- Configuración de botones según rol ----
  const esAdmin = perfil === "dueño" || perfil === "supervisor";
  const esProducto = perfil === "cocinero" || perfil === "cantinero";

  return (
    <>
      <View
        style={{ position: "absolute", width: "100%", height: "100%", backgroundColor: "#FFF6EC" }}
      />
      <Image
        source={require("../../assets/images/background-test-3.png")}
        style={{ position: "absolute", width: "100%", height: "100%" }}
        resizeMode="cover"
      />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 50, paddingTop: insets.top }}
        showsVerticalScrollIndicator={false}
      >
        <StatusBar style="light" />

        {/* Saludo */}
        <View className="px-6 pt-5">
          <View className="mb-1 flex-row items-center">
            <Text className="text-3xl mr-3">{usuario.icono}</Text>
            <View className="flex-1">
              <Text className="text-2xl font-black text-mostaza uppercase">
                Hola, {usuario.nombres}
              </Text>
              <Text className="text-xs font-bold text-vino uppercase">
                {usuario.tituloVisual}
              </Text>
            </View>
          </View>

          <Image
            source={require("../../assets/images/logo-name.png")}
            className="my-3 h-16 w-auto self-center"
            resizeMode="contain"
          />
          <Image
            source={require("../../assets/images/separator.png")}
            className="my-2 h-5 w-full"
            resizeMode="contain"
          />
          <ChineseFrame className="mt-2 bg-vino">
            <View className="items-center rounded-xl bg-mostaza/15 px-4 py-4">
              <Text style={{ fontFamily: "LaOriental" }} className="text-xl text-mostaza uppercase">
                Inicio
              </Text>
              <Text className="mt-1 text-xs font-semibold text-amber-100">
                Seleccione una opción para comenzar
              </Text>
            </View>
          </ChineseFrame>
        </View>

        {/* Contenido según rol */}
        <View className="px-6 pt-6">
          {esAdmin && (
            <View className="gap-y-4">
              <Text className="mb-1 text-xs font-bold text-vino uppercase">Gestión Restaurante</Text>

              <TouchableOpacity
                onPress={() => navegar("empleados")}
                className="flex-row items-center rounded-2xl border-2 border-mostaza bg-vino p-4 active:bg-terracota"
              >
                <Text className="text-2xl mr-3">👤</Text>
                <View className="flex-1">
                  <Text style={{ fontFamily: "LaOriental" }} className="text-base uppercase tracking-wider text-mostaza">
                    Alta de Empleados
                  </Text>
                  <Text className="text-[11px] font-semibold text-amber-100">
                    Registrar nuevo personal del restaurante
                  </Text>
                </View>
                <Text className="text-mostaza text-xl">›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navegar("mesas")}
                className="flex-row items-center rounded-2xl border-2 border-mostaza bg-vino p-4 active:bg-terracota"
              >
                <Text className="text-2xl mr-3">🪑</Text>
                <View className="flex-1">
                  <Text style={{ fontFamily: "LaOriental" }} className="text-base uppercase tracking-wider text-mostaza">
                    Mesas / QR
                  </Text>
                  <Text className="text-[11px] font-semibold text-amber-100">
                    Alta y gestión de mesas con código QR
                  </Text>
                </View>
                <Text className="text-mostaza text-xl">›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navegar("clientes")}
                className="flex-row items-center rounded-2xl border-2 border-mostaza bg-vino p-4 active:bg-terracota"
              >
                <Text className="text-2xl mr-3">👥</Text>
                <View className="flex-1">
                  <Text style={{ fontFamily: "LaOriental" }} className="text-base uppercase tracking-wider text-mostaza">
                    Aprobación de Clientes
                  </Text>
                  <Text className="text-[11px] font-semibold text-amber-100">
                    Revisar solicitudes pendientes de clientes
                  </Text>
                </View>
                <Text className="text-mostaza text-xl">›</Text>
              </TouchableOpacity>
            </View>
          )}

          {esProducto && (
            <View className="gap-y-4">
              <Text className="mb-1 text-xs font-bold text-vino uppercase">Carta</Text>
              <TouchableOpacity
                onPress={() => navegar("producto")}
                className="flex-row items-center rounded-2xl border-2 border-mostaza bg-vino p-4 active:bg-terracota"
              >
                <Text className="text-2xl mr-3">{perfil === "cocinero" ? "🍳" : "🍸"}</Text>
                <View className="flex-1">
                  <Text style={{ fontFamily: "LaOriental" }} className="text-base uppercase tracking-wider text-mostaza">
                    {perfil === "cocinero" ? "Alta de Comida" : "Alta de Bebida"}
                  </Text>
                  <Text className="text-[11px] font-semibold text-amber-100">
                    Agregar un producto a la carta
                  </Text>
                </View>
                <Text className="text-mostaza text-xl">›</Text>
              </TouchableOpacity>
            </View>
          )}

          {perfil === "metre" && (
            <View className="gap-y-4">
              <Text className="mb-1 text-xs font-bold text-vino uppercase">Operación</Text>
              <TouchableOpacity
                onPress={() => navegar("registro_metre")}
                className="flex-row items-center rounded-2xl border-2 border-mostaza bg-vino p-4 active:bg-terracota"
              >
                <Text className="text-2xl mr-3">🛎️</Text>
                <View className="flex-1">
                  <Text style={{ fontFamily: "LaOriental" }} className="text-base uppercase tracking-wider text-mostaza">
                    Registrar Cliente
                  </Text>
                  <Text className="text-[11px] font-semibold text-amber-100">
                    Carga asistida de un cliente (Metre)
                  </Text>
                </View>
                <Text className="text-mostaza text-xl">›</Text>
              </TouchableOpacity>
            </View>
          )}

          {!esAdmin && !esProducto && perfil !== "metre" && (
            <View className="items-center justify-center rounded-2xl border border-dashed border-mostaza/60 bg-white/70 p-8">
              <Text className="text-4xl mb-2">📭</Text>
              <Text
                style={{ fontFamily: "LaOriental" }}
                className="text-base uppercase text-vino text-center"
              >
                Sin opciones disponibles
              </Text>
              <Text className="mt-1 text-center text-xs text-stone-600">
                Tu perfil no tiene módulos habilitados por el momento.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}
