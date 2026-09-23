import "./global.css";
import React, { useState, useEffect, useRef } from "react";
import { registrarPushToken } from "./src/services/pushNotificationClientService";
import { View, Text, Image, TouchableOpacity, Vibration } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NotificationResponse } from "expo-notifications";
import { UsuarioSeed } from "./src/data/usuariosPrecargados";
import HomeScreen, { HomeDestino } from "./src/screens/homeScreen";
import { AuthProvider } from "./src/context/AuthContext";
import { CartProvider } from "./src/context/carritoContext";
import { getSupabaseClient, supabase } from "./src/config/supabase";
import { ClienteAnonimoSesion, eliminarClienteAnonimo } from "./src/services/clienteAnonimoService";
import { obtenerModuloNotificaciones } from "./src/services/notificationsGateway";

// Pantallas
import AltaEmpleadoScreen from "./src/screens/altaEmpleadoScreen";
import AltaProductoScreen from "./src/screens/altaProducto";
import AltaMesaScreen from "./src/screens/altaMesaScreen";
import RegistroClienteScreen from "./src/screens/registroClienteScreen";
import AprobacionClientesScreen from "./src/screens/aprobacionClientesScreen";
import { LoginScreen } from "./src/screens/loginScreen";
import { CartaScreen } from "./src/screens/cartaScreen";
import { CarritoScreen } from "./src/screens/carritoScreen";
import ScreenBackground from "./src/components/ScreenBackground";
import { RegistroAnonimoScreen } from "./src/screens/registroAnonimoScreen";
import { EsperaMesaScreen } from "./src/screens/esperaMesaScreen";
import { ChatMozoScreen as ChatScreen } from "./src/screens/chatScreen";
import { ComandasScreen } from "./src/screens/comandasScreen";
import { ChatMesasScreen } from "./src/screens/chatMesasScreen";
import { MetreScreen } from "./src/screens/metreScreen";
import { EstadoPedidoScreen } from "./src/screens/estadoPedidoScreen";

const NO_PHOTO = require("./assets/images/no-photo.jpg");

const obtenerFotoUsuario = (usuario: UsuarioSeed) =>
  usuario.perfil === "dueño" ||
  usuario.perfil === "supervisor" ||
  !usuario.foto
    ? NO_PHOTO
    : { uri: usuario.foto };

type VistaPrivada =
  | "home"
  | "empleados"
  | "mesas"
  | "clientes"
  | "producto"
  | "registro_metre"
  | "metre"
  | "comandas"
  | "chat_mesas"
  | "chat_mozo"
  | "carta"
  | "carrito"
  | "estado_pedido";

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppInterna />
      </CartProvider>
    </AuthProvider>
  );
}

