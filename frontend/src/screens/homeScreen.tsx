import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Image, Vibration, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { UsuarioSeed } from "../data/usuariosPrecargados";
import { ChineseFrame } from "../components/ChineseFrame";
import { useCart } from "../context/carritoContext";

export type HomeDestino =
  | "empleados"
  | "mesas"
  | "clientes"
  | "producto"
  | "registro_metre"
  | "carta"
  | "carrito";

const PERFILES_EMPLEADO = [
  { id: "cocinero", label: "Cocinero", imagen: require("../../assets/images/chef-y.png") },
  { id: "cantinero", label: "Cantinero", imagen: require("../../assets/images/martini-glass-y.png") },
  { id: "mozo", label: "Mozo", imagen: require("../../assets/images/serving-y.png") },
  { id: "metre", label: "Metre", imagen: require("../../assets/images/bow-y.png") },
  { id: "supervisor", label: "Supervisor", imagen: require("../../assets/images/supervisor-y.png") },
];

interface Props {
  usuario: UsuarioSeed;
  onNavigate: (destino: HomeDestino, tipoCarta?: "dish" | "drink" | "todo" | string) => void;
}

export default function HomeScreen({ usuario, onNavigate }: Props) {
  const insets = useSafeAreaInsets();
  const [modalPerfilVisible, setModalPerfilVisible] = useState(false);
  const { carrito } = useCart();

  const navegar = (destino: HomeDestino, parametro?: string) => {
    Vibration.vibrate([0, 40]);
    onNavigate(destino, parametro);
  };

  const perfil = usuario.perfil;

  // ---- Configuración de roles ----
  const esAdmin = perfil === "dueño" || perfil === "supervisor";
  const esProducto = perfil === "cocinero" || perfil === "cantinero";
  const esCliente = perfil === "cliente_registrado" || perfil === "cliente_anonimo";

  return (
    <>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: esCliente ? 140 : 50, paddingTop: insets.top }}
        showsVerticalScrollIndicator={false}
      >
        <StatusBar style="light" />

        {/* Saludo */}
        <View className="px-6 pt-5">
          <Image
            source={require("../../assets/images/logo-name.png")}
            className="mt-6 h-20 w-auto self-center"
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
          {/* 1. GESTIÓN ADMIN */}
          {esAdmin && (
            <View className="gap-y-4">
              <Text className="mb-1 text-xs font-bold text-vino uppercase">Gestión Restaurante</Text>

              <TouchableOpacity
                onPress={() => {
                  Vibration.vibrate([0, 40]);
                  setModalPerfilVisible(true);
                }}
                className="flex-row items-center rounded-2xl border-2 border-mostaza bg-vino p-4 active:bg-terracota"
              >
                <Image source={require("../../assets/images/employeeRegistration-y.png")} className="h-7 w-7 mr-3" resizeMode="contain" />
                <View className="flex-1">
                  <Text style={{ fontFamily: "LaOriental" }} className="text-base uppercase tracking-wider text-mostaza">
                    Alta de Empleados
                  </Text>
                  <Text className="text-[11px] font-semibold text-amber-100">Registrar nuevo personal</Text>
                </View>
                <Image source={require("../../assets/images/right-arrow-y.png")} className="h-7 w-7" resizeMode="contain" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navegar("mesas")}
                className="flex-row items-center rounded-2xl border-2 border-mostaza bg-vino p-4 active:bg-terracota"
              >
                <Image source={require("../../assets/images/table-y.png")} className="h-7 w-7 mr-3" resizeMode="contain" />
                <View className="flex-1">
                  <Text style={{ fontFamily: "LaOriental" }} className="text-base uppercase tracking-wider text-mostaza">
                    Mesas Y QR
                  </Text>
                  <Text className="text-[11px] font-semibold text-amber-100">Gestionar mesas y código QR</Text>
                </View>
                <Image source={require("../../assets/images/right-arrow-y.png")} className="h-7 w-7" resizeMode="contain" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navegar("clientes")}
                className="flex-row items-center rounded-2xl border-2 border-mostaza bg-vino p-4 active:bg-terracota"
              >
                <Image source={require("../../assets/images/userAprovation-y.png")} className="h-7 w-7 mr-3" resizeMode="contain" />
                <View className="flex-1">
                  <Text style={{ fontFamily: "LaOriental" }} className="text-base uppercase tracking-wider text-mostaza">
                    Aprobación de Clientes
                  </Text>
                  <Text className="text-[11px] font-semibold text-amber-100">Revisar solicitudes pendientes</Text>
                </View>
                <Image source={require("../../assets/images/right-arrow-y.png")} className="h-7 w-7" resizeMode="contain" />
              </TouchableOpacity>
            </View>
          )}

          {/* 2. COCINERO / CANTINERO */}
          {esProducto && (
            <View className="gap-y-4">
              <Text className="mb-1 text-xs font-bold text-vino uppercase">Gestión de Carta</Text>

              {/* Botón 1: Alta */}
              <TouchableOpacity
                onPress={() => navegar("producto")}
                className="flex-row items-center rounded-2xl border-2 border-mostaza bg-vino p-4 active:bg-terracota"
              >
                <Image
                  source={require("../../assets/images/employeeRegistration-y.png")}
                  className="w-8 h-8 mr-3"
                  resizeMode="contain"
                />
                <View className="flex-1">
                  <Text style={{ fontFamily: "LaOriental" }} className="text-base uppercase tracking-wider text-mostaza">
                    {perfil === "cocinero" ? "Alta de Comida" : "Alta de Bebida"}
                  </Text>
                  <Text className="text-[11px] font-semibold text-amber-100">
                    {perfil === "cocinero" ? "Agregar un plato a la carta" : "Agregar una bebida a la carta"}
                  </Text>
                </View>
                <Image source={require("../../assets/images/right-arrow-y.png")} className="h-7 w-7" resizeMode="contain" />
              </TouchableOpacity>

              {/* Botón 2: Ver Carta y Administrar */}
              <TouchableOpacity
                onPress={() => navegar("carta", perfil === "cocinero" ? "comida" : "bebida")}
                className="flex-row items-center rounded-2xl border-2 border-mostaza bg-vino p-4 active:bg-terracota"
              >
                <Image
                  source={perfil === "cocinero" ? require("../../assets/images/food-y.png") : require("../../assets/images/martini-glass-y.png")}
                  className="h-7 w-7 mr-3"
                  resizeMode="contain"
                />
                <View className="flex-1">
                  <Text style={{ fontFamily: "LaOriental" }} className="text-base uppercase tracking-wider text-mostaza">
                    {perfil === "cocinero" ? "Ver Carta de Platos" : "Ver Carta de Bebidas"}
                  </Text>
                  <Text className="text-[11px] font-semibold text-amber-100">
                    Consultar o eliminar productos cargados
                  </Text>
                </View>
                <Image source={require("../../assets/images/right-arrow-y.png")} className="h-7 w-7" resizeMode="contain" />
              </TouchableOpacity>
            </View>
          )}

          {/* 3. CLIENTE (Platos, Bebidas y Carrito) */}
          {esCliente && (
            <View className="gap-y-4">
              <Text className="mb-1 text-xs font-bold text-vino uppercase">Menú Principal</Text>

              {/* Carta de Platos */}
              <TouchableOpacity
                onPress={() => navegar("carta", "comida")}
                className="flex-row items-center rounded-2xl border-2 border-mostaza bg-vino p-4 active:bg-terracota"
              >
                <Image source={require("../../assets/images/food-y.png")} className="h-7 w-7 mr-3" resizeMode="contain" />
                <View className="flex-1">
                  <Text style={{ fontFamily: "LaOriental" }} className="text-base uppercase tracking-wider text-mostaza">
                    Carta de Platos
                  </Text>
                  <Text className="text-[11px] font-semibold text-amber-100">
                    Ver comidas
                  </Text>
                </View>
                <Image source={require("../../assets/images/right-arrow-y.png")} className="h-6 w-6" resizeMode="contain" />
              </TouchableOpacity>

              {/* Carta de Bebidas */}
              <TouchableOpacity
                onPress={() => navegar("carta", "bebida")}
                className="flex-row items-center rounded-2xl border-2 border-mostaza bg-vino p-4 active:bg-terracota"
              >
                <Image source={require("../../assets/images/martini-glass-y.png")} className="h-7 w-7 mr-3" resizeMode="contain" />
                <View className="flex-1">
                  <Text style={{ fontFamily: "LaOriental" }} className="text-base uppercase tracking-wider text-mostaza">
                    Carta de Bebidas
                  </Text>
                  <Text className="text-[11px] font-semibold text-amber-100">
                    Ver tragos y bebidas
                  </Text>
                </View>
                <Image source={require("../../assets/images/right-arrow-y.png")} className="h-6 w-6" resizeMode="contain" />
              </TouchableOpacity>
            </View>
          )}

          {/* 4. METRE */}
          {perfil === "metre" && (
            <View className="gap-y-4">
              <Text className="mb-1 text-xs font-bold text-vino uppercase">Operación</Text>
              <TouchableOpacity
                onPress={() => navegar("registro_metre")}
                className="flex-row items-center rounded-2xl border-2 border-mostaza bg-vino p-4 active:bg-terracota"
              >
                <Image source={require("../../assets/images/employeeRegistration-y.png")} className="h-7 w-7 mr-3" resizeMode="contain" />
                <View className="flex-1">
                  <Text style={{ fontFamily: "LaOriental" }} className="text-base uppercase tracking-wider text-mostaza">
                    Registrar Cliente
                  </Text>
                  <Text className="text-[11px] font-semibold text-amber-100">
                    Carga asistida de un cliente
                  </Text>
                </View>
                <Image source={require("../../assets/images/right-arrow-y.png")} className="h-7 w-7" resizeMode="contain" />
              </TouchableOpacity>
            </View>
          )}

          {/* 5. OTROS */}
          {!esAdmin && !esProducto && !esCliente && perfil !== "metre" && (
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

      {/* Botón Mi Pedido fijo al pie de la pantalla (solo clientes) */}
      {esCliente && (
        <View className="px-6 pb-6 pt-2">
          <TouchableOpacity
            onPress={() => navegar("carrito")}
            className="flex-row items-center rounded-2xl border-2 border-vino bg-mostaza p-4 active:bg-mostaza/80"
          >
            <Image source={require("../../assets/images/cart-v.png")} className="h-7 w-7 mr-3" resizeMode="contain" />
            <View className="flex-1">
              <Text style={{ fontFamily: "LaOriental" }} className="text-base uppercase tracking-wider text-vino font-black">
                Mi Pedido ({carrito.length})
              </Text>
              <Text className="text-[11px] font-semibold text-stone-800">
                Revisar pedido y confirmar
              </Text>
            </View>
            <Image source={require("../../assets/images/right-arrow-y.png")} className="h-6 w-6 tint-vino" resizeMode="contain" />
          </TouchableOpacity>
        </View>
      )}

      {/* Nombres del equipo */}
      <View className="absolute right-4 z-10 items-end" style={{ top: insets.top + 16 }}>
        <Text className="text-[10px] text-vino/70">Rocío Sanchez</Text>
        <Text className="text-[10px] text-vino/70">Santino Casado</Text>
        <Text className="text-[10px] text-vino/70">Sebastián Andreozzi</Text>
        <Text className="text-[10px] text-vino/70">Valentín Brazanovich</Text>
      </View>

      {/* MODAL: Selección de Puesto / Rol */}
      <Modal visible={modalPerfilVisible} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <ChineseFrame className="w-full max-w-sm bg-vino shadow-2xl p-3">
            <View className="px-2 pb-3 pt-5">
              <Text
                style={{ fontFamily: "LaOriental" }}
                className="mb-1 text-xl uppercase tracking-wider text-mostaza text-center"
              >
                Nuevo Empleado
              </Text>
              <Text className="mb-5 text-center text-sm font-semibold text-amber-100">
                Seleccione el puesto que ocupará el empleado:
              </Text>

              <View className="flex-row flex-wrap justify-between gap-y-5">
                {PERFILES_EMPLEADO.map((rol) => (
                  <TouchableOpacity
                    key={rol.id}
                    onPress={() => {
                      Vibration.vibrate([0, 40]);
                      setModalPerfilVisible(false);
                      onNavigate("empleados", rol.id);
                    }}
                    className="w-[48%] items-center rounded-2xl border-2 border-mostaza/70 bg-calabaza/30 p-3 active:bg-calabaza/60"
                  >
                    <Image source={rol.imagen} className="mb-1 h-9 w-9" resizeMode="contain" />
                    <Text className="text-sm font-extrabold text-mostaza">{rol.label.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                onPress={() => setModalPerfilVisible(false)}
                className="mt-5 rounded-2xl bg-mostaza py-2.5 active:bg-calabaza/60"
              >
                <Text
                  style={{ fontFamily: "LaOriental" }}
                  className="text-center uppercase tracking-wider text-vino"
                >
                  Cancelar
                </Text>
              </TouchableOpacity>
            </View>
          </ChineseFrame>
        </View>
      </Modal>
    </>
  );
}