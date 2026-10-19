import "./global.css";
import React, { useState, useEffect, useRef } from "react";
import { registrarPushToken } from "./src/services/pushNotificationClientService";
import { View, Text, Image, TouchableOpacity, Vibration, Linking } from "react-native";
import { SafeAreaView} from "react-native-safe-area-context";
import type {NotificationResponse } from "expo-notifications";
import { UsuarioSeed } from "./src/data/usuariosPrecargados";
import HomeScreen, { HomeDestino } from "./src/screens/homeScreen";
import { AuthProvider } from "./src/context/AuthContext";
import { CartProvider } from "./src/context/carritoContext";
import { getSupabaseClient, supabase } from "./src/config/supabase";
import { ClienteAnonimoSesion, eliminarClienteAnonimo } from "./src/services/clienteAnonimoService";
import { obtenerModuloNotificaciones } from "./src/services/notificationsGateway";
import { recuperarEstadoActivoCliente } from "./src/services/cuentaService";

// Pantallas
import AltaEmpleadoScreen from "./src/screens/altaEmpleadoScreen";
import AltaProductoScreen from "./src/screens/altaProducto";
import AltaMesaScreen from "./src/screens/altaMesaScreen";
import RegistroClienteScreen from "./src/screens/registroClienteScreen";
import AprobacionClientesScreen from "./src/screens/aprobacionClientesScreen";
import { SplashScreen } from "./src/screens/splashScreen";
import { LoginScreen } from "./src/screens/loginScreen";
import { CartaScreen } from "./src/screens/cartaScreen";
import { CarritoScreen } from "./src/screens/carritoScreen";
import ScreenBackground from "./src/components/ScreenBackground";
import { FeedbackModal } from "./src/components/FeedbackModal";
import { RegistroAnonimoScreen } from "./src/screens/registroAnonimoScreen";
import { EsperaMesaScreen } from "./src/screens/esperaMesaScreen";
import { ChatMozoScreen as ChatScreen } from "./src/screens/chatScreen";
import { ComandasScreen } from "./src/screens/comandasScreen";
import PreparacionScreen from "./src/screens/preparacionScreen";
import { ChatMesasScreen } from "./src/screens/chatMesasScreen";
import PedidosListosScreen from "./src/screens/pedidosListosScreen";
import { MetreScreen } from "./src/screens/metreScreen";
import { EstadoPedidoScreen } from "./src/screens/estadoPedidoScreen";
import { JuegosHomeScreen } from "./src/screens/juegosHome";
import { MemotestScreen } from "./src/screens/memotestScreen";
import { PuzzleScreen } from "./src/screens/puzzleScreen";
import { ShellGameScreen } from "./src/screens/shellgameScreen";
import { TicketsScreen } from "./src/screens/ticketsScreen";
import { PedidoRecibidoScreen } from "./src/screens/pedidoRecibidoScreen";
import { EncuestaScreen } from "./src/screens/encuestaScreen";
import { CuentaScreen } from "./src/screens/cuentaScreen";
import { TransaccionesScreen } from "./src/screens/transaccionesScreen";
import { EstadisticasScreen } from "./src/screens/estadisticasScreen";


const NO_PHOTO = require("./assets/images/no-photo.jpg");

const obtenerFotoUsuario = (usuario: UsuarioSeed) =>
  !usuario.foto ? NO_PHOTO : { uri: usuario.foto };

