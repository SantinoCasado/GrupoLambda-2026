import React, { useState } from "react";
import { View, Text, TouchableOpacity, Image, Vibration, Modal, LayoutChangeEvent, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { UsuarioSeed } from "../data/usuariosPrecargados";
import { ChineseFrame } from "../components/ChineseFrame";
import { useCart } from "../context/carritoContext";
import { usePedidoAprobado } from "../hooks/usePedidoAprobado";

export type HomeDestino =
  | "empleados"
  | "mesas"
  | "clientes"
  | "producto"
  | "registro_metre"
  | "metre"
  | "carta"
  | "carrito"
  | "comandas"
  | "chat_mesas"
  | "pedidos_listos"
  | "estadisticas"
  | "transacciones"
  | "preparacion"
  | "reservas_cliente"
  | "reservas_admin";

const PERFILES_EMPLEADO = [
  { id: "cocinero", label: "Cocinero", imagen: require("../../assets/images/chef-y.png") },
  { id: "cantinero", label: "Cantinero", imagen: require("../../assets/images/martini-glass-y.png") },
  { id: "mozo", label: "Mozo", imagen: require("../../assets/images/serving-y.png") },
  { id: "metre", label: "Metre", imagen: require("../../assets/images/bow-y.png") },
  { id: "supervisor", label: "Supervisor", imagen: require("../../assets/images/supervisor-y.png") },
];

const ALTO_REFERENCIA = 560;

interface Props {
  usuario: UsuarioSeed;
  onNavigate: (destino: HomeDestino, tipoCarta?: "comida" | "bebida" | "postre" | "todo" | string) => void;
  numeroMesa?: number | null;
  onSolicitarMesa?: () => void;
  pedidoActivoId?: string | null;
  onVerEstadoPedido?: () => void;
  onAbrirChatMozo?: () => void;
  onIrAJuegos?: () => void;
}

export default function HomeScreen({
  usuario,
  onNavigate,
  numeroMesa,
  onSolicitarMesa,
  pedidoActivoId,
  onVerEstadoPedido,
  onAbrirChatMozo,
  onIrAJuegos,
}: Props) {
  const [modalPerfilVisible, setModalPerfilVisible] = useState(false);
  const { carrito } = useCart();

  const pedidoAprobado = usePedidoAprobado(pedidoActivoId);
  const [altoArea, setAltoArea] = useState(0);

  const onLayoutArea = (e: LayoutChangeEvent) => {
    const { height } = e.nativeEvent.layout;
    if (height > 0 && Math.abs(height - altoArea) > 1) setAltoArea(height);
  };

  const area = altoArea || ALTO_REFERENCIA;
  const k = Math.min(1.3, Math.max(0.6, area / ALTO_REFERENCIA));

  const px = (base: number, tope: number) => Math.round(Math.min(base * k, area * tope));
  const texto = (base: number, tope: number) => Math.max(11, px(base, tope));

  const navegar = (destino: HomeDestino, parametro?: string) => {
    Vibration.vibrate([0, 40]);
    onNavigate(destino, parametro);
  };

  const perfil = usuario.perfil;

  const esAdmin = perfil === "dueño" || perfil === "supervisor";
  const esProducto = perfil === "cocinero" || perfil === "cantinero";
  const esCliente = perfil === "cliente_registrado" || perfil === "cliente_anonimo";

  return (
    <>
      <View className="flex-1">
        <StatusBar style="light" />
        <View className="px-6 pt-5">
          <Image
            source={require("../../assets/images/logo-name.png")}
            className="h-20 w-auto self-center"
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
        <View className="flex-1 px-6 pt-6" onLayout={onLayoutArea}>
          {/* 1. GESTIÓN ADMIN */}
          {esAdmin && (
            <View className="flex-1 gap-y-3">
              <Text className="mb-1 text-xs font-bold text-vino uppercase">Gestión del Restaurante</Text>

              {/* Aprobación de Clientes */}
              <TouchableOpacity
                onPress={() => navegar("clientes")}
                className="items-center justify-center rounded-2xl border-2 border-mostaza bg-vino px-6 active:bg-terracota"
                style={{ flex: 1.5, minHeight: px(140, 0.3) }}
              >
                <Image
                  source={require("../../assets/images/userAprovation-y.png")}
                  style={{ height: px(70, 0.2), width: px(70, 0.2) }}
                  resizeMode="contain"
                />
                <Text
                  style={{ fontFamily: "LaOriental", fontSize: texto(20, 0.06) }}
                  className="mt-2 text-center uppercase tracking-wider text-mostaza"
                >
                  Aprobación de Clientes
                </Text>
              </TouchableOpacity>

              {/* Punto 25: Gestión de Reservas */}
              <TouchableOpacity
                onPress={() => navegar("reservas_admin")}
                className="flex-row items-center justify-center rounded-2xl border-2 border-mostaza bg-vino px-4 active:bg-terracota"
                style={{ paddingVertical: px(12, 0.05) }}
              >
                <Image
                  source={require("../../assets/images/audit-y.png")}
                  style={{ height: px(38, 0.09), width: px(38, 0.09) }}
                  resizeMode="contain"
                />
                <Text
                  style={{ fontFamily: "LaOriental", fontSize: texto(16, 0.05) }}
                  className="ml-3 uppercase tracking-wider text-mostaza"
                >
                  Gestión de Reservas
                </Text>
              </TouchableOpacity>

              {/* Estadísticas */}
              <TouchableOpacity
                onPress={() => navegar("estadisticas")}
                className="flex-row items-center justify-center rounded-2xl border-2 border-mostaza bg-vino px-4 active:bg-terracota"
                style={{ paddingVertical: px(12, 0.05) }}
              >
                <Image
                  source={require("../../assets/images/audit-y.png")}
                  style={{ height: px(38, 0.09), width: px(38, 0.09) }}
                  resizeMode="contain"
                />
                <Text
                  style={{ fontFamily: "LaOriental", fontSize: texto(16, 0.05) }}
                  className="ml-3 uppercase tracking-wider text-mostaza"
                >
                  Estadísticas
                </Text>
              </TouchableOpacity>

              {/* Acciones secundarias */}
              <View className="mb-4 flex-row gap-2">
                <TouchableOpacity
                  onPress={() => {
                    Vibration.vibrate([0, 40]);
                    setModalPerfilVisible(true);
                  }}
                  className="flex-1 items-center justify-center rounded-2xl border-2 border-mostaza bg-vino active:bg-terracota"
                  style={{ padding: px(10, 0.045) }}
                >
                  <Image
                    source={require("../../assets/images/employeeRegistration-y.png")}
                    style={{ height: px(36, 0.08), width: px(36, 0.08) }}
                    resizeMode="contain"
                  />
                  <Text
                    style={{ fontFamily: "LaOriental", fontSize: texto(11, 0.035) }}
                    className="mt-1 text-center uppercase tracking-wide text-mostaza"
                  >
                    Alta Empleados
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => navegar("mesas")}
                  className="flex-1 items-center justify-center rounded-2xl border-2 border-mostaza bg-vino active:bg-terracota"
                  style={{ padding: px(10, 0.045) }}
                >
                  <Image
                    source={require("../../assets/images/table-y.png")}
                    style={{ height: px(36, 0.08), width: px(36, 0.08) }}
                    resizeMode="contain"
                  />
                  <Text
                    style={{ fontFamily: "LaOriental", fontSize: texto(11, 0.035) }}
                    className="mt-1 text-center uppercase tracking-wide text-mostaza"
                  >
                    Mesas Y QR
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* 2. COCINERO / CANTINERO */}
          {esProducto && (
            <View className="flex-1 gap-y-4 pb-2">
              <Text className="text-xs font-bold text-vino uppercase">Gestión de Carta</Text>

              <TouchableOpacity
                onPress={() => navegar("preparacion")}
                className="flex-1 items-center justify-center rounded-2xl border-2 border-mostaza bg-vino px-6 active:bg-terracota"
                style={{ minHeight: px(180, 0.35) }}
              >
                <Image
                  source={require("../../assets/images/serving-y.png")}
                  style={{ height: px(128, 0.38), width: px(128, 0.38), marginBottom: px(12, 0.03) }}
                  resizeMode="contain"
                />
                <Text
                  style={{ fontFamily: "LaOriental", fontSize: texto(30, 0.08) }}
                  className="text-center uppercase tracking-wider text-mostaza"
                >
                  Comandas
                </Text>
              </TouchableOpacity>

              <View className="mb-5 flex-row gap-2">
                <TouchableOpacity
                  onPress={() => navegar("producto")}
                  className="flex-1 items-center justify-center rounded-2xl border-2 border-mostaza bg-vino active:bg-terracota"
                  style={{ minHeight: px(115, 0.35), padding: px(12, 0.05) }}
                >
                  <Image
                    source={require("../../assets/images/employeeRegistration-y.png")}
                    style={{ height: px(60, 0.55), width: px(60, 0.55) }}
                    resizeMode="contain"
                  />
                  <View className="flex-1">
                    <Text
                      style={{ fontFamily: "LaOriental", fontSize: texto(15, 0.04) }}
                      className="mt-2 text-center uppercase tracking-wide text-mostaza"
                    >
                      {perfil === "cocinero" ? "Alta de Comida" : "Alta de Bebida"}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => navegar("carta", perfil === "cocinero" ? "comida" : "bebida")}
                  className="flex-1 items-center justify-center rounded-2xl border-2 border-mostaza bg-vino active:bg-terracota"
                  style={{ minHeight: px(115, 0.35), padding: px(12, 0.05) }}
                >
                  <Image
                    source={perfil === "cocinero" ? require("../../assets/images/food-y.png") : require("../../assets/images/martini-glass-y.png")}
                    style={{ height: px(60, 0.55), width: px(60, 0.55) }}
                    resizeMode="contain"
                  />
                  <View className="flex-1">
                    <Text
                      style={{ fontFamily: "LaOriental", fontSize: texto(15, 0.04) }}
                      className="mt-2 text-center uppercase tracking-wide text-mostaza"
                    >
                      Ver Carta
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* 3. CLIENTE (Platos, Bebidas, Carrito y Reservas) */}
          {esCliente && (
            <View className="flex-1 gap-y-4">
              <View className="mb-1 flex-row items-center justify-between">
                <Text className="text-sm font-bold text-vino uppercase">Atención en Salón</Text>
                {numeroMesa ? (
                  onAbrirChatMozo ? (
                    <TouchableOpacity
                      onPress={() => {
                        Vibration.vibrate([0, 40]);
                        onAbrirChatMozo();
                      }}
                      className="flex-row items-center rounded-lg border border-vino bg-mostaza px-2 py-1.5 active:bg-mostaza/70"
                    >
                      <Text className="text-sm font-bold text-vino">MESA #{numeroMesa}</Text>
                      <Image
                        source={require("../../assets/images/chat-v.png")}
                        className="h-5 w-5 ml-2"
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                  ) : (
                    <View className="flex-row items-center rounded-lg border border-vino bg-mostaza px-2 py-1.5 active:bg-mostaza/70">
                      <Text className="text-xs font-bold text-vino">MESA #{numeroMesa}</Text>
                      <Image
                        source={require("../../assets/images/chat-v.png")}
                        className="h-5 w-5 ml-2"
                        resizeMode="contain"
                      />
                    </View>
                  )
                ) : null}
              </View>

              {!numeroMesa ? (
                /* ESTADO 1: SIN MESA ASIGNADA */
                <View className="gap-y-3">
                  <TouchableOpacity
                    onPress={onSolicitarMesa}
                    className="flex-row items-center rounded-2xl border-2 border-mostaza bg-vino active:bg-terracota"
                    style={{ padding: px(16, 0.06) }}
                  >
                    <Image
                      source={require("../../assets/images/guest-c.png")}
                      style={{ height: px(32, 0.09), width: px(32, 0.09), marginRight: px(12, 0.045) }}
                      resizeMode="contain"
                    />
                    <View className="flex-1">
                      <Text
                        style={{ fontFamily: "LaOriental", fontSize: texto(16, 0.05) }}
                        className="uppercase tracking-wider text-mostaza font-bold"
                      >
                        Ir a la Entrada / Puerta
                      </Text>
                      <Text style={{ fontSize: texto(11, 0.035), fontWeight: "600" }} className="text-amber-100">
                        Escanear QR de puerta o gestionar tus reservas
                      </Text>
                    </View>
                    <Image
                      source={require("../../assets/images/right-arrow-y.png")}
                      style={{ height: px(24, 0.07), width: px(24, 0.07) }}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>

                  {/* Punto 24: Agendar Reserva (Solo Clientes Registrados) */}
                  {perfil === "cliente_registrado" && (
                    <TouchableOpacity
                      onPress={() => navegar("reservas_cliente")}
                      className="flex-row items-center rounded-2xl border-2 border-vino bg-mostaza active:bg-mostaza/80"
                      style={{ padding: px(16, 0.06) }}
                    >
                      <Image
                        source={require("../../assets/images/serving-y.png")}
                        style={{ height: px(32, 0.09), width: px(32, 0.09), marginRight: px(12, 0.045) }}
                        className="tint-vino"
                        resizeMode="contain"
                      />
                      <View className="flex-1">
                        <Text
                          style={{ fontFamily: "LaOriental", fontSize: texto(16, 0.05) }}
                          className="uppercase tracking-wider text-vino font-bold"
                        >
                          Agendar Reserva
                        </Text>
                        <Text style={{ fontSize: texto(11, 0.035), fontWeight: "600" }} className="text-stone-800">
                          Reservá una mesa para una fecha y horario futuro
                        </Text>
                      </View>
                      <Image
                        source={require("../../assets/images/right-arrow-v.png")}
                        style={{ height: px(24, 0.07), width: px(24, 0.07) }}
                        className="tint-vino"
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                  )}
                </View>
              ) : pedidoActivoId ? (
                /* ESTADO 2A: CON MESA Y CON PEDIDO CONFIRMADO */
                <View className="flex-1 gap-y-4 pb-2">
                  <TouchableOpacity
                    onPress={onVerEstadoPedido}
                    className="flex-1 items-center justify-center rounded-2xl border-2 border-mostaza bg-vino px-6 active:bg-terracota"
                    style={{ minHeight: px(250, 0.5) }}
                  >
                    <Image 
                      source={require("../../assets/images/cart-y.png")} 
                      style={{ height: px(120, 0.25), width: px(120, 0.25) }}
                    />
                    <Text 
                      style={{ fontFamily: "LaOriental", fontSize: texto(28, 0.065) }}
                      className="mt-3 text-center uppercase tracking-wider text-mostaza"
                    >
                      Ver Estado de mi Pedido
                    </Text>
                  </TouchableOpacity>

                  {pedidoAprobado && onIrAJuegos && (
                    <TouchableOpacity
                      onPress={() => {
                        Vibration.vibrate([0, 40]);
                        onIrAJuegos();
                      }}
                      className="flex-1 items-center justify-center rounded-2xl border-2 border-vino bg-mostaza px-6 active:bg-terracota"
                      style={{ minHeight: px(120, 0.4) }}
                    >
                      <Image
                        source={require("../../assets/images/joystick-v.png")}
                        style={{ height: px(110, 0.25), width: px(110, 0.25) }}
                        resizeMode="contain"
                      />
                      <Text
                        style={{ fontFamily: "LaOriental", fontSize: texto(30, 0.065) }}
                        className="text-center uppercase tracking-wider text-vino"
                      >
                        Juegos
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                /* ESTADO 2B: CON MESA PERO SIN PEDIDO ACTIVO */
                <View className="flex-1 gap-y-4 pb-2">
                  <TouchableOpacity
                    onPress={() => navegar("carta", "comida")}
                    className="flex-1 items-center justify-center rounded-2xl border-2 border-mostaza bg-vino px-6 active:bg-terracota"
                    style={{ minHeight: px(120, 0.4) }}
                  >
                    <Image
                      source={require("../../assets/images/food-y.png")}
                      style={{ height: px(88, 0.25), width: px(88, 0.25) }}
                      resizeMode="contain"
                    />
                    <Text
                      style={{ fontFamily: "LaOriental", fontSize: texto(22, 0.065) }}
                      className="mt-3 text-center uppercase tracking-wider text-mostaza"
                    >
                      Carta de Platos
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => navegar("carta", "bebida")}
                    className="flex-1 items-center justify-center rounded-2xl border-2 border-mostaza bg-vino px-6 active:bg-terracota"
                    style={{ minHeight: px(120, 0.4) }}
                  >
                    <Image
                      source={require("../../assets/images/martini-glass-y.png")}
                      style={{ height: px(88, 0.25), width: px(88, 0.25) }}
                      resizeMode="contain"
                    />
                    <Text
                      style={{ fontFamily: "LaOriental", fontSize: texto(22, 0.065) }}
                      className="mt-3 text-center uppercase tracking-wider text-mostaza"
                    >
                      Carta de Bebidas
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* 4. METRE */}
          {perfil === "metre" && (
            <View className="flex-1 gap-y-2 pb-2">
              <Text className="mb-1 text-xs font-bold text-vino uppercase">Operación del Salón</Text>

              <TouchableOpacity
                onPress={() => navegar("metre")}
                className="items-center justify-center rounded-2xl border-2 border-mostaza bg-vino active:bg-terracota"
                style={{ flexGrow: 3, flexShrink: 1, flexBasis: 0, padding: px(24, 0.07) }}
              >
                <Image
                  source={require("../../assets/images/table-y.png")}
                  style={{ height: px(192, 0.4), width: px(192, 0.4), marginBottom: px(12, 0.03) }}
                  resizeMode="contain"
                />
                <Text
                  style={{ fontFamily: "LaOriental", fontSize: texto(24, 0.07) }}
                  className="text-center uppercase tracking-wider text-mostaza"
                >
                  Gestión de Mesas y Espera
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navegar("registro_metre")}
                className="items-center justify-center rounded-2xl border-2 border-mostaza bg-vino active:bg-terracota"
                style={{ flexGrow: 2, flexShrink: 1, flexBasis: 0, padding: px(24, 0.07) }}
              >
                <Image
                  source={require("../../assets/images/audit-y.png")}
                  style={{ height: px(100, 0.2), width: px(100, 0.2), marginBottom: px(12, 0.03) }}
                  resizeMode="contain"
                />
                <Text
                  style={{ fontFamily: "LaOriental", fontSize: texto(20, 0.1) }}
                  className="text-center uppercase tracking-wider text-mostaza"
                >
                  Registrar Cliente
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 5. MOZO */}
          {perfil === "mozo" && (
            <View className="flex-1">
              <Text className="text-xs font-bold text-vino uppercase mb-2">Operación de Salón</Text>

              <TouchableOpacity
                onPress={() => navegar("comandas")}
                className="items-center justify-center rounded-2xl border-2 border-mostaza bg-vino active:bg-terracota mb-2.5 py-5"
              >
                <Image
                  source={require("../../assets/images/serving-y.png")}
                  style={{ height: 120, width: 120, marginBottom: 10 }}
                  resizeMode="contain"
                />
                <Text
                  style={{ fontFamily: "LaOriental" }}
                  className="text-center text-3xl uppercase tracking-wider text-mostaza"
                >
                  Comandas
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navegar("pedidos_listos")}
                className="items-center justify-center rounded-2xl border-2 border-mostaza bg-vino active:bg-terracota mb-2.5 py-3 px-4"
              >
                <Image
                  source={require("../../assets/images/dish-y.png")}
                  style={{ height: 80, width: 80, marginRight: 10 }}
                  resizeMode="contain"
                />
                <Text
                  style={{ fontFamily: "LaOriental" }}
                  className="text-center text-2xl uppercase tracking-wider text-mostaza"
                >
                  Pedidos Listos
                </Text>
              </TouchableOpacity>

              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => navegar("chat_mesas")}
                  className="flex-1 items-center justify-center rounded-2xl border-2 border-mostaza bg-vino active:bg-terracota py-3 px-2"
                >
                  <Image
                    source={require("../../assets/images/table-y.png")}
                    style={{ height: 55, width: 55, marginRight: 8, marginBottom: 8 }}
                    resizeMode="contain"
                  />
                  <Text
                    style={{ fontFamily: "LaOriental", fontSize: 16 }}
                    className="text-center uppercase tracking-wider text-mostaza"
                  >
                    Chat Mesas
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => navegar("transacciones")}
                  className="flex-1 items-center justify-center rounded-2xl border-2 border-mostaza bg-vino active:bg-terracota py-3 px-2"
                >
                  <Image
                    source={require("../../assets/images/money-y.png")}
                    style={{ height: 55, width: 55, marginRight: 8, marginBottom: 8 }}
                    resizeMode="contain"
                  />
                  <Text
                    style={{ fontFamily: "LaOriental", fontSize: 16 }}
                    className="text-center uppercase text-s text-mostaza"
                  >
                    Cobrar mesas
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* 6. OTROS */}
          {!esAdmin && !esProducto && !esCliente && perfil !== "metre" && perfil !== "mozo" && (
            <View className="flex-1 items-center justify-center rounded-2xl border border-dashed border-mostaza/60 bg-white/70 p-8">
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
      </View>

      {/* Botón fijo al pie: Mi Pedido */}
      {esCliente && (
        <View className="px-6 pb-6 pt-2">
          {!pedidoActivoId && (
            <TouchableOpacity
              onPress={() => navegar("carrito")}
              className="flex-row items-center rounded-2xl border-2 border-vino bg-mostaza px-3 py-2.5 active:bg-mostaza/80"
            >
              <Image source={require("../../assets/images/cart-v.png")} className="h-12 w-12 mr-2" resizeMode="contain" />
              <View className="flex-1">
                <Text style={{ fontFamily: "LaOriental" }} className="uppercase mt-2 tracking-wider ml-2 text-lg text-vino">
                  Mi Pedido ({carrito.length})
                </Text>
              </View>
              <Image source={require("../../assets/images/right-arrow-v.png")} className="h-7 w-7 tint-vino" resizeMode="contain" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Modal Alta de Empleados */}
      {modalPerfilVisible && (
        <Modal visible transparent animationType="fade">
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
      )}
    </>
  );
}