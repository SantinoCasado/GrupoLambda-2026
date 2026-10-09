import React, { useState, useRef } from "react";
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Vibration,
  Modal,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { CameraView, useCameraPermissions, BarcodeScanningResult } from "expo-camera";
import { parseDniData } from "../utils/dniParser";
import { validateClienteForm, validarPaso1Cliente, registrarCliente, ClienteFormErrors } from "../services/clientesService";
import { obtenerTokenPush } from "../services/pushNotificationsService";
import { FeedbackModal } from "../components/FeedbackModal";
import { CompanySpinner } from "../components/CompanySpinner";
import { ChineseFrame } from "../components/ChineseFrame";

interface Props {
  onVolverAlLogin?: () => void;
  modo?: "cliente" | "metre";
  mostrarBotonVolverAlLogin?: boolean;
  usuarioLogueado?: boolean;
}

export default function RegistroClienteScreen({
  onVolverAlLogin,
  modo = "cliente",
  mostrarBotonVolverAlLogin = true,
  usuarioLogueado = false,
}: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const insets = useSafeAreaInsets();
  const screenWidth = Dimensions.get("window").width;

  // Estados del Formulario
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [dni, setDni] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [fotoUri, setFotoUri] = useState<string | null>(null);

  // Modales de Cámara y QR
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  // Validación y Envío
  const [errors, setErrors] = useState<ClienteFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Feedback Modal
  const [modalFeedback, setModalFeedback] = useState<{
    visible: boolean;
    tipo: "exito" | "error" | "informacion";
    titulo: string;
    mensaje: string;
    onAceptar?: () => void;
  }>({
    visible: false,
    tipo: "informacion",
    titulo: "",
    mensaje: "",
  });

  const cameraRef = useRef<CameraView | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const paso1Validado = useRef(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Limpieza de error de campo cuando el valor se corrige
  const clearFieldError = (field: keyof ClienteFormErrors, value: string) => {
    if (!errors[field]) return;

    let valid = false;
    switch (field) {
      case "nombres":
        valid = value.trim().length >= 2;
        break;
      case "apellidos":
        valid = value.trim().length >= 2;
        break;
      case "dni":
        valid = value.replace(/\D/g, "").length === 8;
        break;
      case "email":
        valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
        break;
      case "password":
        valid = value.length >= 6;
        break;
      case "confirmarPassword":
        valid = value.length > 0 && value === password;
        break;
      case "fotoUri":
        valid = !!value;
        break;
    }

    if (valid) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const ejecutarVibracion = (tipo: "exito" | "error" | "toque") => {
    if (tipo === "error") Vibration.vibrate([0, 100, 50, 100, 50, 200]);
    else if (tipo === "exito") Vibration.vibrate([0, 80, 60, 150]);
    else Vibration.vibrate([0, 40]);
  };

  const mostrarMensaje = (
    tipo: "exito" | "error" | "informacion",
    titulo: string,
    mensaje: string,
    onAceptar?: () => void
  ) => {
    if (tipo === "error") ejecutarVibracion("error");
    else if (tipo === "exito") ejecutarVibracion("exito");

    setModalFeedback({
      visible: true,
      tipo,
      titulo,
      mensaje,
      onAceptar,
    });
  };

  // Escaneo de QR / PDF417 de DNI
  const handleBarCodeScanned = (result: BarcodeScanningResult) => {
    if (!result.data) return;

    const parsed = parseDniData(result.data);

    if (parsed && (parsed.dni || parsed.apellidos)) {
      if (parsed.nombres) { setNombres(parsed.nombres); clearFieldError("nombres", parsed.nombres); }
      if (parsed.apellidos) { setApellidos(parsed.apellidos); clearFieldError("apellidos", parsed.apellidos); }
      if (parsed.dni) { setDni(parsed.dni); clearFieldError("dni", parsed.dni); }

      setIsQrScannerOpen(false);
      mostrarMensaje(
        "exito",
        "DNI Escaneado",
        `Datos cargados: ${parsed.apellidos}, ${parsed.nombres}`
      );
    } else {
      setIsQrScannerOpen(false);
      mostrarMensaje(
        "error",
        "Lectura Fallida",
        "No se pudo reconocer el formato del documento de identidad."
      );
    }
  };

  // Captura obligatoria con cámara en vivo (sin galería)
  const handleTakePhoto = async () => {
    if (cameraRef.current) {
      try {
        ejecutarVibracion("toque");
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
        if (photo?.uri) {
          setFotoUri(photo.uri);
          setErrors((prev) => ({ ...prev, fotoUri: undefined }));
          setIsCameraOpen(false);
          ejecutarVibracion("exito");
        }
      } catch {
        mostrarMensaje("error", "Error de Hardware", "No se pudo tomar la fotografía.");
      }
    }
  };

  // Validación reutilizable del paso 1 (botón y deslizamiento)
  const validarPaso1 = (): boolean => {
    const paso1Errors = validarPaso1Cliente({ nombres, apellidos, dni });

    setErrors((prev) => {
      const cleaned = { ...prev };
      delete cleaned.email;
      delete cleaned.password;
      delete cleaned.confirmarPassword;
      delete cleaned.fotoUri;
      return { ...cleaned, ...paso1Errors };
    });

    const valido = Object.keys(paso1Errors).length === 0;
    paso1Validado.current = valido;

    if (!valido) {
      ejecutarVibracion("error");
      mostrarMensaje(
        "error",
        "Datos Incompletos",
        "Por favor, complete correctamente los campos marcados antes de continuar."
      );
    }

    return valido;
  };

  // Avance al paso 2 con validación
  const handleSiguiente = () => {
    ejecutarVibracion("toque");

    if (!validarPaso1()) return;

    scrollRef.current?.scrollTo({ x: screenWidth, animated: true });
  };

  const handleSubmit = async () => {
    ejecutarVibracion("toque");

    const formValidation = validateClienteForm({
      nombres,
      apellidos,
      dni,
      email,
      password,
      confirmarPassword,
      fotoUri,
    });

    setErrors(formValidation);

    if (Object.keys(formValidation).length > 0) {
      mostrarMensaje(
        "error",
        "Datos Inválidos",
        "Por favor, complete todos los campos obligatorios."
      );
      return;
    }

    try {
      setIsSubmitting(true);

      // Solo el cliente registrándose desde su propio dispositivo adjunta su token de push,
      // así las notificaciones de aprobación llegan a su teléfono y no al del metre.
      let pushToken: string | null = null;
      if (modo === "cliente") {
        try {
          pushToken = await obtenerTokenPush();
        } catch (error) {
          console.warn("⚠️ No se pudo obtener el token de push al registrarse:", error);
        }
      }

      await registrarCliente({
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        dni: dni.trim(),
        email: email.trim(),
        password,
        fotoUri: fotoUri!,
        pushToken,
      });

      mostrarMensaje(
        "exito",
        "Registro en proceso",
        modo === "metre"
          ? "Solicitud de registro enviada. Aguarde a que un Dueño o Supervisor active la cuenta antes de iniciar sesión."
          : "Su solicitud ha sido enviada con éxito. Su cuenta deberá ser aprobada antes de que pueda iniciar sesión. Se le notificará por correo.",
        () => {
          onVolverAlLogin?.();
        }
      );
    } catch (error: any) {
      const mensajeError =
        error?.message && /already been registered/i.test(error.message)
          ? "Dirección de correo electrónico ya registrada"
          : error.message || "Ocurrió un error inesperado.";
      mostrarMensaje("error", "Error de Registro", mensajeError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, overflow: "hidden" }}>
      <StatusBar style="light" />
      {/* Botón Volver al Login (top right) */}
      {mostrarBotonVolverAlLogin && onVolverAlLogin && (
        <TouchableOpacity
          onPress={() => {
            ejecutarVibracion("toque");
            onVolverAlLogin();
          }}
          className="absolute right-4 z-20 rounded-xl border border-mostaza bg-vino px-3 py-1.5 active:bg-terracota"
          style={{ top: insets.top + 8 }}
        >
          <Image source={require("../../assets/images/left-arrow-y.png")} className="h-5 w-5" resizeMode="contain" />
        </TouchableOpacity>
      )}

      {/* Cabecera */}
      <View className={`px-5 ${modo === "metre" || usuarioLogueado ? "pt-4" : "pt-28"}`}>
        <View className="mb-4">
          <Image
            source={require("../../assets/images/logo-name.png")}
            className="h-20 w-auto self-center"
            resizeMode="contain"
          />
          <Image
            source={require("../../assets/images/separator.png")}
            className="my-2 h-7 w-full"
            resizeMode="contain"
          />
          <ChineseFrame className="mt-2 bg-vino">
            <View className="items-center rounded-xl bg-mostaza/15 px-4 py-4">
              <Text style={{ fontFamily: "LaOriental" }} className="text-2xl text-mostaza uppercase">
                {modo === "metre" ? "Registrar Cliente" : "Registrarse"}
              </Text>
              <Text className="mt-1 text-xs font-semibold text-amber-100">
                {modo === "metre" ? "Gestión: Metre" : "Auto-Gestión"} •{" "}
                <Text className="text-mostaza font-bold">Esperar aprobación para iniciar sesión</Text>
              </Text>
            </View>
          </ChineseFrame>
        </View>
      </View>

      {/* Carrusel de secciones */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
onMomentumScrollEnd={(e) => {
          const step = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
          if (step === 1 && !paso1Validado.current && !validarPaso1()) {
            scrollRef.current?.scrollTo({ x: 0, animated: true });
            return;
          }
          setCurrentStep(step);
        }}
        style={{ flex: 1 }}
      >
        {/* SECCIÓN 0: Identificación y DNI */}
        <View style={{ width: screenWidth }} className="flex-1 px-5 pt-2">
          <ScrollView
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            <View className="mx-6 mb-5">
              <TouchableOpacity
                onPress={async () => {
                  if (!permission?.granted) await requestPermission();
                  ejecutarVibracion("toque");
                  setIsQrScannerOpen(true);
                }}
                className="w-full items-center justify-center rounded-2xl border border-vino bg-mostaza py-4 px-4 active:bg-[#f5dccb]"
              >
                <View className="mb-2 flex-row items-center justify-center gap-2">
                  <Image
                    source={require("../../assets/images/camera-e-v.png")}
                    className="h-12 w-12"
                    resizeMode="contain"
                  />
                  <Image
                    source={require("../../assets/images/right-arrow-v.png")}
                    className="h-5 w-5 mx-5"
                    resizeMode="contain"
                  />
                  <Image
                    source={require("../../assets/images/dni3.png")}
                    className="h-12 w-12"
                    resizeMode="contain"
                  />
                </View>
                <Text style={{ fontFamily: "LaOriental" }} className="text-center uppercase text-vino">
                  Escanear Código de DNI
                </Text>
              </TouchableOpacity>
            </View>

            <View className="mx-6 gap-y-4">
              {/* Nombres */}
              <View>
                <Text className="mb-1 text-s font-bold text-vino">Nombres *</Text>
                <TextInput
                  value={nombres}
                  onChangeText={(v) => { setNombres(v); clearFieldError("nombres", v); }}
                  placeholder="Ingrese sus nombres"
                  placeholderTextColor="#a37e1f"
                  className={`rounded-xl border bg-[#FFF8EA] pl-4 py-3 text-stone-700 ${
                    errors.nombres ? "border-terracota" : "border-mostaza"
                  }`}
                />
                {errors.nombres && (
                  <Text className="mt-1 text-xs font-medium text-rose-400">{errors.nombres}</Text>
                )}
              </View>

              {/* Apellidos */}
              <View>
                <Text className="mb-1 text-s font-bold text-vino">Apellidos *</Text>
                <TextInput
                  value={apellidos}
                  onChangeText={(v) => { setApellidos(v); clearFieldError("apellidos", v); }}
                  placeholder="Ingrese sus apellidos"
                  placeholderTextColor="#a37e1f"
                  className={`rounded-xl border bg-[#FFF8EA] pl-4 py-3 text-stone-700 ${
                    errors.apellidos ? "border-terracota" : "border-mostaza"
                  }`}
                />
                {errors.apellidos && (
                  <Text className="mt-1 text-xs font-medium text-rose-400">{errors.apellidos}</Text>
                )}
              </View>

              {/* DNI */}
              <View>
                <Text className="mb-1 text-s font-bold text-vino">Número de DNI *</Text>
                <TextInput
                  value={dni}
                  onChangeText={(v) => { setDni(v); clearFieldError("dni", v); }}
                  keyboardType="numeric"
                  maxLength={8}
                  placeholder="Ej: 41234567"
                  placeholderTextColor="#a37e1f"
                  className={`rounded-xl border bg-[#FFF8EA] pl-4 py-3 text-stone-700 ${
                    errors.dni ? "border-terracota" : "border-mostaza"
                  }`}
                />
                {errors.dni && <Text className="mt-1 text-xs font-medium text-rose-400">{errors.dni}</Text>}
              </View>
            </View>

            {/* Paginación + Siguiente */}
            <View className="mx-6 mt-4 items-center">
              <View className="flex-row items-center justify-center gap-2 py-1 mb-3">
                {[0, 1].map((i) => (
                  <View
                    key={i}
                    className={`h-2 w-2 rotate-45 ${
                      currentStep === i ? "bg-vino" : "bg-mostaza/30"
                    }`}
                  />
                ))}
              </View>
              <TouchableOpacity
                onPress={handleSiguiente}
                className="w-full flex-col items-center justify-center rounded-2xl border border-calabaza bg-[#FBE9DF] py-3 active:bg-[#f5dccb]"
              >
                <Image
                  source={require("../../assets/images/supervisor-c.png")}
                  className="mb-1 h-12 w-12"
                  resizeMode="contain"
                />
                <Text style={{ fontFamily: "LaOriental" }} className="text-s text-calabaza">
                  Continuar Registro
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* SECCIÓN 1: Credenciales y Foto Personal */}
        <View style={{ width: screenWidth }} className="flex-1 px-5 pt-2">
          <ScrollView
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            <View className="mx-6 gap-y-4">
              {/* Email */}
              <View>
                <Text className="mb-1 text-s font-bold text-vino">Correo Electrónico *</Text>
                <TextInput
                  value={email}
                  onChangeText={(v) => { setEmail(v); clearFieldError("email", v); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="ejemplo@correo.com"
                  placeholderTextColor="#a37e1f"
                  className={`rounded-xl border bg-[#FFF8EA] pl-4 py-3 text-stone-700 ${
                    errors.email ? "border-terracota" : "border-mostaza"
                  }`}
                />
                {errors.email && (
                  <Text className="mt-1 text-xs font-medium text-rose-400">{errors.email}</Text>
                )}
              </View>

              {/* Contraseña */}
              <View>
                <Text className="mb-1 text-s font-bold text-vino">Contraseña *</Text>
                <TextInput
                  value={password}
                  onChangeText={(v) => { setPassword(v); clearFieldError("password", v); }}
                  secureTextEntry
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor="#a37e1f"
                  className={`rounded-xl border bg-[#FFF8EA] pl-4 py-3 text-stone-700 ${
                    errors.password ? "border-terracota" : "border-mostaza"
                  }`}
                />
                {errors.password && (
                  <Text className="mt-1 text-xs font-medium text-rose-400">{errors.password}</Text>
                )}
              </View>

              {/* Confirmar Contraseña */}
              <View>
                <Text className="mb-1 text-s font-bold text-vino">Confirmar Contraseña *</Text>
                <TextInput
                  value={confirmarPassword}
                  onChangeText={(v) => { setConfirmarPassword(v); clearFieldError("confirmarPassword", v); }}
                  secureTextEntry
                  placeholder="Repita la contraseña"
                  placeholderTextColor="#a37e1f"
                  className={`rounded-xl border bg-[#FFF8EA] pl-4 py-3 text-stone-700 ${
                    errors.confirmarPassword ? "border-terracota" : "border-mostaza"
                  }`}
                />
                {errors.confirmarPassword && (
                  <Text className="mt-1 text-xs font-medium text-rose-400">{errors.confirmarPassword}</Text>
                )}
              </View>
            </View>

                <Text className="mt-4 mb-2 ml-6 text-s font-bold text-vino">
                Foto de perfil*
              </Text>

            {/* Fotografía Personal (Solo Cámara Física) */}
            <View className="relative w-[88%] h-36 bg-[#FFF8EA] self-center rounded-2xl border border-mostaza p-4">
              
              {fotoUri ? (
                <View className="h-full items-center justify-center">
                  <Image
                    source={{ uri: fotoUri }}
                    className="h-24 w-24 rounded-2xl border border-calabaza"
                  />
                </View>
              ) : (
                <TouchableOpacity
                  onPress={async () => {
                    if (!permission?.granted) await requestPermission();
                    ejecutarVibracion("toque");
                    setIsCameraOpen(true);
                  }}
                  className="h-[100%] items-center justify-center rounded-xl border border-dashed border-amber-600/50"
                >
                  <Image source={require("../../assets/images/camera.png")} className="mb-1 h-9 w-9" />
                  <Text className="text-xs font-bold text-terracota">Activar Cámara</Text>
                  <Text className="text-[10px] text-stone-400">Sin acceso a la galería de fotos</Text>
                </TouchableOpacity>
              )}

              {fotoUri && (
                <TouchableOpacity
                  onPress={() => {
                    ejecutarVibracion("toque");
                    setIsCameraOpen(true);
                  }}
                  className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full border border-calabaza bg-[#FBE9DF] active:bg-[#f5dccb]"
                >
                  <Image
                    source={require("../../assets/images/cross-c.png")}
                    className="h-5 w-5"
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              )}

              {errors.fotoUri && (
                <Text className="mt-2 text-center text-xs font-medium text-rose-400">{errors.fotoUri}</Text>
              )}
            </View>

            {/* Botón de Envío */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting}
              className="mt-6 flex-row items-center justify-center rounded-2xl border border-amber-400/40 bg-vino py-3 active:bg-terracota"
            >
              <Image
                source={require("../../assets/images/sello.png")}
                className="h-7 w-7"
                resizeMode="contain"
              />
              <Text
                style={{ fontFamily: "LaOriental" }}
                className="mx-10 text-center text-l uppercase tracking-wider text-mostaza"
              >
                Solicitar Registro
              </Text>
              <Image
                source={require("../../assets/images/sello.png")}
                className="h-7 w-7"
                resizeMode="contain"
              />
            </TouchableOpacity>
          </ScrollView>
        </View>
      </ScrollView>

      {/* MODAL QR ESCÁNER */}
      <Modal visible={isQrScannerOpen} animationType="slide">
        <View className="flex-1 bg-stone-950">
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr", "pdf417"] }}
            onBarcodeScanned={handleBarCodeScanned}
          />
          <View className="absolute top-12 left-6 right-6">
            <ChineseFrame className="bg-vino">
              <View className="flex-row items-center justify-evenly rounded-xl bg-mostaza/15 px-4 py-7">
                <Text style={{ fontFamily: "LaOriental" }} className="text-xs text-mostaza">
                  Enfoque el DNI argentino
                </Text>
                <TouchableOpacity
                  onPress={() => setIsQrScannerOpen(false)}
                  className="bg-mostaza px-2 py-1.5 active:bg-rose-800"
                >
                  <Text style={{ fontFamily: "LaOriental" }} className="text-xs text-terracota">
                    Cerrar
                  </Text>
                </TouchableOpacity>
              </View>
            </ChineseFrame>
          </View>
        </View>
      </Modal>

      {/* MODAL CÁMARA EN VIVO */}
      <Modal visible={isCameraOpen} animationType="slide">
        <View className="flex-1 bg-stone-950">
          <CameraView ref={cameraRef} style={{ flex: 1 }} facing="front" />
          <View className="absolute top-12 right-6">
            <TouchableOpacity
              onPress={() => setIsCameraOpen(false)}
              className="border border-mostaza bg-vino px-4 py-2"
            >
              <Text style={{ fontFamily: "LaOriental" }} className="text-xs text-mostaza">
                Cerrar
              </Text>
            </TouchableOpacity>
          </View>
          <View className="absolute bottom-10 left-0 right-0 items-center">
            <TouchableOpacity
              onPress={handleTakePhoto}
              className="h-20 w-20 items-center justify-center rounded-full border-4 border-amber-300 bg-amber-500/30 active:bg-amber-500/50"
            >
              <View className="h-14 w-14 rounded-full bg-amber-400" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* SPINNER */}
      <CompanySpinner visible={isSubmitting} mensaje="Enviando solicitud de registro..." />

      {/* MODAL FEEDBACK */}
      <FeedbackModal
        visible={modalFeedback.visible}
        tipo={modalFeedback.tipo}
        titulo={modalFeedback.titulo}
        mensaje={modalFeedback.mensaje}
        onClose={() => {
          setModalFeedback((prev) => ({ ...prev, visible: false }));
          if (modalFeedback.onAceptar) modalFeedback.onAceptar();
        }}
      />
    </View>
  );
}