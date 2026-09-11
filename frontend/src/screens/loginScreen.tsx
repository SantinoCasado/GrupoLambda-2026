import React, { useState, useRef } from "react";
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Vibration,
  Image,
  Modal,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { UsuarioSeed, ACCESOS_RAPIDOS, AccesoRapido } from "../data/usuariosPrecargados";
import { login } from "../services/authService";
import { FeedbackModal } from "../components/FeedbackModal";
import { CompanySpinner } from "../components/CompanySpinner";
import { ChineseFrame } from "../components/ChineseFrame";

interface LoginScreenProps {
  onLoginSuccess: (usuario: UsuarioSeed) => void;
  onNavigateRegistroCliente: () => void;
}

export function LoginScreen({ onLoginSuccess, onNavigateRegistroCliente }: LoginScreenProps) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [cargando, setCargando] = useState(false);

  const [modalAccesosVisible, setModalAccesosVisible] = useState(false);
  const [logoTaps, setLogoTaps] = useState(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Autocompletar el formulario con el botón rápido
  const seleccionarAccesoRapido = (acceso: AccesoRapido) => {
    vibrar("toque");
    setEmail(acceso.email);
    setClave(acceso.clave);
  };

  // Toque rápido: 3 toques sobre el logo abren el modal de accesos rápidos
  const manejarToqueLogo = () => {
    vibrar("toque");
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    const nuevoConteo = logoTaps + 1;
    setLogoTaps(nuevoConteo);
    if (nuevoConteo >= 3) {
      setLogoTaps(0);
      setModalAccesosVisible(true);
      return;
    }
    tapTimerRef.current = setTimeout(() => setLogoTaps(0), 1500);
  };

  return (
    <>
      <SafeAreaView className="flex-1">
        <StatusBar style="light" />

        <View className="absolute right-4 z-10 items-end" style={{ top: insets.top + 16 }}>
          <Text className="text-[10px] text-vino/70">Rocío Sanchez</Text>
          <Text className="text-[10px] text-vino/70">Santino Casado</Text>
          <Text className="text-[10px] text-vino/70">Sebastián Andreozzi</Text>
          <Text className="text-[10px] text-vino/70">Valentín Brazanovich</Text>
        </View>

      <ScrollView className="flex-1 px-5 pt-20" contentContainerStyle={{ paddingBottom: 50 }}>
        {/* Encabezado */}
        <View className="mb-5 items-center">
          <TouchableOpacity onPress={manejarToqueLogo} activeOpacity={0.8}>
            <Image
              source={require("../../assets/images/logo-name2.png")}
              className="mt-6 h-48 w-auto self-center"
              resizeMode="contain"
            />
          </TouchableOpacity>
          <Image
            source={require("../../assets/images/separator.png")}
            className="mt-3 h-7 w-full"
            resizeMode="contain"
          />
        </View>

        {/* Formulario tradicional */}
          <Text style={{ fontFamily: "LaOriental" }} className="text-center text-2xl uppercase tracking-wider text-vino mt-1 mb-3">
            Iniciar Sesión
          </Text>
        <View className="gap-y-4 p-5">
          <View>  
            <Text className="mb-1 text-s font-bold text-vino">Correo Electrónico *</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="ejemplo@restaurante.com"
              placeholderTextColor="#a37e1f"
              className="rounded-2xl border border-mostaza px-4 py-3 text-stone-700"
            />
          </View>

          <View>
            <Text className="mb-1 text-s font-bold text-vino">Contraseña *</Text>
            <TextInput
              value={clave}
              onChangeText={setClave}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor="#a37e1f"
              className="rounded-xl border border-mostaza px-4 py-3 text-stone-700"
            />
          </View>

          <TouchableOpacity
            onPress={() => ejecutarLogin(email, clave)}
            disabled={cargando}
            className="mt-6 flex-row items-center justify-center rounded-2xl bg-vino py-3 active:bg-terracota"
          >
            <Image
              source={require("../../assets/images/sello.png")}
              className="h-7 w-7"
              resizeMode="contain"
            />
            <Text style={{ fontFamily: "LaOriental" }} className="text-center mx-10 uppercase tracking-wider text-mostaza">
              Ingresar
            </Text>
            <Image
              source={require("../../assets/images/sello.png")}
              className="h-7 w-7"
              resizeMode="contain"
            />
          </TouchableOpacity>

          {/* Enlace para nuevo cliente */}
          <TouchableOpacity
            onPress={() => {
              vibrar("toque");
              onNavigateRegistroCliente();
            }}
            className="mt-2 items-center py-2"
          >
            <Text className="text-xs font-bold text-calabaza underline">
              ¿No tienes cuenta? Regístrate como cliente aquí
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* MODAL DE ACCESOS RÁPIDOS (tocar el logo 3 veces) */}
      <Modal visible={modalAccesosVisible} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <ChineseFrame className="w-full max-w-sm bg-vino shadow-2xl p-3">
          <View className="px-2 pb-3 pt-5">
          <Text style={{ fontFamily: "LaOriental" }} className="mb-1 text-s uppercase tracking-wider text-mostaza">
            Accesos Rápidos de Prueba
          </Text>
            <Text className="mb-4 text-xs font-semibold text-amber-100">
              Toque un perfil para completar el formulario:
            </Text>

            <View className="flex-row flex-wrap justify-between gap-y-3">
              {ACCESOS_RAPIDOS.map((acceso) => (
                <TouchableOpacity
                  key={acceso.id}
                  onPress={() => {
                    seleccionarAccesoRapido(acceso);
                    setModalAccesosVisible(false);
                  }}
                  disabled={cargando}
                  className="w-[48%] flex-row items-center rounded-2xl border-2 border-mostaza/70 bg-calabaza/30 p-3 active:bg-calabaza/60"
                >
                  <Text className="text-xl mr-2">{acceso.icono}</Text>
                  <View className="flex-1">
                    <Text className="text-xs font-black text-mostaza">{acceso.tituloVisual}</Text>
                    <Text className="text-[10px] text-amber-100" numberOfLines={1}>
                      {acceso.email}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => setModalAccesosVisible(false)}
              className="mt-5 rounded-2xl  bg-mostaza py-2.5 active:bg-calabaza/60"
            >
              <Text style={{ fontFamily: "LaOriental" }} className="text-center uppercase tracking-wider text-vino">
                Cerrar
              </Text>
            </TouchableOpacity>
            </View>
            </ChineseFrame>
        </View>
      </Modal>

      <CompanySpinner visible={cargando} mensaje="Autenticando credenciales..." />

      <FeedbackModal
        visible={modalFeedback.visible}
        tipo={modalFeedback.tipo}
        titulo={modalFeedback.titulo}
        mensaje={modalFeedback.mensaje}
        onClose={() => setModalFeedback((prev) => ({ ...prev, visible: false }))}
      />
      </SafeAreaView>
    </>
  );
}