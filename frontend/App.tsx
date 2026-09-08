import "./global.css";
import React, { useState } from "react";
import { View, Text, TouchableOpacity, Vibration } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { UsuarioSeed } from "./src/data/usuariosPrecargados";
import { LoginScreen } from "./src/screens/loginScreen";
import HomeScreen, { HomeDestino } from "./src/screens/homeScreen";

// Pantallas
import AltaEmpleadoScreen from "./src/screens/altaEmpleadoScreen";
import AltaProductoScreen from "./src/screens/altaProducto";
import AltaMesaScreen from "./src/screens/altaMesaScreen";
import RegistroClienteScreen from "./src/screens/registroClienteScreen";
import AprobacionClientesScreen from "./src/screens/aprobacionClientesScreen";

type VistaPrivada =
  | "home"
  | "empleados"
  | "mesas"
  | "clientes"
  | "producto"
  | "registro_metre";

export default function App() {
  const [usuarioActual, setUsuarioActual] = useState<UsuarioSeed | null>(null);
  const [vistaPrivada, setVistaPrivada] = useState<VistaPrivada>("home");
  const [vistaPublica, setVistaPublica] = useState<"login" | "registro_cliente">("login");

  const cerrarSesion = () => {
    Vibration.vibrate([0, 50, 50, 50]);
    setUsuarioActual(null);
    setVistaPrivada("home");
    setVistaPublica("login");
  };

  const irA = (destino: HomeDestino) => {
    setVistaPrivada(destino);
  };

  const volverAlInicio = () => {
    Vibration.vibrate([0, 40]);
    setVistaPrivada("home");
  };

  // Si no hay sesión iniciada (Público: Login o Auto-registro del Cliente)
  if (!usuarioActual) {
    if (vistaPublica === "registro_cliente") {
      return (
        <RegistroClienteScreen
          modo="cliente"
          onVolverAlLogin={() => setVistaPublica("login")}
        />
      );
    }

    return (
      <LoginScreen
        onLoginSuccess={(usuario) => {
          setUsuarioActual(usuario);
          setVistaPrivada("home");
        }}
        onNavigateRegistroCliente={() => {
          setVistaPublica("registro_cliente");
        }}
      />
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
            <Text className="text-2xl mr-2">{usuarioActual.icono}</Text>
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

        <HomeScreen usuario={usuarioActual} onNavigate={irA} />
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
        <HomeScreen
          usuario={usuarioActual}
          onNavigate={irA}
        />
      </SafeAreaView>
    );
  }

  // Renderizado de la vista privada elegida
  return (
    <SafeAreaView className="flex-1 bg-vino">
      {/* Barra superior con datos de sesión + botón Volver */}
      <View className="flex-row items-center justify-between border-b-2 border-caramelo bg-vino px-5 py-3">
        <View className="flex-row items-center flex-1">
          <Text className="text-2xl mr-2">{usuarioActual.icono}</Text>
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
            <Text className="text-xs font-bold text-mostaza">← Inicio</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={cerrarSesion}
            className="rounded-xl border border-terracota bg-terracota/40 px-3 py-1.5 active:bg-terracota"
          >
            <Text className="text-xs font-bold text-amber-100">Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-1">
        {vistaPrivada === "empleados" && <AltaEmpleadoScreen />}
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
