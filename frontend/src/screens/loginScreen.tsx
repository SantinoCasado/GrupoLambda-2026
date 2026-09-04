import React, { useState } from "react";
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Vibration,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { USUARIOS_PRECARGADOS, UsuarioSeed } from "../data/usuariosPrecargados";
import { login } from "../services/authService";
import { FeedbackModal } from "../components/FeedbackModal";
import { CompanySpinner } from "../components/CompanySpinner";

interface LoginScreenProps {
  onLoginSuccess: (usuario: UsuarioSeed) => void;
  onNavigateRegistroCliente: () => void;
}

export function LoginScreen({ onLoginSuccess, onNavigateRegistroCliente }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [cargando, setCargando] = useState(false);

  const [modalFeedback, setModalFeedback] = useState<{
    visible: boolean;
    tipo: "exito" | "error" | "informacion";
    titulo: string;
    mensaje: string;
  }>({
    visible: false,
    tipo: "informacion",
    titulo: "",
    mensaje: "",
  });

  const vibrar = (tipo: "exito" | "error" | "toque") => {
    if (tipo === "error") Vibration.vibrate([0, 100, 50, 100, 50, 200]);
    else if (tipo === "exito") Vibration.vibrate([0, 80, 60, 150]);
    else Vibration.vibrate([0, 40]);
  };

  const ejecutarLogin = async (correoAUsar: string, claveAUsar: string) => {
    vibrar("toque");
    if (!correoAUsar.trim() || !claveAUsar.trim()) {
      vibrar("error");
      setModalFeedback({
        visible: true,
        tipo: "error",
        titulo: "Campos Incompletos",
        mensaje: "Debe ingresar el correo electrónico y la contraseña.",
      });
      return;
    }

    try {
      setCargando(true);
      const usuario = await login(correoAUsar, claveAUsar);
      vibrar("exito");
      onLoginSuccess(usuario);
    } catch (error: any) {
      vibrar("error");
      setModalFeedback({
        visible: true,
        tipo: "error",
        titulo: "Acceso Denegado",
        mensaje: error.message || "Error al autenticar el usuario.",
      });
    } finally {
      setCargando(false);
    }
  };

  // Autocompletar y loguear automáticamente con el botón rápido
  const seleccionarAccesoRapido = (usuario: UsuarioSeed) => {
    setEmail(usuario.email);
    setClave(usuario.clave);
    ejecutarLogin(usuario.email, usuario.clave);
  };

  return (
    <SafeAreaView className="flex-1 bg-vino">
      <StatusBar style="light" />

      <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 50 }}>
        {/* Encabezado */}
        <View className="mb-5 rounded-3xl border-2 border-caramelo bg-vino p-5 shadow-lg">
          <Text className="text-center text-3xl font-black tracking-wider text-mostaza">
            RESTAURANTE
          </Text>
          <Text className="text-center text-xs font-bold uppercase tracking-widest text-amber-100 mt-1">
            Sistema de Gestión Integral
          </Text>
        </View>

        {/* Formulario tradicional */}
        <View className="gap-y-4 rounded-3xl border-2 border-caramelo bg-vino p-5 shadow-md">
          <Text className="text-sm font-black uppercase tracking-wider text-mostaza">
            Iniciar Sesión
          </Text>

          <View>
            <Text className="mb-1 text-xs font-bold text-amber-100">Correo Electrónico *</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="ejemplo@restaurante.com"
              placeholderTextColor="#f7b53880"
              className="rounded-2xl border-2 border-caramelo bg-vino px-4 py-3 text-amber-50"
            />
          </View>

          <View>
            <Text className="mb-1 text-xs font-bold text-amber-100">Contraseña *</Text>
            <TextInput
              value={clave}
              onChangeText={setClave}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor="#f7b53880"
              className="rounded-2xl border-2 border-caramelo bg-vino px-4 py-3 text-amber-50"
            />
          </View>

          {cargando ? (
            <CompanySpinner mensaje="Autenticando credenciales..." />
          ) : (
            <TouchableOpacity
              onPress={() => ejecutarLogin(email, clave)}
              className="mt-2 rounded-2xl border-2 border-mostaza bg-mostaza py-4 active:bg-caramelo"
            >
              <Text className="text-center text-base font-black uppercase tracking-wider text-vino">
                Ingresar al Sistema
              </Text>
            </TouchableOpacity>
          )}

          {/* Enlace para nuevo cliente */}
          <TouchableOpacity
            onPress={() => {
              vibrar("toque");
              onNavigateRegistroCliente();
            }}
            className="mt-2 items-center py-2"
          >
            <Text className="text-xs font-bold text-amber-200 underline">
              ¿No tienes cuenta? Regístrate como cliente aquí
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sección de Accesos Rápidos (Fast Login) */}
        <View className="mt-6 rounded-3xl border-2 border-caramelo bg-vino p-5 shadow-md">
          <Text className="mb-1 text-sm font-black uppercase tracking-wider text-mostaza">
            Accesos Rápidos de Prueba
          </Text>
          <Text className="mb-4 text-xs font-semibold text-amber-100">
            Toque un perfil para iniciar sesión de forma automática:
          </Text>

          <View className="flex-row flex-wrap justify-between gap-y-3">
            {USUARIOS_PRECARGADOS.map((usr) => (
              <TouchableOpacity
                key={usr.id}
                onPress={() => seleccionarAccesoRapido(usr)}
                disabled={cargando}
                className="w-[48%] flex-row items-center rounded-2xl border-2 border-mostaza/70 bg-calabaza/30 p-3 active:bg-calabaza/60"
              >
                <Text className="text-xl mr-2">{usr.icono}</Text>
                <View className="flex-1">
                  <Text className="text-xs font-black text-mostaza">{usr.tituloVisual}</Text>
                  <Text className="text-[10px] text-amber-100 numberOfLines={1}">
                    {usr.nombres}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <FeedbackModal
        visible={modalFeedback.visible}
        tipo={modalFeedback.tipo}
        titulo={modalFeedback.titulo}
        mensaje={modalFeedback.mensaje}
        onClose={() => setModalFeedback((prev) => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
}