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
import { validateClienteForm, registrarCliente, ClienteFormErrors } from "../services/clientesService";
import { FeedbackModal } from "../components/FeedbackModal";
import { CompanySpinner } from "../components/CompanySpinner";
import { ChineseFrame } from "../components/ChineseFrame";

interface Props {
  onVolverAlLogin?: () => void;
  modo?: "cliente" | "metre";
}

export default function RegistroClienteScreen({ onVolverAlLogin, modo = "cliente" }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const insets = useSafeAreaInsets();
  const screenWidth = Dimensions.get("window").width;

  // Estados del Formulario
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [dni, setDni] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
  const [currentStep, setCurrentStep] = useState(0);

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
      if (parsed.nombres) setNombres(parsed.nombres);
      if (parsed.apellidos) setApellidos(parsed.apellidos);
      if (parsed.dni) setDni(parsed.dni);

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
          setIsCameraOpen(false);
          ejecutarVibracion("exito");
        }
      } catch {
        mostrarMensaje("error", "Error de Hardware", "No se pudo tomar la fotografía.");
      }
    }
  };

  const handleSubmit = async () => {
    ejecutarVibracion("toque");

    const formValidation = validateClienteForm({
      nombres,
      apellidos,
      dni,
      email,
      password,
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
      await registrarCliente({
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        dni: dni.trim(),
        email: email.trim(),
        password,
        fotoUri: fotoUri!,
      });

      mostrarMensaje(
        "exito",
        "Registro Pendiente",
        "Su solicitud ha sido enviada con éxito. Un Dueño o Supervisor deberá aprobar su cuenta antes de que pueda iniciar sesión. Se le notificará por correo.",
        () => {
          onVolverAlLogin?.();
        }
      );
    } catch (error: any) {
      mostrarMensaje("error", "Error de Registro", error.message || "Ocurrió un error inesperado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, overflow: "hidden" }}>
      <StatusBar style="light" />
      {/* Barra superior: Botón Volver (solo si viene de Login) + Nombres del equipo a la derecha */}
      <View
        className={`flex-row items-center px-5 pt-3 z-20 ${
          onVolverAlLogin ? "justify-between" : "justify-end"
        }`}
      >
        {onVolverAlLogin && (
          <TouchableOpacity
            onPress={() => {
              ejecutarVibracion("toque");
              onVolverAlLogin();
            }}
            className="rounded-xl border border-mostaza bg-vino px-3 py-1.5 active:bg-terracota"
          >
            <Text className="text-xs font-bold text-mostaza">← Volver</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Nombres del equipo */}
      <View className="absolute right-4 z-10 items-end" style={{ top: insets.top + 16 }}>
        <Text className="text-[10px] text-vino/70">Rocío Sanchez</Text>
        <Text className="text-[10px] text-vino/70">Santino Casado</Text>
        <Text className="text-[10px] text-vino/70">Sebastián Andreozzi</Text>
        <Text className="text-[10px] text-vino/70">Valentín Brazanovich</Text>
      </View>

      {/* Cabecera */}
      <View className="px-5 pt-4">
        <View className="mb-4">
          <Image
            source={require("../../assets/images/logo-name.png")}
            style={{ marginTop: -10, aspectRatio: 3 }}
            className="h-16 w-auto self-center"
            resizeMode="contain"
          />
          <Image
            source={require("../../assets/images/separator.png")}
            className="my-2 h-5 w-full"
            resizeMode="contain"
          />
          <ChineseFrame className="mt-2 bg-vino">
            <View className="items-center rounded-xl bg-mostaza/15 px-4 py-4">
              <Text style={{ fontFamily: "LaOriental" }} className="text-2xl text-mostaza uppercase">
                Registro de Cliente
              </Text>
              <Text className="mt-1 text-xs font-semibold text-amber-100">
                {modo === "metre" ? "Carga: Metre" : "Auto-registro: Cliente"} •{" "}
                <Text className="text-mostaza font-bold">Pendiente de Aprobación</Text>
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
            <TouchableOpacity
              onPress={async () => {
                if (!permission?.granted) await requestPermission();
                ejecutarVibracion("toque");
                setIsQrScannerOpen(true);
              }}
              className="mb-4 flex-row items-center justify-center rounded-2xl border border-vino bg-mostaza py-3 px-4 active:bg-[#f5dccb]"
            >
              <Image source={require("../../assets/images/dni3.png")} className="mr-4 h-6 w-6" />
              <Text style={{ fontFamily: "LaOriental" }} className="uppercase text-vino text-xs">
                Escanear Código de DNI
              </Text>
            </TouchableOpacity>

            <View className="mx-4 gap-y-3">
              {/* Nombres */}
              <View>
                <Text className="mb-1 text-xs font-bold text-vino">Nombres *</Text>
                <TextInput
                  value={nombres}
                  onChangeText={setNombres}
                  placeholder="Ingrese sus nombres"
                  placeholderTextColor="#a37e1f"
                  className={`rounded-xl border px-3 py-2.5 text-stone-700 ${
                    errors.nombres ? "border-terracota" : "border-mostaza"
                  }`}
                />
                {errors.nombres && (
                  <Text className="mt-1 text-xs text-rose-400">{errors.nombres}</Text>
                )}
              </View>

              {/* Apellidos */}
              <View>
                <Text className="mb-1 text-xs font-bold text-vino">Apellidos *</Text>
                <TextInput
                  value={apellidos}
                  onChangeText={setApellidos}
                  placeholder="Ingrese sus apellidos"
                  placeholderTextColor="#a37e1f"
                  className={`rounded-xl border px-3 py-2.5 text-stone-700 ${
                    errors.apellidos ? "border-terracota" : "border-mostaza"
                  }`}
                />
                {errors.apellidos && (
                  <Text className="mt-1 text-xs text-rose-400">{errors.apellidos}</Text>
                )}
              </View>

              {/* DNI */}
              <View>
                <Text className="mb-1 text-xs font-bold text-vino">Número de DNI *</Text>
                <TextInput
                  value={dni}
                  onChangeText={setDni}
                  keyboardType="numeric"
                  maxLength={8}
                  placeholder="Ej: 41234567"
                  placeholderTextColor="#a37e1f"
                  className={`rounded-xl border px-3 py-2.5 text-stone-700 ${
                    errors.dni ? "border-terracota" : "border-mostaza"
                  }`}
                />
                {errors.dni && <Text className="mt-1 text-xs text-rose-400">{errors.dni}</Text>}
              </View>
            </View>

            {/* Paginación + Siguiente */}
            <View className="mx-4 mt-5 items-center">
              <View className="flex-row items-center justify-center gap-2 py-1 mb-2">
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
                onPress={() => {
                  ejecutarVibracion("toque");
                  scrollRef.current?.scrollTo({ x: screenWidth, animated: true });
                }}
                className="w-full flex-row items-center justify-center rounded-2xl border border-calabaza bg-[#FBE9DF] py-2.5 active:bg-[#f5dccb]"
              >
                <Text style={{ fontFamily: "LaOriental" }} className="text-xs text-calabaza">
                  Siguiente (Credenciales y Foto) →
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* SECCIÓN 1: Credenciales y Foto Personal Centrada */}
        <View style={{ width: screenWidth }} className="flex-1 px-5 pt-2">
          <ScrollView
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            <View className="mx-4 gap-y-3">
              {/* Email */}
              <View>
                <Text className="mb-1 text-xs font-bold text-vino">Correo Electrónico *</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="ejemplo@correo.com"
                  placeholderTextColor="#a37e1f"
                  className={`rounded-xl border px-3 py-2.5 text-stone-700 ${
                    errors.email ? "border-terracota" : "border-mostaza"
                  }`}
                />
                {errors.email && (
                  <Text className="mt-1 text-xs text-rose-400">{errors.email}</Text>
                )}
              </View>

              {/* Contraseña */}
              <View>
                <Text className="mb-1 text-xs font-bold text-vino">Contraseña *</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor="#a37e1f"
                  className={`rounded-xl border px-3 py-2.5 text-stone-700 ${
                    errors.password ? "border-terracota" : "border-mostaza"
                  }`}
                />
                {errors.password && (
                  <Text className="mt-1 text-xs text-rose-400">{errors.password}</Text>
                )}
              </View>
            </View>

            {/* Fotografía Personal (Solo Cámara Física) */}
            <View className="mx-4 mt-4 rounded-2xl border border-mostaza p-3 items-center">
              <Text className="mb-2 text-xs font-bold text-vino">
                Fotografía Personal (En vivo) *
              </Text>

              {fotoUri ? (
                <View className="items-center">
                  <Image
                    source={{ uri: fotoUri }}
                    className="h-36 w-36 rounded-2xl border border-calabaza"
                  />
                  <TouchableOpacity
                    onPress={() => {
                      ejecutarVibracion("toque");
                      setIsCameraOpen(true);
                    }}
                    className="mt-2 rounded-xl border border-calabaza bg-[#FBE9DF] px-4 py-2 active:bg-amber-700"
                  >
                    <Text className="text-[11px] font-bold text-calabaza">Tomar otra foto</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={async () => {
                    if (!permission?.granted) await requestPermission();
                    ejecutarVibracion("toque");
                    setIsCameraOpen(true);
                  }}
                  className="h-28 w-full items-center justify-center rounded-xl border border-dashed border-amber-600/50"
                >
                  <Image source={require("../../assets/images/camera.png")} className="mb-1 h-7 w-7" />
                  <Text className="text-xs font-bold text-terracota">Tomar Foto con Cámara</Text>
                  <Text className="text-[9px] text-stone-400">Prohibido elegir de la galería</Text>
                </TouchableOpacity>
              )}

              {errors.fotoUri && (
                <Text className="mt-1 text-center text-xs text-rose-400">{errors.fotoUri}</Text>
              )}
            </View>

            {/* Botón de Envío */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting}
              className="mt-4 flex-row items-center justify-center rounded-2xl border border-amber-400/40 bg-vino py-3 active:bg-terracota"
            >
              <Image
                source={require("../../assets/images/sello.png")}
                className="h-6 w-6"
                resizeMode="contain"
              />
              <Text
                style={{ fontFamily: "LaOriental" }}
                className="mx-6 text-center text-base uppercase tracking-wider text-mostaza"
              >
                Solicitar Registro
              </Text>
              <Image
                source={require("../../assets/images/sello.png")}
                className="h-6 w-6"
                resizeMode="contain"
              />
            </TouchableOpacity>

            {/* Volver al paso 0 */}
            <View className="mx-4 mt-3 items-center">
              <TouchableOpacity
                onPress={() => {
                  ejecutarVibracion("toque");
                  scrollRef.current?.scrollTo({ x: 0, animated: true });
                }}
                className="w-full flex-row items-center justify-center rounded-2xl border border-mostaza/40 bg-[#FBE9DF] py-2 active:bg-[#f5dccb]"
              >
                <Text style={{ fontFamily: "LaOriental" }} className="text-xs text-calabaza">
                  ← Volver a Datos Personales
                </Text>
              </TouchableOpacity>
            </View>
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
              <View className="flex-row items-center justify-evenly rounded-xl bg-mostaza/15 px-4 py-5">
                <Text style={{ fontFamily: "LaOriental" }} className="text-xs text-mostaza">
                  Enfoque el DNI argentino
                </Text>
                <TouchableOpacity
                  onPress={() => setIsQrScannerOpen(false)}
                  className="bg-mostaza px-2.5 py-1.5 active:bg-rose-800"
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