type VistaPrivada =
  | "home"
  | "empleados"
  | "mesas"
  | "clientes"
  | "producto"
  | "registro_metre"
  | "metre"
  | "comandas"
  | "preparacion"
  | "chat_mesas"
  | "pedidos_listos"
  | "chat_mozo"
  | "carta"
  | "carrito"
  | "estado_pedido"
  | "juegos"
  | "memotest"
  | "puzzle"
  | "bolita"
  | "tickets"
  | "pedido_recibido"
  | "encuesta"
  | "transacciones"
  | "estadisticas"
  | "cuenta";

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
  const [mostrarSplash, setMostrarSplash] = useState(true);
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
  const [mesaCliente, setMesaCliente] = useState<string | number>("S/N");
  // Pedido rechazado que el cliente está corrigiendo en el carrito
  const [idPedidoEnEdicion, setIdPedidoEnEdicion] = useState<string | null>(null);
  const [motivoRechazoEdicion, setMotivoRechazoEdicion] = useState<string | null>(null);
  const [notifNuevoClientePendiente, setNotifNuevoClientePendiente] = useState(false);
  const [rolTickets, setRolTickets] = useState<"cocinero" | "cantinero">("cocinero");
  const [propinaSeleccionada, setPropinaSeleccionada] = useState<number>(0);
  // Pantalla desde la que se abrió el chat del mozo, para que el botón
  // "volver" del header regrese al origen real (carta, chat_mesas, etc.)
  const [vistaOrigenChat, setVistaOrigenChat] = useState<VistaPrivada | null>(null);
  // Pantalla desde la que se abrieron los juegos (home, estado_pedido o
  // pedido_recibido), para que su botón "volver" regrese al origen real.
  const [vistaOrigenJuegos, setVistaOrigenJuegos] = useState<VistaPrivada | null>(null);

  const [avisoNotif, setAvisoNotif] = useState<{
    visible: boolean;
    tipo: "exito" | "error" | "informacion";
    titulo: string;
    mensaje: string;
  }>({ visible: false, tipo: "informacion", titulo: "", mensaje: "" });

  // Réplicas actualizadas del usuario para usarlas dentro del listener de notificaciones
  const usuarioActualRef = useRef(usuarioActual);
  usuarioActualRef.current = usuarioActual;

  const pendienteListaEsperaRef = useRef<any | null>(null);
  const pendienteComandaRef = useRef<any | null>(null);
  const pendientePedidoRef = useRef<any | null>(null);
  const pendienteChatRef = useRef<any | null>(null);

  // Réplica del cliente anónimo para el listener de notificaciones
  const clienteAnonimoRef = useRef(clienteAnonimo);
  clienteAnonimoRef.current = clienteAnonimo;


  const parsearDatosNotificacion = (crudo: any): any => {
    if (crudo && typeof crudo === "object") return crudo;
    if (typeof crudo === "string") {
      try {
        return JSON.parse(crudo);
      } catch {
        return null;
      }
    }
    return null;
  };

  const procesarPendienteListaEspera = (usuario: UsuarioSeed): boolean => {
    const pendiente = pendienteListaEsperaRef.current;
    pendienteListaEsperaRef.current = null;

    if (
      pendiente?.tipo === "actualizacion_lista_espera" &&
      (usuario.perfil === "metre" || usuario.perfil === "dueño" || usuario.perfil === "supervisor")
    ) {
      setVistaPrivada("metre");
      return true;
    }

    return false;
  };

  const procesarPendienteComanda = (usuario: UsuarioSeed): boolean => {
    const pendiente = pendienteComandaRef.current;
    pendienteComandaRef.current = null;

    if (
      pendiente?.tipo === "nuevo_pedido" ||
      pendiente?.tipo === "pedido_modificado"
    ) {
      if (usuario.perfil === "mozo" || usuario.perfil === "dueño" || usuario.perfil === "supervisor") {
        setVistaPrivada("comandas");
        return true;
      }
    }

    return false;
  };

  const procesarPendientePedido = (usuario: UsuarioSeed): boolean => {
    const pendiente = pendientePedidoRef.current;
    pendientePedidoRef.current = null;

    if (
      typeof pendiente?.orderId === "string" &&
      (usuario.perfil === "cliente_registrado" || usuario.perfil === "cliente_anonimo")
    ) {
      setIdPedidoActivo(pendiente.orderId);
      setVistaPrivada("estado_pedido");
      return true;
    }

    return false;
  };

  const esPerfilPersonal = (perfil?: string) =>
    perfil === "mozo" || perfil === "metre" || perfil === "dueño" || perfil === "supervisor";

  // Abre el chat y recuerda desde qué pantalla se llegó, para que el botón
  // "volver" del header regrese de verdad al origen (carta, chat_mesas, etc.)
  const abrirChatMozo = () => {
    setVistaOrigenChat(vistaPrivada === "chat_mozo" ? null : vistaPrivada);
    setVistaPrivada("chat_mozo");
  };

  // Abre la pantalla de juegos y recuerda desde dónde se llegó (home,
  // estado_pedido o pedido_recibido) para que su botón "volver" regrese al
  // origen correcto en vez de caer siempre en el seguimiento del pedido.
  const abrirJuegos = (origen: VistaPrivada) => {
    setVistaOrigenJuegos(origen);
    setVistaPrivada("juegos");
  };

  // Apertura del chat desde el badge "MESA #" del home del cliente. El chat
  // necesita el id real de la mesa (tableId) para suscribirse a la tabla
  // 'chats'; si no estuviera cargado, se lo busca por número de mesa y, si
  // tampoco existe, se avisa en vez de abrir un chat roto.
  const abrirChatMozoDesdeHome = async () => {
    if (!idMesaCliente) {
      let mesaId: string | null = null;

      if (numeroMesaCliente) {
        const { data: mesaData } = await supabase
          .from("restaurant_tables")
          .select("id")
          .eq("table_number", numeroMesaCliente)
          .maybeSingle();
        mesaId = mesaData?.id ?? null;
      }

      if (mesaId) {
        setIdMesaCliente(mesaId);
      } else {
        setAvisoNotif({
          visible: true,
          tipo: "informacion",
          titulo: "Chat no disponible",
          mensaje: "No se pudo identificar tu mesa para abrir el chat con el mozo.",
        });
        return;
      }
    }

    abrirChatMozo();
  };

  const abrirChatDeMesa = async (
    tableId: string,
    tableNumber: number | null,
    usuario: UsuarioSeed
  ): Promise<boolean> => {
    if (!esPerfilPersonal(usuario.perfil)) {
      // Un cliente solo puede abrir el chat de la mesa que tiene asignada.
      const { data: asignacion, error: errorAsignacion } = await supabase
        .from("waiting_list")
        .select("assigned_table_id")
        .eq("user_id", usuario.id)
        .eq("assigned_table_id", tableId)
        .eq("status", "assigned")
        .limit(1)
        .maybeSingle();

      if (errorAsignacion) {
        console.warn("⚠️ No se pudo verificar la asignación de mesa:", errorAsignacion.message);
        return false;
      }

      if (!asignacion) {
        setAvisoNotif({
          visible: true,
          tipo: "informacion",
          titulo: "Chat no disponible",
          mensaje: "Esa notificación no corresponde a la mesa que tenés asignada.",
        });
        return false;
      }
    }

    let numero = tableNumber;

    if (numero === null) {
      const { data: mesaData } = await supabase
        .from("restaurant_tables")
        .select("table_number")
        .eq("id", tableId)
        .maybeSingle();

      if (typeof mesaData?.table_number === "number") {
        numero = mesaData.table_number;
      }
    }

    setIdMesaCliente(tableId);
    setNumeroMesaCliente(numero ?? 1);
    abrirChatMozo();
    return true;
  };

  const procesarPendienteChat = async (usuario: UsuarioSeed): Promise<boolean> => {
    const pendiente = pendienteChatRef.current;
    pendienteChatRef.current = null;

    if (pendiente?.tipo !== "chat_mesa") return false;

    const tableId = typeof pendiente.table_id === "string" ? pendiente.table_id : null;
    if (!tableId) return false;

    const tableNumber = typeof pendiente.table_number === "number" ? pendiente.table_number : null;
    return abrirChatDeMesa(tableId, tableNumber, usuario);
  };

  const navegarConDatos = (datos: any) => {
    if (!datos) return;

    const usuario = usuarioActualRef.current;
    const esAdmin = usuario?.perfil === "dueño" || usuario?.perfil === "supervisor";
    const esClienteRegistrado = usuario?.perfil === "cliente_registrado";
    const esClienteAnonimo = usuario?.perfil === "cliente_anonimo" || (!usuario && !!clienteAnonimoRef.current);

    switch (datos.tipo) {
      case "nuevo_cliente":
        if (usuario && esAdmin) {
          setVistaPrivada("clientes");
        } else {
          setNotifNuevoClientePendiente(true);
        }
        return;

      case "actualizacion_lista_espera":
        if (usuario && (usuario.perfil === "metre" || esAdmin)) {
          setVistaPrivada("metre");
        } else if (!usuario) {
          pendienteListaEsperaRef.current = datos;
        }
        return;

      case "nuevo_pedido":
      case "pedido_modificado":
        if (usuario && (usuario.perfil === "mozo" || esAdmin)) {
          setVistaPrivada("comandas");
        } else if (!usuario) {
          pendienteComandaRef.current = datos;
        }
        return;

      case "estado_pedido":
        if (usuario && (esClienteRegistrado || usuario.perfil === "cliente_anonimo")) {
          setIdPedidoActivo(datos.orderId);
          setVistaPrivada("estado_pedido");
        } else if (!usuario) {
          pendientePedidoRef.current = datos;
        }
        return;

      case "nuevo_pedido_cocina":
        if (usuario?.perfil === "cocinero") {
          setRolTickets("cocinero");
          setVistaPrivada("tickets");
        }
        return;

      case "nuevo_pedido_bar":
        if (usuario?.perfil === "cantinero") {
          setRolTickets("cantinero");
          setVistaPrivada("tickets");
        }
        return;

      case "chat_mesa": {
        const chatTableId = typeof datos.table_id === "string" ? datos.table_id : null;
        if (!chatTableId) return;

        if (!usuario) {
          pendienteChatRef.current = datos;
          return;
        }

        const chatTableNumber =
          typeof datos.table_number === "number" ? datos.table_number : null;
        void abrirChatDeMesa(chatTableId, chatTableNumber, usuario);
        return;
      }

      case "mesa_asignada": {
        if (esClienteRegistrado || esClienteAnonimo) {
          const tableId = typeof datos.table_id === "string" ? datos.table_id : null;
          const tableNumber = typeof datos.table_number === "number" ? datos.table_number : null;

          if (tableId) {
            setIdMesaCliente(tableId);
            if (tableNumber === null) {
              supabase
                .from("restaurant_tables")
                .select("table_number")
                .eq("id", tableId)
                .maybeSingle()
                .then(({ data: mesaData }) => {
                  if (typeof mesaData?.table_number === "number") {
                    setNumeroMesaCliente(mesaData.table_number);
                  }
                });
            }
          }

          if (tableNumber !== null) {
            setNumeroMesaCliente(tableNumber);
          }
        }

        if (esClienteRegistrado) {
          setEnEsperaRegistrado(false);
          setVistaPrivada("home");
        } else if (esClienteAnonimo) {
          const anon = clienteAnonimoRef.current;
          if (usuario?.perfil !== "cliente_anonimo" && anon) {
            setUsuarioActual({
              id: anon.id,
              perfil: "cliente_anonimo",
              tituloVisual: "Cliente Anónimo",
              email: "",
              clave: "",
              nombres: anon.client_name,
              apellidos: "Anónimo",
              documento: "",
              foto: anon.client_photo,
              icono: "🕶️",
            });
            setClienteAnonimo(anon);
          }
          setEnEsperaRegistrado(false);
          setVistaPrivada("home");
        }
        return;
      }

      // Factura del cliente anonimo: abre el PDF para descargarlo
      case "factura": {
        const urlFactura = typeof datos.urlFactura === "string" ? datos.urlFactura : null;
        if (!urlFactura) return;

        Linking.openURL(urlFactura).catch(() => {
          Vibration.vibrate([0, 100, 50, 100, 50, 200]);
          setAvisoNotif({
            visible: true,
            tipo: "error",
            titulo: "Factura no disponible",
            mensaje: "No se pudo abrir la factura. Intentá nuevamente en unos minutos.",
          });
        });
        return;
      }
    }

    // Sin "tipo": estado del pedido para el cliente (orderId + status)
    if (datos.orderId && datos.status) {
      if (usuario && (esClienteRegistrado || usuario.perfil === "cliente_anonimo")) {
        setIdPedidoActivo(datos.orderId);
        setVistaPrivada("estado_pedido");
      } else if (!usuario) {
        pendientePedidoRef.current = datos;
      }
      return;
    }

    // Sin "tipo": cuenta aprobada/rechazada para el cliente (statusActualizado)
    if (typeof datos.statusActualizado === "string") {
      const aprobada = datos.statusActualizado === "approved";
      setAvisoNotif({
        visible: true,
        tipo: aprobada ? "exito" : "informacion",
        titulo: aprobada ? "¡Cuenta Aprobada! 🎉" : "Actualización de cuenta",
        mensaje: aprobada
          ? "Ya podés ingresar a la app del restaurante."
          : "Tu solicitud de registro fue rechazada por el local.",
      });
      return;
    }
  };

  const manejarRespuestaNotificacion = (respuesta?: NotificationResponse | null) => {
    const datos = parsearDatosNotificacion(respuesta?.notification?.request?.content?.data);
    if (datos) navegarConDatos(datos);
  };

  

  useEffect(() => {
    const Notifications = obtenerModuloNotificaciones();
    if (!Notifications) return;

    // App abierta tocando la notificación (cold start)
    const leerUltimaRespuesta = async () => {
      try {
        const respuesta = Notifications.getLastNotificationResponseAsync
          ? await Notifications.getLastNotificationResponseAsync()
          : Notifications.getLastNotificationResponse();
        manejarRespuestaNotificacion(respuesta);
      } catch (error: any) {
        console.warn("⚠️ [Push] No se pudo leer la última respuesta de notificación:", error?.message);
      }
    };

    void leerUltimaRespuesta();

    // App abierta y el usuario toca la notificación del sistema → navega directo
    const suscripcionRespuesta = Notifications.addNotificationResponseReceivedListener(
      manejarRespuestaNotificacion
    );



    return () => {
      suscripcionRespuesta.remove();
    };
  }, []);

  const cerrarSesion = async () => {
    Vibration.vibrate([0, 50, 50, 50]);

    try {
      const clienteId = usuarioActual?.id || clienteAnonimo?.user_id || clienteAnonimo?.id;

      if (clienteId) {
        // 1. Verificamos si tiene un pedido activo que impida desalojarlo
        const { data: pedidoActivo } = await supabase
          .from("orders")
          .select("id")
          .eq("client_id", clienteId)
          .not("status", "in", '("paid","cancelled")')
          .limit(1)
          .maybeSingle();

        // 2. SOLO si NO tiene pedido activo liberamos la mesa y la lista de espera
        // (es decir, si solo estaba esperando o si ya pagó)
        if (!pedidoActivo) {
          const { data: esperas } = await supabase
            .from("waiting_list")
            .select("id, assigned_table_id")
            .eq("user_id", clienteId);

          const mesaIds = Array.from(
            new Set(
              (esperas ?? [])
                .map((entrada) => entrada.assigned_table_id)
                .filter((id): id is string => Boolean(id))
            )
          );

          for (const mesaId of mesaIds) {
            await supabase
              .from("restaurant_tables")
              .update({ availability: "free", status: "available", current_client_id: null })
              .eq("id", mesaId);
          }

          if (esperas && esperas.length > 0) {
            await supabase.from("waiting_list").delete().eq("user_id", clienteId);
          }

          // Si era anónimo y ya no tiene nada pendiente, limpiamos el temporal
          if (usuarioActual?.perfil === "cliente_anonimo" || clienteAnonimo) {
            const foto = clienteAnonimo?.client_photo || usuarioActual?.foto;
            await eliminarClienteAnonimo(clienteId, foto);
          }
        }
      }
    } catch (err: any) {
      console.warn("⚠️ Error durante el cierre de sesión:", err.message);
    } finally {
      getSupabaseClient()?.auth.signOut().catch((error: any) => {
        console.warn("Error al cerrar sesión en Supabase:", error.message);
      });
      setUsuarioActual(null);
      setClienteAnonimo(null);
      setNumeroMesaCliente(null);
      setIdMesaCliente(null);
      setIdPedidoActivo(null);
      setIdPedidoEnEdicion(null);
      setMotivoRechazoEdicion(null);
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
    // Si está editando una comanda rechazada, la casita lo lleva a la carta
    // para que pueda seguir sumando o viendo platos sin bloquearse
    
    setVistaPrivada("home");
  };

  if (mostrarSplash) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFF6EC" }}>
        <SplashScreen onFinish={() => setMostrarSplash(false)} duracionMinimaMs={3600} />
      </View>
    );
  }

  const renderVista = () => {
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
            onMesaConfirmada={async (numMesa) => {
              const anon = clienteAnonimo;
              if (!anon) return;
              const { data: mesaData } = await supabase
                .from("restaurant_tables")
                .select("id")
                .eq("table_number", numMesa)
                .maybeSingle();
              setIdMesaCliente(mesaData?.id ?? null);
              setNumeroMesaCliente(numMesa);
              setUsuarioActual({
                id: anon.id,
                perfil: "cliente_anonimo",
                tituloVisual: "Cliente Anónimo",
                email: "",
                clave: "",
                nombres: anon.client_name,
                apellidos: "Anónimo",
                documento: "",
                foto: anon.client_photo,
                icono: "🕶️",
              });
              setClienteAnonimo(anon);
              setVistaPrivada("home");
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
            void registrarPushToken(usuario.id);

            // 1. Manejo de pendientes por notificaciones push (si las hubiera)
            if (procesarPendienteListaEspera(usuario)) return;
            if (procesarPendienteComanda(usuario)) return;
            if (procesarPendientePedido(usuario)) return;
            if (await procesarPendienteChat(usuario)) return;

            if (
              notifNuevoClientePendiente &&
              (usuario.perfil === "dueño" || usuario.perfil === "supervisor")
            ) {
              setNotifNuevoClientePendiente(false);
              setVistaPrivada("clientes");
              return;
            }

            // 2. RECUPERACIÓN DE SESIÓN ACTIVA (Si es cliente registrado o anónimo)
            if (usuario.perfil === "cliente_registrado" || usuario.perfil === "cliente_anonimo") {
              const estado = await recuperarEstadoActivoCliente(usuario.id);

              if (estado.pantallaDestino !== "inicio") {
                // Restauramos los datos de la mesa y el pedido
                if (estado.numeroMesa) {
                  setNumeroMesaCliente(Number(estado.numeroMesa) || null);
                  setMesaCliente(estado.numeroMesa);
                }
                if (estado.mesaId) {
                  setIdMesaCliente(estado.mesaId);
                }
                if (estado.pedidoId) {
                  setIdPedidoActivo(estado.pedidoId);
                }
                if (estado.propina !== undefined) {
                  setPropinaSeleccionada(estado.propina);
                }

                // Desactivamos la puerta/espera porque ya tiene estadía activa
                setEnEsperaRegistrado(false);

                // Lo mandamos directo a la pantalla que le corresponde
                setVistaPrivada(estado.pantallaDestino as any);
                return;
              }

              // Si no tiene mesa ni comanda activa previa, hace el flujo normal de puerta
              setNumeroMesaCliente(null);
              setIdMesaCliente(null);
              setIdPedidoActivo(null);
              setEnEsperaRegistrado(true);
              setVistaPrivada("home");
            } else {
              // Empleados, mozos, metre, cocinero, etc.
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

            // Consulta si tiene comanda activa en preparación, igual que el login normal.
            // Sin esto el footer del home muestra "Mi Pedido" aunque haya pedido en curso.
            const { data: pedidoEnCurso } = await supabase
              .from("orders")
              .select("id")
              .eq("client_id", usuarioActual.id)
              .in("status", ["pending", "in_preparation", "ready"])
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            setIdPedidoActivo(pedidoEnCurso?.id ?? null);
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
                {usuarioActual.tituloVisual ? usuarioActual.tituloVisual === "Cliente_registrado" ? "CLIENTE" : usuarioActual.tituloVisual === "Cliente_anonimo" ? "INVITADO" : usuarioActual.tituloVisual : ""}
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
            pedidoActivoId={idPedidoEnEdicion ? null : idPedidoActivo}
            onVerEstadoPedido={() => setVistaPrivada("estado_pedido")}
            onAbrirChatMozo={esCliente ? abrirChatMozoDesdeHome : undefined}
            onIrAJuegos={() => abrirJuegos("home")}
          />
        </View>
      </SafeAreaView>
    );
  }

  // 4. Validación de Acceso a Vistas Privadas
  const accesoValido =
    vistaPrivada === "empleados" || vistaPrivada === "mesas" || vistaPrivada === "clientes" || vistaPrivada === "estadisticas"
      ? esAdmin
      : vistaPrivada === "producto" || vistaPrivada === "preparacion"
      ? esProducto
      : vistaPrivada === "tickets"
      ? usuarioActual.perfil === "cocinero" || usuarioActual.perfil === "cantinero"
      : vistaPrivada === "registro_metre" || vistaPrivada === "metre"
      ? usuarioActual.perfil === "metre" || esAdmin
      : vistaPrivada === "comandas" || vistaPrivada === "chat_mesas" || vistaPrivada === "pedidos_listos" || vistaPrivada === "transacciones"
      ? usuarioActual.perfil === "mozo" || esAdmin
      : vistaPrivada === "carta"
      ? esProducto || esCliente
      : vistaPrivada === "carrito" || vistaPrivada === "estado_pedido" || vistaPrivada === "juegos" || vistaPrivada === "bolita" || vistaPrivada === "puzzle"
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
            onAbrirChatMozo={esCliente ? abrirChatMozoDesdeHome : undefined}
            onIrAJuegos={() => abrirJuegos("home")}
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
            <Text className="text-[10px] uppercase font-bold text-amber-200">
              {usuarioActual.tituloVisual == "Cliente_registrado" ? "CLIENTE" : usuarioActual.tituloVisual == "Cliente_anonimo" ? "INVITADO" : usuarioActual.tituloVisual}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={volverAlInicio}
            className="rounded-xl border border-mostaza bg-mostaza/30 px-3 py-1.5 active:bg-mostaza/60"
          >
            <Image
              source={require("./assets/images/home-y.png")}
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
        {vistaPrivada === "preparacion" && (
          <PreparacionScreen
            rol={usuarioActual.perfil === "cantinero" ? "cantinero" : "cocinero"}
          />
        )}
        {vistaPrivada === "metre" && (
          <MetreScreen
            onCerrarSesion={cerrarSesion}
          />
        )}
        {vistaPrivada === "registro_metre" && (
          <RegistroClienteScreen
            modo="metre"
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
            onVolver={() => {
              if (idPedidoEnEdicion) {
                setVistaPrivada("carrito");
              } else {
                volverAlInicio();
              }
            }}
            onIrAlCarrito={() => setVistaPrivada("carrito")}
            onAbrirChatMozo={abrirChatMozo}
          />
        )}

        {/* Carrito / Comanda */}
        {vistaPrivada === "carrito" && (
          <CarritoScreen
            numeroMesa={numeroMesaCliente || 1}
            clienteId={usuarioActual.id}
            onVolver={volverAlInicio}
            pedidoIdEnEdicion={idPedidoEnEdicion}
            motivoRechazo={motivoRechazoEdicion}
            onCerrarEdicion={() => {
              setIdPedidoEnEdicion(null);
              setMotivoRechazoEdicion(null);
              setVistaPrivada("estado_pedido");
            }}
            onPedidoConfirmado={(pedido) => {
              setIdPedidoActivo(pedido.id);
              setIdPedidoEnEdicion(null);
              setMotivoRechazoEdicion(null);
              setVistaPrivada("estado_pedido");
            }}
          />
        )}


        {/* Seguimiento de Estado del Pedido */}
        {vistaPrivada === "estado_pedido" && (
          <EstadoPedidoScreen
            pedidoId={idPedidoActivo || ""}
            onVolver={volverAlInicio}
            onIrAJuegos={() => abrirJuegos("estado_pedido")}
            onConfirmarRecepcion={(_id, mesa) => {
              setMesaCliente(mesa);
              setVistaPrivada("pedido_recibido" as any);
            }}
            onEditarComanda={(motivo) => {
              if (!idPedidoActivo) return;
              setIdPedidoEnEdicion(idPedidoActivo);
              setMotivoRechazoEdicion(motivo);
              setVistaPrivada("carrito");
            }}
          />
        )}

        {/* Pantalla Post-Entrega: Juegos, Encuesta, Pedir Cuenta */}
        {vistaPrivada === "pedido_recibido" && (
          <PedidoRecibidoScreen
            pedidoId={idPedidoActivo || ""}
            numeroMesa={mesaCliente}
            onIrAJuegos={() => abrirJuegos("pedido_recibido")}
            onIrAEncuesta={() => setVistaPrivada("encuesta" as any)}
            onPedirCuenta={(_id, porcentaje) => {
              setPropinaSeleccionada(porcentaje);
              setVistaPrivada("cuenta" as any);
            }}
            onVolver={volverAlInicio}
          />
        )}

        {vistaPrivada === "encuesta" && (
          <EncuestaScreen
            pedidoId={idPedidoActivo || ""}
            userId={usuarioActual?.id}
            userRole={usuarioActual?.perfil || "cliente_registrado"}
            onVolver={() => setVistaPrivada("pedido_recibido" as any)}
          />
        )}

        {vistaPrivada === "cuenta" && (
          <CuentaScreen
            pedidoId={idPedidoActivo || ""}
            propinaPorcentaje={propinaSeleccionada}
            onPagoCompletado={async () => {
              // Limpia los identificadores de la estadía
              setIdPedidoActivo(null);
              setMesaCliente("S/N");
              setNumeroMesaCliente(null);
              setIdMesaCliente(null);
              
              // Desloguea al cliente y lo manda al login limpio
              await cerrarSesion();
            }}
            onVolver={async () => {
              // Si aprieta la flecha de volver arriba en la pantalla de pago,
              // cierra sesión y manda al login
              await cerrarSesion();
            }}
          />
        )}

        {/* Juegos de la Mesa */}
        {vistaPrivada === "juegos" && (
          <JuegosHomeScreen
            onVolver={() => setVistaPrivada(vistaOrigenJuegos ?? "estado_pedido")}
            onIrAMemotest={() => setVistaPrivada("memotest")}
            onIrAPuzzle={() => setVistaPrivada("puzzle")}
            onIrABolita={() => setVistaPrivada("bolita")}
            pedidoId={idPedidoActivo}
            clienteId={usuarioActual?.id}
            puedeGanarDescuento={usuarioActual?.perfil === "cliente_registrado"}
          />
        )}

        {/* Memotest */}
        {vistaPrivada === "memotest" && (
          <MemotestScreen
            onVolver={() => setVistaPrivada("juegos")}
            pedidoId={idPedidoActivo}
            clienteId={usuarioActual?.id}
            puedeGanarDescuento={usuarioActual?.perfil === "cliente_registrado"}
          />
        )}

        {/* Puzzle de ordenar fichas */}
        {vistaPrivada === "puzzle" && (
          <PuzzleScreen
            onVolver={() => setVistaPrivada("juegos")}
            pedidoId={idPedidoActivo}
            clienteId={usuarioActual?.id}
            puedeGanarDescuento={usuarioActual?.perfil === "cliente_registrado"}
          />
        )}

        {/* Juego de la bolita */}
        {vistaPrivada === "bolita" && (
          <ShellGameScreen
            onVolver={() => setVistaPrivada("juegos")}
            pedidoId={idPedidoActivo}
            clienteId={usuarioActual?.id}
            puedeGanarDescuento={usuarioActual?.perfil === "cliente_registrado"}
          />
        )}

        {/* Comandas del Mozo */}
        {vistaPrivada === "comandas" && (
          <ComandasScreen usuarioActual={usuarioActual} />
        )}

        {/* Pedidos listos del Mozo */}
        {vistaPrivada === "pedidos_listos" && (
          <PedidosListosScreen />
        )}

        {/* Transacciones del Mozo */}
        {vistaPrivada === "transacciones" && (
          <TransaccionesScreen onVolver={volverAlInicio} />
        )}

        {/* Estadísticas de Encuestas (Dueño / Supervisor) */}
        {vistaPrivada === "estadisticas" && (
          <EstadisticasScreen onVolver={volverAlInicio} />
        )}

        {/* Tickets de Cocina / Bar */}
        {vistaPrivada === "tickets" && (
          <TicketsScreen rol={rolTickets} />
        )}

        {/* Chat de Mesas del Mozo */}
        {vistaPrivada === "chat_mesas" && (
          <ChatMesasScreen
            usuarioActual={usuarioActual}
            onAbrirChatMesa={(tableId, numMesa) => {
              setIdMesaCliente(tableId);
              setNumeroMesaCliente(numMesa);
              abrirChatMozo();
            }}
          />
        )}

        {/* Chat con el Mozo */}
        {vistaPrivada === "chat_mozo" && (
          <ChatScreen
            tableId={idMesaCliente || ""}
            numeroMesa={numeroMesaCliente || 1}
            usuarioActual={usuarioActual}
            onVolver={() =>
              setVistaPrivada(
                vistaOrigenChat ??
                  (esPerfilPersonal(usuarioActual.perfil) ? "chat_mesas" : "home")
              )
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
  };

  // Banner in-app + avisos globales superpuestos a cualquier vista
  return (
    <>
      {renderVista()}
      
      <FeedbackModal
        visible={avisoNotif.visible}
        tipo={avisoNotif.tipo}
        titulo={avisoNotif.titulo}
        mensaje={avisoNotif.mensaje}
        onClose={() => setAvisoNotif((prev) => ({ ...prev, visible: false }))}
      />
    </>
  );
}

