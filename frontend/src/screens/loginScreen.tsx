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
  onNavigateRegistroAnonimo: () => void;
}

export function LoginScreen({
  onLoginSuccess,
  onNavigateRegistroCliente,
  onNavigateRegistroAnonimo 
}: LoginScreenProps) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [cargando, setCargando] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; clave?: string }>({});

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

  // Limpieza de error de campo cuando el valor se corrige
  const clearFieldError = (field: "email" | "clave", value: string) => {
    if (!errors[field]) return;

    const valid =
      field === "email"
        ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
        : value.trim().length >= 6;

    if (valid) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const ejecutarLogin = async (correoAUsar: string, claveAUsar: string) => {
    vibrar("toque");

    const loginErrors: { email?: string; clave?: string } = {};

    if (!correoAUsar.trim()) {
      loginErrors.email = "El correo electrónico es obligatorio.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoAUsar.trim())) {
      loginErrors.email = "El formato de correo no es válido.";
    }

    if (!claveAUsar.trim()) {
      loginErrors.clave = "La contraseña es obligatoria.";
    } else if (claveAUsar.trim().length < 6) {
      loginErrors.clave = "La contraseña debe tener al menos 6 caracteres.";
    }

    setErrors(loginErrors);

    if (Object.keys(loginErrors).length > 0) {
      vibrar("error");
      setModalFeedback({
        visible: true,
        tipo: "error",
        titulo: "Datos Inválidos",
        mensaje: "Por favor, complete correctamente los campos marcados.",
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
    setErrors({});
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
      <SafeAreaView className="flex-1">

      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: insets.top - 8,
          right: -12,
          width: 132,
          height: 165,
        }}
      >
        <Image
          source={require("../../assets/images/background-tree.png")}
          style={{ width: "100%", height: "100%" }}
          resizeMode="contain"
        />
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
            <Text className="mb-1 text-s font-bold text-vino">Correo Electrónico</Text>
            <TextInput
              value={email}
              onChangeText={(v) => { setEmail(v); clearFieldError("email", v); }}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="ejemplo@restaurante.com"
              placeholderTextColor="#a37e1f"
              className={`rounded-2xl border px-4 py-3 text-stone-700 bg-[#FFF8EA] pl-3 ${
                errors.email ? "border-terracota" : "border-mostaza"
              }`}
            />
            {errors.email && <Text className="mt-1 text-xs font-medium text-rose-400">{errors.email}</Text>}
          </View>

          <View>
            <Text className="mb-1 text-s font-bold text-vino">Contraseña</Text>
            <TextInput
              value={clave}
              onChangeText={(v) => { setClave(v); clearFieldError("clave", v); }}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor="#a37e1f"
              className={`rounded-xl border px-4 py-3 text-stone-700 bg-[#FFF8EA] pl-3 ${
                errors.clave ? "border-terracota" : "border-mostaza"
              }`}
            />
            {errors.clave && <Text className="mt-1 text-xs font-medium text-rose-400">{errors.clave}</Text>}
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
          {/* Botón de acceso para Cliente Anónimo / Invitado */}
          <TouchableOpacity
            onPress={() => {
              vibrar("toque");
              onNavigateRegistroAnonimo();
            }}
            activeOpacity={0.8}
            className="mt-3 self-center px-6 flex-row items-center justify-center rounded-2xl border-2 border-dashed border-calabaza/70 bg-calabaza/20 py-3 active:bg-calabaza/40"
          >
            <Image
              source={require("../../assets/images/guest-c.png")}
              className="mr-2 h-6 w-6"
              resizeMode="contain"
            />
            <Text
              style={{ fontFamily: "LaOriental" }}
              className="text-center uppercase tracking-wider text-calabaza"
            >
              Ingresar como Invitado
            </Text>
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

      {/* MODAL DE ACCESOS RÁPIDOS (tocar el logo 3 veces). Montado solo al
          abrirlo: en Android cada Modal crea una ventana nativa aunque visible={false}. */}
      {modalAccesosVisible && (
      <Modal visible transparent animationType="fade">
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
      )}

      <CompanySpinner visible={cargando} mensaje="Iniciando sesión..." />

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