function AppInterna() {
  const [usuarioActual, setUsuarioActual] = useState<UsuarioSeed | null>(null);
  const [vistaPrivada, setVistaPrivada] = useState<VistaPrivada>("home");
  const [vistaPublica, setVistaPublica] = useState<"login" | "registro_cliente" | "registro_anonimo" | "espera_mesa">("login");
  const [clienteAnonimo, setClienteAnonimo] = useState<ClienteAnonimoSesion | null>(null);
  const [perfilAltaEmpleado, setPerfilAltaEmpleado] = useState<string | null>(null);
  const [tipoCartaSeleccionada, setTipoCartaSeleccionada] = useState<"comida" | "bebida" | "todo">("comida");
  const [numeroMesaCliente, setNumeroMesaCliente] = useState<number | null>(null);
  const [enEsperaRegistrado, setEnEsperaRegistrado] = useState(false);
  const [idMesaCliente, setIdMesaCliente] = useState<string | null>(null);
  const [idPedidoActivo, setIdPedidoActivo] = useState<string | null>(null);
  const [notifNuevoClientePendiente, setNotifNuevoClientePendiente] = useState(false);

  // Réplicas actualizadas del usuario para usarlas dentro del listener de notificaciones
  const usuarioActualRef = useRef(usuarioActual);
  usuarioActualRef.current = usuarioActual;

  useEffect(() => {
    const Notifications = obtenerModuloNotificaciones();
    if (!Notifications) return;

    const manejarRespuestaNotificacion = (respuesta?: NotificationResponse | null) => {
      const datosCrudos = respuesta?.notification?.request?.content?.data;
      let datos: any = datosCrudos;
      if (typeof datosCrudos === "string") {
        try {
          datos = JSON.parse(datosCrudos);
        } catch {
          datos = null;
        }
      }

      if (datos?.tipo !== "nuevo_cliente") return;

      const usuario = usuarioActualRef.current;
      const esAdmin = usuario?.perfil === "dueño" || usuario?.perfil === "supervisor";

      if (usuario && esAdmin) {
        setVistaPrivada("clientes");
      } else {
        setNotifNuevoClientePendiente(true);
      }
    };

    // App abierta tocando la notificación (cold start)
    try {
      manejarRespuestaNotificacion(Notifications.getLastNotificationResponse());
    } catch (error: any) {
      console.warn("⚠️ [Push] No se pudo leer la última respuesta de notificación:", error?.message);
    }
    // App abierta y el usuario toca la notificación
    const suscripcion = Notifications.addNotificationResponseReceivedListener(manejarRespuestaNotificacion);

    return () => suscripcion.remove();
  }, []);

  const cerrarSesion = async () => {
    Vibration.vibrate([0, 50, 50, 50]);

    try {
      const clienteId = usuarioActual?.id || clienteAnonimo?.user_id || clienteAnonimo?.id;

      if (clienteId) {
        // 1. Busca si tenía entrada en waiting_list (por si tiene mesa asignada)
        const { data: espera } = await supabase
          .from("waiting_list")
          .select("id, assigned_table_id")
          .eq("user_id", clienteId)
          .maybeSingle();

        // 2. Si tenía mesa asignada, la libera a 'free'
        if (espera?.assigned_table_id) {
          await supabase
            .from("restaurant_tables")
            .update({ availability: "free" })
            .eq("id", espera.assigned_table_id);
        }

        // 3. Borra la entrada de la lista de espera
        if (espera?.id) {
          await supabase.from("waiting_list").delete().eq("id", espera.id);
        }

        // 4. Si era anónimo, limpia el usuario temporal y su foto
        if (usuarioActual?.perfil === "cliente_anonimo" || clienteAnonimo) {
          const foto = clienteAnonimo?.client_photo || usuarioActual?.foto;
          await eliminarClienteAnonimo(clienteId, foto);
        }
      }
    } catch (err: any) {
      console.warn("⚠️ Error durante la limpieza al cerrar sesión:", err.message);
    } finally {
      getSupabaseClient()?.auth.signOut().catch((error: any) => {
        console.warn("Error al cerrar sesión en Supabase:", error.message);
      });
      setUsuarioActual(null);
      setClienteAnonimo(null);
      setNumeroMesaCliente(null);
      setIdMesaCliente(null);
      setIdPedidoActivo(null); // Limpieza al salir
      setVistaPrivada("home");
      setVistaPublica("login");
    }
  };

  const irA = (destino: HomeDestino, parametro?: string) => {
    setVistaPrivada(destino as VistaPrivada);
    if (destino === "empleados" && parametro) {
      setPerfilAltaEmpleado(parametro);
    }
    if (destino === "carta" && parametro) {
      setTipoCartaSeleccionada(parametro as "comida" | "bebida" | "todo");
    }
  };

  const volverAlInicio = () => {
    Vibration.vibrate([0, 40]);
    setVistaPrivada("home");
  };

  // 1. Vistas Públicas
  if (!usuarioActual) {
    if (vistaPublica === "registro_cliente") {
      return (
        <>
          <ScreenBackground />
          <RegistroClienteScreen
            modo="cliente"
            onVolverAlLogin={() => setVistaPublica("login")}
          />
        </>
      );
    }

    if (vistaPublica === "registro_anonimo") {
      return (
        <>
          <ScreenBackground />
          <RegistroAnonimoScreen
            onVolver={() => setVistaPublica("login")}
            onRegistroExitoso={(cliente) => {
              setClienteAnonimo(cliente);
              setVistaPublica("espera_mesa");
            }}
          />
        </>
      );
    }

    if (vistaPublica === "espera_mesa") {
      return (
        <>
          <ScreenBackground />
          <EsperaMesaScreen
            cliente={clienteAnonimo!}
            onSalir={() => {
              setClienteAnonimo(null);
              setVistaPublica("login");
            }}
          />
        </>
      );
    }

    return (
      <>
        <ScreenBackground />
        <LoginScreen
          onLoginSuccess={async (usuario) => {
            setUsuarioActual(usuario);
            registrarPushToken(usuario.id);

            if (
              notifNuevoClientePendiente &&
              (usuario.perfil === "dueño" || usuario.perfil === "supervisor")
            ) {
              setNotifNuevoClientePendiente(false);
              setVistaPrivada("clientes");
              return;
            }

            if (usuario.perfil === "cliente_registrado") {
              // 1. Consulta si ya tiene mesa activa en waiting_list
              const { data: espera } = await supabase
                .from("waiting_list")
                .select("assigned_table_id, status")
                .eq("user_id", usuario.id)
                .maybeSingle();

              if (espera?.assigned_table_id && espera.status === "seated") {
                const { data: mesaData } = await supabase
                  .from("restaurant_tables")
                  .select("id, table_number")
                  .eq("id", espera.assigned_table_id)
                  .maybeSingle();

                setIdMesaCliente(mesaData?.id ?? espera.assigned_table_id);
                setNumeroMesaCliente(mesaData?.table_number ?? 1);
                setEnEsperaRegistrado(false);
              } else {
                setNumeroMesaCliente(null);
                setEnEsperaRegistrado(true);
              }

              // 2. Consulta si tiene comanda activa en preparación
              const { data: pedidoEnCurso } = await supabase
                .from("orders")
                .select("id")
                .eq("client_id", usuario.id)
                .in("status", ["pending", "in_preparation", "ready"])
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

              if (pedidoEnCurso) {
                setIdPedidoActivo(pedidoEnCurso.id);
              } else {
                setIdPedidoActivo(null);
              }

              setVistaPrivada("home");
            } else {
              setVistaPrivada("home");
            }
          }}
          onNavigateRegistroCliente={() => {
            setVistaPublica("registro_cliente");
          }}
          onNavigateRegistroAnonimo={() => {
            setVistaPublica("registro_anonimo");
          }}
        />
      </>
    );
  }

  // 1.1 Si el cliente registrado está en espera o en la puerta
  if (usuarioActual && usuarioActual.perfil === "cliente_registrado" && enEsperaRegistrado) {
    return (
      <>
        <ScreenBackground />
        <EsperaMesaScreen
          cliente={{
            id: usuarioActual.id,
            user_id: usuarioActual.id,
            client_name: `${usuarioActual.nombres} ${usuarioActual.apellidos}`,
            client_photo: usuarioActual.foto || "",
            status: "door",
          }}
          onSalir={cerrarSesion}
          onMesaConfirmada={async (numMesa) => {
            setNumeroMesaCliente(numMesa);
            const { data: mesaData } = await supabase
              .from("restaurant_tables")
              .select("id")
              .eq("table_number", numMesa)
              .maybeSingle();
            if (mesaData?.id) setIdMesaCliente(mesaData.id);
            setEnEsperaRegistrado(false);
            setVistaPrivada("home");
          }}
        />
      </>
    );
  }

  // 2. Clasificación de roles
  const esAdmin = usuarioActual.perfil === "dueño" || usuarioActual.perfil === "supervisor";
  const esProducto =
    usuarioActual.perfil === "cocinero" || usuarioActual.perfil === "cantinero";
  const esCliente =
    usuarioActual.perfil === "cliente_registrado" || usuarioActual.perfil === "cliente_anonimo";

  // 3. Vista Home
  if (vistaPrivada === "home") {
    return (
      <SafeAreaView className="flex-1 bg-vino">
        <View className="flex-row items-center justify-between border-b-2 border-caramelo bg-vino px-5 py-3">
          <View className="flex-row items-center flex-1">
            <Image
              source={obtenerFotoUsuario(usuarioActual)}
              className="h-10 w-10 rounded-full border-2 border-mostaza mr-2"
            />
            <View>
              <Text className="text-xs font-black text-mostaza uppercase">
                {usuarioActual.nombres} {usuarioActual.apellidos}
              </Text>
              <Text className="text-[10px] font-bold text-amber-200 uppercase">
                {usuarioActual.tituloVisual}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={cerrarSesion}
            className="rounded-xl border border-terracota bg-terracota/40 px-3 py-1.5 active:bg-terracota"
          >
            <Text className="text-xs font-bold text-amber-100">Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-1">
          <ScreenBackground />
          <HomeScreen
            usuario={usuarioActual}
            onNavigate={irA}
            numeroMesa={numeroMesaCliente}
            onSolicitarMesa={() => setEnEsperaRegistrado(true)}
            pedidoActivoId={idPedidoActivo}
            onVerEstadoPedido={() => setVistaPrivada("estado_pedido")}
          />
        </View>
      </SafeAreaView>
    );
  }

  // 4. Validación de Acceso a Vistas Privadas
  const accesoValido =
    vistaPrivada === "empleados" || vistaPrivada === "mesas" || vistaPrivada === "clientes"
      ? esAdmin
      : vistaPrivada === "producto"
      ? esProducto
      : vistaPrivada === "registro_metre" || vistaPrivada === "metre"
      ? usuarioActual.perfil === "metre" || esAdmin
      : vistaPrivada === "comandas" || vistaPrivada === "chat_mesas"
      ? usuarioActual.perfil === "mozo" || esAdmin
      : vistaPrivada === "carta"
      ? esProducto || esCliente
      : vistaPrivada === "carrito" || vistaPrivada === "estado_pedido"
      ? esCliente
      : true;

  if (!accesoValido) {
    return (
      <SafeAreaView className="flex-1 bg-vino">
        <View className="flex-1">
          <ScreenBackground />
          <HomeScreen
            usuario={usuarioActual}
            onNavigate={irA}
            numeroMesa={numeroMesaCliente}
            onSolicitarMesa={() => setEnEsperaRegistrado(true)}
            pedidoActivoId={idPedidoActivo}
            onVerEstadoPedido={() => setVistaPrivada("estado_pedido")}
          />
        </View>
      </SafeAreaView>
    );
  }

  // 5. Renderizado de la Pantalla Interna Seleccionada
  return (
    <SafeAreaView className="flex-1 bg-vino">
      <View className="flex-row items-center justify-between border-b-2 border-caramelo bg-vino px-5 py-3">
        <View className="flex-row items-center flex-1">
          <Image
            source={obtenerFotoUsuario(usuarioActual)}
            className="h-10 w-10 rounded-full border-2 border-mostaza mr-2"
          />
          <View>
            <Text className="text-xs font-black text-mostaza uppercase">
              {usuarioActual.nombres} {usuarioActual.apellidos}
            </Text>
            <Text className="text-[10px] font-bold text-amber-200 uppercase">
              {usuarioActual.tituloVisual}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={volverAlInicio}
            className="rounded-xl border border-mostaza bg-mostaza/30 px-3 py-1.5 active:bg-mostaza/60"
          >
            <Image
              source={require("./assets/images/left-arrow-y.png")}
              className="h-6 w-6 mr-0.5"
              resizeMode="contain"
              accessible
              accessibilityLabel="Volver al inicio"
            />
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-1">
        <ScreenBackground />
        {vistaPrivada === "empleados" && (
          <AltaEmpleadoScreen perfilInicial={perfilAltaEmpleado ?? "cocinero"} />
        )}
        {vistaPrivada === "mesas" && <AltaMesaScreen />}
        {vistaPrivada === "clientes" && <AprobacionClientesScreen />}
        {vistaPrivada === "producto" && (
          <AltaProductoScreen
            categoria={usuarioActual.perfil === "cocinero" ? "comida" : "bebida"}
          />
        )}
        {vistaPrivada === "metre" && (
          <MetreScreen
            onCerrarSesion={cerrarSesion}
          />
        )}
        {vistaPrivada === "registro_metre" && (
          <RegistroClienteScreen
            modo="cliente"
            usuarioLogueado
            mostrarBotonVolverAlLogin={false}
            onVolverAlLogin={volverAlInicio}
          />
        )}
        {vistaPrivada === "carta" && (
          <CartaScreen
            tipo={tipoCartaSeleccionada}
            rolUsuario={usuarioActual.perfil}
            numeroMesa={numeroMesaCliente ?? undefined}
            onVolver={volverAlInicio}
            onIrAlCarrito={() => setVistaPrivada("carrito")}
            onAbrirChatMozo={() => setVistaPrivada("chat_mozo")}
          />
        )}

        {/* Carrito / Comanda */}
        {vistaPrivada === "carrito" && (
          <CarritoScreen
            numeroMesa={numeroMesaCliente || 1}
            clienteId={usuarioActual.id}
            onVolver={volverAlInicio}
            onPedidoConfirmado={(pedido) => {
              setIdPedidoActivo(pedido.id);
              setVistaPrivada("estado_pedido");
            }}
          />
        )}

        {/* Seguimiento de Estado del Pedido */}
        {vistaPrivada === "estado_pedido" && (
          <EstadoPedidoScreen
            pedidoId={idPedidoActivo || ""}
            onVolver={volverAlInicio}
            onIrAJuegos={() => {
              // Navegación a juegos de la mesa
            }}
          />
        )}

        {/* Comandas del Mozo */}
        {vistaPrivada === "comandas" && (
          <ComandasScreen usuarioActual={usuarioActual} />
        )}

        {/* Chat de Mesas del Mozo */}
        {vistaPrivada === "chat_mesas" && (
          <ChatMesasScreen
            usuarioActual={usuarioActual}
            onAbrirChatMesa={(tableId, numMesa) => {
              setIdMesaCliente(tableId);
              setNumeroMesaCliente(numMesa);
              setVistaPrivada("chat_mozo");
            }}
          />
        )}

        {/* Chat con el Mozo */}
        {vistaPrivada === "chat_mozo" && (
          <ChatScreen
            tableId={idMesaCliente || ""}
            numeroMesa={numeroMesaCliente || 1}
            usuarioActual={usuarioActual}
            onVolver={() => setVistaPrivada(usuarioActual.perfil === "mozo" ? "chat_mesas" : "home")}
          />
        )}
      </View>
    </SafeAreaView>
  );
}