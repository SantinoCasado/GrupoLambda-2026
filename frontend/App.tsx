import "./global.css";
import React, { useState } from "react";
import { View, Text, TouchableOpacity, Vibration } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { UsuarioSeed } from "./src/data/usuariosPrecargados";
import { LoginScreen } from "./src/screens/loginScreen";

// Pantallas
import AltaEmpleadoScreen from "./src/screens/altaEmpleadoScreen";
import AltaProductoScreen from "./src/screens/altaProducto";
import AltaMesaScreen from "./src/screens/altaMesaScreen";
import RegistroClienteScreen from "./src/screens/registroClienteScreen";
import AprobacionClientesScreen from "./src/screens/aprobacionClientesScreen";

export default function App() {
  const [usuarioActual, setUsuarioActual] = useState<UsuarioSeed | null>(null);
  const [subVistaAdmin, setSubVistaAdmin] = useState<"empleados" | "mesas" | "clientes">("empleados");
  const [vistaPublica, setVistaPublica] = useState<"login" | "registro_cliente">("login");

  const cerrarSesion = () => {
    Vibration.vibrate([0, 50, 50, 50]);
    setUsuarioActual(null);
    setSubVistaAdmin("empleados");
    setVistaPublica("login");
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
          setSubVistaAdmin("empleados");
        }}
        onNavigateRegistroCliente={() => {
          setVistaPublica("registro_cliente");
        }}
      />
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-vino">
      {/* 1. Barra Superior con Datos de Sesión */}
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

      {/* 2. Contenido según Perfil */}
      <View className="flex-1">
        {/* DUEÑO O SUPERVISOR: 3 SOLAPAS */}
        {(usuarioActual.perfil === "dueño" || usuarioActual.perfil === "supervisor") && (
          <View style={{ flex: 1 }}>
            {/* Barra Selectora Superior de 3 Tareas */}
            <View
              style={{
                flexDirection: "row",
                backgroundColor: "#2b0f14",
                paddingHorizontal: 8,
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderBottomColor: "#a37e1f",
                zIndex: 50,
                elevation: 10,
              }}
            >
              {/* Solapa 1: Empleados */}
              <TouchableOpacity
                onPress={() => {
                  Vibration.vibrate(30);
                  setSubVistaAdmin("empleados");
                }}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  alignItems: "center",
                  borderRadius: 10,
                  backgroundColor: subVistaAdmin === "empleados" ? "#F59E0B" : "rgba(139, 26, 26, 0.4)",
                  marginRight: 4,
                  borderWidth: 1,
                  borderColor: subVistaAdmin === "empleados" ? "#F59E0B" : "#a37e1f",
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "bold",
                    color: subVistaAdmin === "empleados" ? "#2b0f14" : "#FBE9DF",
                    textTransform: "uppercase",
                  }}
                >
                  👤 Empleados
                </Text>
              </TouchableOpacity>

              {/* Solapa 2: Mesas */}
              <TouchableOpacity
                onPress={() => {
                  Vibration.vibrate(30);
                  setSubVistaAdmin("mesas");
                }}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  alignItems: "center",
                  borderRadius: 10,
                  backgroundColor: subVistaAdmin === "mesas" ? "#F59E0B" : "rgba(139, 26, 26, 0.4)",
                  marginHorizontal: 2,
                  borderWidth: 1,
                  borderColor: subVistaAdmin === "mesas" ? "#F59E0B" : "#a37e1f",
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "bold",
                    color: subVistaAdmin === "mesas" ? "#2b0f14" : "#FBE9DF",
                    textTransform: "uppercase",
                  }}
                >
                  🪑 Mesas / QR
                </Text>
              </TouchableOpacity>

              {/* Solapa 3: Clientes Pendientes */}
              <TouchableOpacity
                onPress={() => {
                  Vibration.vibrate(30);
                  setSubVistaAdmin("clientes");
                }}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  alignItems: "center",
                  borderRadius: 10,
                  backgroundColor: subVistaAdmin === "clientes" ? "#F59E0B" : "rgba(139, 26, 26, 0.4)",
                  marginLeft: 4,
                  borderWidth: 1,
                  borderColor: subVistaAdmin === "clientes" ? "#F59E0B" : "#a37e1f",
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "bold",
                    color: subVistaAdmin === "clientes" ? "#2b0f14" : "#FBE9DF",
                    textTransform: "uppercase",
                  }}
                >
                  👥 Clientes
                </Text>
              </TouchableOpacity>
            </View>

            {/* Vista según la solapa seleccionada */}
            <View style={{ flex: 1 }}>
              {subVistaAdmin === "empleados" && <AltaEmpleadoScreen />}
              {subVistaAdmin === "mesas" && <AltaMesaScreen />}
              {subVistaAdmin === "clientes" && <AprobacionClientesScreen />}
            </View>
          </View>
        )}

        {/* COCINERO */}
        {usuarioActual.perfil === "cocinero" && (
          <AltaProductoScreen categoria="comida" />
        )}

        {/* CANTINERO */}
        {usuarioActual.perfil === "cantinero" && (
          <AltaProductoScreen categoria="bebida" />
        )}

        {/* METRE */}
        {usuarioActual.perfil === "metre" && (
          <View className="flex-1">
            <RegistroClienteScreen modo="metre" />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}