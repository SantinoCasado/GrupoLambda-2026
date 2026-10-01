import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Image, Vibration, Modal } from "react-native";
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
  | "metre"
  | "carta"
  | "carrito"
  | "comandas"
  | "chat_mesas";

const PERFILES_EMPLEADO = [
  { id: "cocinero", label: "Cocinero", imagen: require("../../assets/images/chef-y.png") },
  { id: "cantinero", label: "Cantinero", imagen: require("../../assets/images/martini-glass-y.png") },
  { id: "mozo", label: "Mozo", imagen: require("../../assets/images/serving-y.png") },
  { id: "metre", label: "Metre", imagen: require("../../assets/images/bow-y.png") },
  { id: "supervisor", label: "Supervisor", imagen: require("../../assets/images/supervisor-y.png") },
];

interface Props {
  usuario: UsuarioSeed;
  onNavigate: (destino: HomeDestino, tipoCarta?: "comida" | "bebida" | "postre" | "todo" | string) => void;
  numeroMesa?: number | null;
  onSolicitarMesa?: () => void;
  pedidoActivoId?: string | null;
  onVerEstadoPedido?: () => void;
}

export default function HomeScreen({ usuario, onNavigate, numeroMesa, onSolicitarMesa, pedidoActivoId, onVerEstadoPedido }: Props) {
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
        contentContainerStyle={{
          // flexGrow deja que el contenido se estire a la altura de la pantalla;
          // sin esto el flex-1 de los botones no tiene altura que repartir.
          flexGrow: 1,
          paddingBottom: esCliente ? 140 : esAdmin ? 0 : 50,
        }}
        showsVerticalScrollIndicator={false}
      >
        <StatusBar style="light" />

        {/* Saludo */}
        <View className="px-6 pt-5">
          
          <Image
            source={require("../../assets/images/logo-name.png")}
            className="mt-5 h-20 w-auto self-center"
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
        <View className={`px-6 pt-6 ${esAdmin ? "flex-1" : ""}`}>
          {/* 1. GESTIÓN ADMIN */}
          {esAdmin && (
            <View className="flex-1 gap-y-4">
              <Text className="mb-1 text-xs font-bold text-vino uppercase">Gestión del Restaurante</Text>

              {/* Acción principal: absorbe la altura sobrante para que los tres
                  botones de abajo queden pegados al final de la sección. */}
              <TouchableOpacity
                onPress={() => navegar("clientes")}
                className="flex-1 items-center justify-center rounded-2xl border-2 border-mostaza bg-vino px-6 active:bg-terracota"
                style={{ minHeight: 220 }}
              >
                <Image
                  source={require("../../assets/images/userAprovation-y.png")}
                  className="h-32 w-32"
                  resizeMode="contain"
                />
                <Text
                  style={{ fontFamily: "LaOriental" }}
                  className="mt-3 text-center text-2xl uppercase tracking-wider text-mostaza"
                >
                  Aprobación de Clientes
                </Text>
              </TouchableOpacity>

              {/* Segunda acción: más grande que las de abajo, más chica que la principal */}
              <TouchableOpacity
                onPress={() => Vibration.vibrate([0, 40])}
                className="flex-row items-center justify-center rounded-2xl border-2 border-mostaza bg-vino px-6 py-4 active:bg-terracota"
              >
                <Image
                  source={require("../../assets/images/audit-y.png")}
                  className="h-12 w-12"
                  resizeMode="contain"
                />
                <Text
                  style={{ fontFamily: "LaOriental" }}
                  className="ml-4 text-lg uppercase tracking-wider text-mostaza"
                >
                  Estadísticas
                </Text>
              </TouchableOpacity>

              {/* Acciones secundarias */}
              <View className="mb-5  flex-row gap-2">
                <TouchableOpacity
                  onPress={() => {
                    Vibration.vibrate([0, 40]);
                    setModalPerfilVisible(true);
                  }}
                  className="flex-1 items-center justify-center rounded-2xl border-2 border-mostaza bg-vino p-3 active:bg-terracota"
                >
                  <Image
                    source={require("../../assets/images/employeeRegistration-y.png")}
                    className="h-10 w-10"
                    resizeMode="contain"
                  />
                  <Text
                    style={{ fontFamily: "LaOriental" }}
                    className="mt-2 text-center text-xs uppercase tracking-wide text-mostaza"
                  >
                    Alta de Empleados
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => navegar("mesas")}
                  className="flex-1 items-center justify-center rounded-2xl border-2 border-mostaza bg-vino p-3 active:bg-terracota"
                >
                  <Image
                    source={require("../../assets/images/table-y.png")}
                    className="h-10 w-10"
                    resizeMode="contain"
                  />
                  <Text
                    style={{ fontFamily: "LaOriental" }}
                    className="mt-2 text-center text-xs uppercase tracking-wide text-mostaza"
                  >
                    Mesas Y QR
                  </Text>
                </TouchableOpacity>
              </View>
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
                  source={perfil === "cocinero" ? require("../../assets/images/employeeRegistration-y.png") : require("../../assets/images/employeeRegistration-y.png")}
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

              {/* Botón 2: Ver Carta */}
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
                    Ver Carta
                  </Text>
                  <Text className="text-[11px] font-semibold text-amber-100">
                    Consultar y dar de baja productos
                  </Text>
                </View>
                <Image source={require("../../assets/images/right-arrow-y.png")} className="h-7 w-7" resizeMode="contain" />
              </TouchableOpacity>
            </View>
          )}

          {/* 3. CLIENTE (Platos, Bebidas y Carrito) */}
          {esCliente && (
            <View className="gap-y-4">
              <View className="mb-1 flex-row items-center justify-between">
                <Text className="text-xs font-bold text-vino uppercase">Atención en Salón</Text>
                {numeroMesa ? (
                  <View className="rounded-lg border border-vino bg-mostaza px-2 py-0.5">
                    <Text className="text-xs font-bold text-vino">MESA #{numeroMesa}</Text>
                  </View>
                ) : null}
              </View>

              {!numeroMesa ? (
                /* ESTADO 1: SIN MESA ASIGNADA */
                <TouchableOpacity
                  onPress={onSolicitarMesa}
                  className="flex-row items-center rounded-2xl border-2 border-mostaza bg-vino p-4 active:bg-terracota shadow-md"
                >
                  <Image source={require("../../assets/images/guest-c.png")} className="h-8 w-8 mr-3" resizeMode="contain" />
                  <View className="flex-1">
                    <Text style={{ fontFamily: "LaOriental" }} className="text-base uppercase tracking-wider text-mostaza font-bold">
                      Solicitar Mesa en Puerta
                    </Text>
                    <Text className="text-[11px] font-semibold text-amber-100">
                      Escaneá el QR de la entrada para anotarte en la lista de espera
                    </Text>
                  </View>
                  <Image source={require("../../assets/images/right-arrow-y.png")} className="h-6 w-6" resizeMode="contain" />
                </TouchableOpacity>
              ) : (
                /* ESTADO 2: YA TIENE MESA ASIGNADA */
                <>
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
                        Ver comidas y agregar al carrito
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
                        Ver tragos y bebidas disponibles
                      </Text>
                    </View>
                    <Image source={require("../../assets/images/right-arrow-y.png")} className="h-6 w-6" resizeMode="contain" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* 4. METRE */}
          {perfil === "metre" && (
            <View className="gap-y-4">
              <Text className="mb-1 text-xs font-bold text-vino uppercase">Operación del Salón</Text>

              {/* Botón 1: Gestión de Mesas y Espera */}
              <TouchableOpacity
                onPress={() => navegar("metre")}
                className="items-center justify-center rounded-2xl border-2 border-mostaza bg-vino p-6 active:bg-terracota shadow-md"
              >
                <Image
                  source={require("../../assets/images/table-y.png")}
                  className="mb-3 h-48 w-48"
                  resizeMode="contain"
                />
                <Text
                  style={{ fontFamily: "LaOriental" }}
                  className="text-center text-2xl uppercase tracking-wider text-mostaza"
                >
                  Gestión de Mesas y Espera
                </Text>
              </TouchableOpacity>

              {/* Botón 2: Registrar Cliente en Puerta */}
              <TouchableOpacity
                onPress={() => navegar("registro_metre")}
                className="items-center justify-center rounded-2xl border-2 border-mostaza bg-vino p-6 active:bg-terracota shadow-md"
              >
                <Image
                  source={require("../../assets/images/audit-y.png")}
                  className="mb-3 h-14 w-14"
                  resizeMode="contain"
                />
                <Text
                  style={{ fontFamily: "LaOriental" }}
                  className="text-center text-sm uppercase tracking-wider text-mostaza"
                >
                  Registrar Cliente
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 5. MOZO */}
          {perfil === "mozo" && (
            <View className="gap-y-1">
              <Text className="mb-1 text-xs font-bold text-vino uppercase">Operación de Salón</Text>

              <TouchableOpacity
                onPress={() => navegar("comandas")}
                className=" h-80 my-5 items-center justify-center rounded-2xl border-2 border-mostaza bg-vino p-6 active:bg-terracota shadow-md"
              >
                <Image
                  source={require("../../assets/images/serving-y.png")}
                  className="mb-3 h-48 w-48"
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
                onPress={() => navegar("chat_mesas")}
                className="items-center justify-center rounded-2xl border-2 border-mostaza bg-vino p-3 active:bg-terracota shadow-md"
              >
                <Image
                  source={require("../../assets/images/table-y.png")}
                  className="mb-1 h-24 w-24"
                  resizeMode="contain"
                />
                <Text
                  style={{ fontFamily: "LaOriental" }}
                  className="text-center text-xl uppercase tracking-wider text-mostaza"
                >
                  Chat Mesas
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 6. OTROS */}
          {!esAdmin && !esProducto && !esCliente && perfil !== "metre" && perfil !== "mozo" && (
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

      {/* Botón fijo al pie: Mi Pedido, o Ver Estado si hay pedido activo (solo clientes) */}
      {esCliente && (
        <View className="px-6 pb-6 pt-2">
          {pedidoActivoId ? (
            <TouchableOpacity
              onPress={onVerEstadoPedido}
              className="flex-row items-center rounded-2xl border-2 border-emerald-600 bg-emerald-700/90 p-4 shadow-md active:bg-emerald-800"
            >
              <Image source={require("../../assets/images/cart-w.png")} className="h-8 w-8 mr-3" resizeMode="contain" />
              <View className="flex-1">
                <Text style={{ fontFamily: "LaOriental" }} className="text-base uppercase text-white">
                  Ver Estado de mi Pedido
                </Text>
                <Text className="text-xs text-emerald-100">
                  Pedido en preparación. Revisá tiempos y avance.
                </Text>
              </View>
              <Image source={require("../../assets/images/right-arrow-w.png")} className="h-6 w-6" resizeMode="contain" />
            </TouchableOpacity>
          ) : (
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
              <Image source={require("../../assets/images/right-arrow-v.png")} className="h-6 w-6 tint-vino" resizeMode="contain" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* MODAL: Selección de Puesto / Rol. Montado solo al abrirlo: en Android
          cada Modal crea una ventana nativa aunque visible={false}. */}
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