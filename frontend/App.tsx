import "./global.css";
import React, { useState } from "react";
import { View, Text, Image, TouchableOpacity, Vibration } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { UsuarioSeed } from "./src/data/usuariosPrecargados";
import { LoginScreen } from "./src/screens/loginScreen";
import HomeScreen, { HomeDestino } from "./src/screens/homeScreen";
import { AuthProvider } from "./src/context/AuthContext";
import { getSupabaseClient } from "./src/config/supabase";

// Pantallas
import AltaEmpleadoScreen from "./src/screens/altaEmpleadoScreen";
import AltaProductoScreen from "./src/screens/altaProducto";
import AltaMesaScreen from "./src/screens/altaMesaScreen";
import RegistroClienteScreen from "./src/screens/registroClienteScreen";
import AprobacionClientesScreen from "./src/screens/aprobacionClientesScreen";
import ScreenBackground from "./src/components/ScreenBackground";

type VistaPrivada =
  | "home"
  | "empleados"
  | "mesas"
  | "clientes"
  | "producto"
  | "registro_metre";

export default function App() {
  return (
    <AuthProvider>
      <AppInterna />
    </AuthProvider>
  );
}

function AppInterna() {
  const [usuarioActual, setUsuarioActual] = useState<UsuarioSeed | null>(null);
  const [vistaPrivada, setVistaPrivada] = useState<VistaPrivada>("home");
  const [vistaPublica, setVistaPublica] = useState<"login" | "registro_cliente">("login");
  const [perfilAltaEmpleado, setPerfilAltaEmpleado] = useState<string | null>(null);

  const cerrarSesion = () => {
    Vibration.vibrate([0, 50, 50, 50]);
    getSupabaseClient()?.auth.signOut().catch((error: any) => {
      console.warn("Error al cerrar sesión en Supabase:", error.message);
    });
    setUsuarioActual(null);
    setVistaPrivada("home");
    setVistaPublica("login");
  };

  const irA = (destino: HomeDestino, perfil?: string) => {
    setVistaPrivada(destino);
    if (destino === "empleados" && perfil) setPerfilAltaEmpleado(perfil);
  };

  const volverAlInicio = () => {
    Vibration.vibrate([0, 40]);
    setVistaPrivada("home");
  };

  // Si no hay sesión iniciada (Público: Login o Auto-registro del Cliente)
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

    return (
      <>
        <ScreenBackground />
        <LoginScreen
          onLoginSuccess={(usuario) => {
            setUsuarioActual(usuario);
            setVistaPrivada("home");
          }}
          onNavigateRegistroCliente={() => {
            setVistaPublica("registro_cliente");
          }}
        />
      </>
    );
  }

  // Clasificación de rol
  const esAdmin = usuarioActual.perfil === "dueño" || usuarioActual.perfil === "supervisor";
  const esProducto =
    usuarioActual.perfil === "cocinero" || usuarioActual.perfil === "cantinero";

  // Si estamos en la Home, renderizamos el menú de inicio
  if (vistaPrivada === "home") {
    return (
      <SafeAreaView className="flex-1 bg-vino">
        {/* Barra superior con datos de sesión */}
        <View className="flex-row items-center justify-between border-b-2 border-caramelo bg-vino px-5 py-3">
          <View className="flex-row items-center flex-1">
            <Image
              source={{ uri: usuarioActual.foto }}
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
          <HomeScreen usuario={usuarioActual} onNavigate={irA} />
        </View>
      </SafeAreaView>
    );
  }

  // Si el usuario intenta acceder a una vista que no le corresponde, se le devuelve a la Home
  const accesoValido =
    vistaPrivada === "empleados" ||
    vistaPrivada === "mesas" ||
    vistaPrivada === "clientes"
      ? esAdmin
      : vistaPrivada === "producto"
      ? esProducto
      : vistaPrivada === "registro_metre"
      ? usuarioActual.perfil === "metre"
      : true;

  if (!accesoValido) {
    return (
      <SafeAreaView className="flex-1 bg-vino">
        <View className="flex-1">
          <ScreenBackground />
          <HomeScreen
            usuario={usuarioActual}
            onNavigate={irA}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Renderizado de la vista privada elegida
  return (
    <SafeAreaView className="flex-1 bg-vino">
      {/* Barra superior con datos de sesión + botón Volver */}
      <View className="flex-row items-center justify-between border-b-2 border-caramelo bg-vino px-5 py-3">
        <View className="flex-row items-center flex-1">
          <Image
            source={{ uri: usuarioActual.foto }}
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
        {vistaPrivada === "registro_metre" && <RegistroClienteScreen modo="metre" />}
      </View>
    </SafeAreaView>
  );
}
