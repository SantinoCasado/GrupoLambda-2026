// App.tsx
import "./global.css";
import React, { useState } from "react";
import { View, Text, TouchableOpacity, Vibration } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { UsuarioSeed } from "./src/data/usuariosPrecargados";
import { LoginScreen } from "./src/screens/loginScreen";

// Importamos las pantallas
import AltaEmpleadoScreen from "./src/screens/altaEmpleadoScreen";
import AltaPlatoScreen from "./src/screens/altaPlatoScreen";

export default function App() {
  const [usuarioActual, setUsuarioActual] = useState<UsuarioSeed | null>(null);
  const [vistaActual, setVistaActual] = useState<string>("menu_principal");

  const cerrarSesion = () => {
    Vibration.vibrate([0, 50, 50, 50]);
    setUsuarioActual(null);
    setVistaActual("menu_principal");
  };

  // Si no hay usuario logueado -> Mostramos Login
  if (!usuarioActual) {
    return (
      <LoginScreen
        onLoginSuccess={(usuario) => {
          setUsuarioActual(usuario);
          setVistaActual("menu_principal");
        }}
        onNavigateRegistroCliente={() => {
          // Navegación al Punto 5 (cuando lo implementemos)
        }}
      />
    );
  }

  // Si ya inició sesión, mostramos barra superior con botón de Cierre de Sesión obligatorio
  return (
    <SafeAreaView className="flex-1 bg-vino">
      {/* Barra de Usuario y Cierre de Sesión */}
      <View className="flex-row items-center justify-between border-b-2 border-caramelo bg-vino px-5 py-3">
        <View className="flex-row items-center">
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

      {/* Ruteo según el perfil del usuario */}
      <View className="flex-1">
        {/* Caso 1: Dueño o Supervisor -> Pueden Agregar Empleados (Punto 1) */}
        {(usuarioActual.perfil === "dueño" || usuarioActual.perfil === "supervisor") && (
          <AltaEmpleadoScreen />
        )}

        {/* Caso 2: Cocinero -> Puede Agregar Platos (Punto 2) */}
        {usuarioActual.perfil === "cocinero" && <AltaPlatoScreen />}

        {/* Casos siguientes (Cantinero, Metre, Mozo, Clientes) */}
        {usuarioActual.perfil === "cantinero" && (
          <View className="flex-1 items-center justify-center p-6">
            <Text className="text-center text-lg font-black text-mostaza">
              Panel del Cantinero
            </Text>
            <Text className="text-center text-xs text-amber-100 mt-2">
              Próximo paso: Agregar Nueva Bebida (Punto 3).
            </Text>
          </View>
        )}

        {(usuarioActual.perfil === "cliente_registrado" ||
          usuarioActual.perfil === "cliente_anonimo") && (
          <View className="flex-1 items-center justify-center p-6">
            <Text className="text-center text-lg font-black text-mostaza">
              Bienvenido al Restaurante
            </Text>
            <Text className="text-center text-xs text-amber-100 mt-2">
              Escanee el código QR de ingreso o de su mesa.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}