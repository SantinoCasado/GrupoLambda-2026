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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { CameraView, useCameraPermissions, BarcodeScanningResult } from "expo-camera";
import { parseDniData } from "../utils/dniParser";
import { validarFormEmpleado, FormErrors } from "../utils/validators";
import { registrarEmpleadoMock } from "../services/empleadosService";
import { FeedbackModal } from "../components/FeedbackModal";
import { CompanySpinner } from "../components/CompanySpinner";
import { ChineseFrame } from "../components/ChineseFrame";


export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const insets = useSafeAreaInsets();

  // Estados del Formulario
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [dni, setDni] = useState("");
  const [cuil, setCuil] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const perfil = "cocinero";
  const [fotoUri, setFotoUri] = useState<string | null>(null);

  // Modales de Hardware
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  // Estados de Validación y Envío
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado del Modal de Feedback (Reemplazo obligatorio de Alert)
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
  const screenWidth = Dimensions.get("window").width;

  // Control centralizado de vibración
  const ejecutarVibracion = (tipo: "exito" | "error" | "toque") => {
    if (tipo === "error") {
      Vibration.vibrate([0, 100, 50, 100, 50, 200]);
    } else if (tipo === "exito") {
      Vibration.vibrate([0, 80, 60, 150]);
    } else {
      Vibration.vibrate([0, 40]);
    }
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

  // Manejo de lectura de código QR
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
        "DNI Leído",
        `Datos de: ${parsed.apellidos}, ${parsed.nombres}`
      );
    } else {
      setIsQrScannerOpen(false);
      mostrarMensaje(
        "error",
        "Lectura Fallida",
        "El código escaneado no coincide con el formato oficial del DNI argentino."
      );
    }
  };

  // Captura de foto con cámara física
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
        mostrarMensaje("error", "Error de Hardware", "No se pudo realizar la captura fotográfica.");
      }
    }
  };

  // Envío del Formulario
  const handleSubmit = async () => {
    ejecutarVibracion("toque");

    const formValidation = validarFormEmpleado({
      nombres,
      apellidos,
      dni,
      cuil,
      email,
      password,
      fotoUri,
    });

    setErrors(formValidation);

    if (Object.keys(formValidation).length > 0) {
      mostrarMensaje(
        "error",
        "Datos Inválidos",
        "Por favor, complete correctamente los campos marcados."
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await registrarEmpleadoMock({
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        dni: dni.trim(),
        cuil: cuil.trim(),
        email: email.trim(),
        password,
        perfil,
        fotoUri: fotoUri!,
      });

      mostrarMensaje(
        "exito",
        "Registro Exitoso",
        "El empleado cocinero ha sido registrado satisfactoriamente en el sistema.",
        () => {
          setNombres("");
          setApellidos("");
          setDni("");
          setCuil("");
          setEmail("");
          setPassword("");
          setFotoUri(null);
          setErrors({});
          scrollRef.current?.scrollTo({ x: 0, animated: false });
          setCurrentStep(0);
        }
      );
    } catch (error: any) {
      mostrarMensaje("error", "Fallo de Registro", error.message || "Ocurrió un error inesperado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <View
        style={{ position: "absolute", width: "100%", height: "100%", backgroundColor: "#FFF6EC" }}
      />
      <Image
        source={require("../../assets/images/background-test-3.png")}
        style={{ position: "absolute", width: "100%", height: "100%" }}
        resizeMode="cover"
      />
    <SafeAreaView className="flex-1">

      <StatusBar style="light" />

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
            <Text style={{ fontFamily: "LaOriental" }} className="text-2xl  text-mostaza uppercase">
              Alta de Empleado
            </Text>
            <Text className="mt-1 text-xs font-semibold text-amber-100">
              Perfil asignado: <Text className="font-extrabold text-mostaza uppercase">Cocinero</Text> • Dueño o Supervisor
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
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const step = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
          setCurrentStep(step);
        }}
        style={{ flex: 1 }}
      >
        {/* SECCIÓN 0: DNI e Información Personal */}
        <View style={{ width: screenWidth }} className="px-5 pt-2">
          <TouchableOpacity
            onPress={async () => {
              if (!permission?.granted) await requestPermission();
              ejecutarVibracion("toque");
              setIsQrScannerOpen(true);
            }}
            className="mb-5 flex-row items-center justify-center rounded-2xl border border-vino bg-mostaza py-3.5 px-4 active:bg-[#f5dccb]"
          >
            <Image source={require("../../assets/images/dni3.png")} className="mr-5 h-7 w-7" />
            <Text style={{ fontFamily: "LaOriental" }} className="uppercase text-vino">
              Escanear Código de DNI
            </Text>
          </TouchableOpacity>

          <View className="mx-6 gap-y-4">
            {/* Nombres */}
            <View>
              <Text className="mb-1 text-s font-bold text-vino">Nombres *</Text>
              <TextInput
                value={nombres}
                onChangeText={setNombres}
                placeholder="Ingrese los nombres"
                placeholderTextColor="#a37e1f"
                className={`rounded-xl border px-4 py-3 text-stone-700 ${
                  errors.nombres ? "border-terracota" : "border-mostaza"
                }`}
              />
              {errors.nombres && <Text className="mt-1 text-xs font-medium text-rose-400">{errors.nombres}</Text>}
            </View>

            {/* Apellidos */}
            <View>
              <Text className="mb-1 text-s font-bold text-vino">Apellidos *</Text>
              <TextInput
                value={apellidos}
                onChangeText={setApellidos}
                placeholder="Ingrese los apellidos"
                placeholderTextColor="#a37e1f"
                className={`rounded-xl border px-4 py-3 text-stone-700 ${
                  errors.apellidos ? "border-terracota" : "border-mostaza"
                }`}
              />
              {errors.apellidos && <Text className="mt-1 text-xs font-medium text-rose-400">{errors.apellidos}</Text>}
            </View>

            {/* DNI */}
            <View>
              <Text className="mb-1 text-s font-bold text-vino">Número de DNI *</Text>
              <TextInput
                value={dni}
                onChangeText={setDni}
                keyboardType="numeric"
                maxLength={8}
                placeholder="Ejemplo: 38123456"
                placeholderTextColor="#a37e1f"
                className={`rounded-xl border px-4 py-3 text-stone-700 ${
                  errors.dni ? "border-terracota" : "border-mostaza"
                }`}
              />
              {errors.dni && <Text className="mt-1 text-xs font-medium text-rose-400">{errors.dni}</Text>}
            </View>

            {/* CUIL */}
            <View>
              <Text className="mb-1 text-s font-bold text-vino">Número de CUIL *</Text>
              <TextInput
                value={cuil}
                onChangeText={setCuil}
                keyboardType="numeric"
                maxLength={11}
                placeholder="Ejemplo: 20381234562"
                placeholderTextColor="#a37e1f"
                className={`rounded-xl border px-4 py-3 text-stone-700 ${
                  errors.cuil ? "border-terracota" : "border-mostaza"
                }`}
              />
              {errors.cuil && <Text className="mt-1 text-xs font-medium text-rose-400">{errors.cuil}</Text>}
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
              onPress={() => {
                ejecutarVibracion("toque");
                scrollRef.current?.scrollTo({
                  x: screenWidth,
                  animated: true,
                });
              }}
              className="w-full flex-row items-center justify-center rounded-2xl border border-calabaza bg-[#FBE9DF] py-3 active:bg-[#f5dccb]"
            >
              <Text style={{ fontFamily: "LaOriental" }}  className="text-s  text-calabaza">Siguiente</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SECCIÓN 1: Cuenta, Foto y Registro */}
        <View style={{ width: screenWidth }} className="px-5 pt-2">
          <View className="mx-6 gap-y-4">
            {/* Correo Electrónico */}
            <View>
              <Text className="mb-1 text-s font-bold text-vino">Correo Electrónico *</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="empleado@restaurante.com"
                placeholderTextColor="#a37e1f"
                className={`rounded-xl border px-4 py-3 text-stone-700 ${
                  errors.email ? "border-terracota" : "border-mostaza"
                }`}
              />
              {errors.email && <Text className="mt-1 text-xs font-medium text-rose-400">{errors.email}</Text>}
            </View>

            {/* Contraseña */}
            <View>
              <Text className="mb-1 text-s font-bold text-vino">Contraseña *</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Mínimo seis caracteres"
                placeholderTextColor="#a37e1f"
                className={`rounded-xl border px-4 py-3 text-stone-700 ${
                  errors.password ? "border-terracota" : "border-mostaza"
                }`}
              />
              {errors.password && <Text className="mt-1 text-xs font-medium text-rose-400">{errors.password}</Text>}
            </View>
          </View>

          <View className="mx-4 mt-5 rounded-2xl border border-mostaza p-4">
            <Text className="mb-2 text-s font-bold text-vino">
              Fotografía Personal*
            </Text>

            {fotoUri ? (
              <View className="items-center">
                <Image
                  source={{ uri: fotoUri }}
                  className="h-44 w-44 rounded-2xl border border-calabaza"
                />
                <TouchableOpacity
                  onPress={() => {
                    ejecutarVibracion("toque");
                    setIsCameraOpen(true);
                  }}
                  className="mt-3 rounded-xl border-calabaza border bg-[#FBE9DF] px-5 py-2.5 active:bg-amber-700"
                >
                  <Text className="text-xs font-bold text-calabaza">Tomar otra fotografía</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={async () => {
                  if (!permission?.granted) await requestPermission();
                  ejecutarVibracion("toque");
                  setIsCameraOpen(true);
                }}
                className="h-36 items-center justify-center rounded-xl border border-dashed border-amber-600/50"
              >
                <Image source={require("../../assets/images/camera.png")} className="mb-1 h-9 w-9" />
                <Text className="text-xs font-bold text-terracota">Activar Cámara en Vivo</Text>
                <Text className="text-[10px] text-stone-400">Sin acceso a la galería de fotos</Text>
              </TouchableOpacity>
            )}

            {errors.fotoUri && (
              <Text className="mt-2 text-center text-xs font-medium text-rose-400">{errors.fotoUri}</Text>
            )}
          </View>

          {isSubmitting ? (
            <View className="mt-6">
              <CompanySpinner mensaje="Registrando empleado cocinero..." />
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleSubmit}
              className="mt-6 flex-row items-center justify-center rounded-2xl border border-amber-400/40 bg-vino py-3 active:bg-terracota"
            >
              <Image
                source={require("../../assets/images/sello.png")}
                className="h-7 w-7"
                resizeMode="contain"
              />
              <Text style={{ fontFamily: "LaOriental" }} className="mx-10 text-center text-l uppercase tracking-wider text-mostaza">
                Registrar Empleado
              </Text>
              <Image
                source={require("../../assets/images/sello.png")}
                className="h-7 w-7"
                resizeMode="contain"
              />
            </TouchableOpacity>
          )}

          {/* Paginación + Volver */}
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
              onPress={() => {
                ejecutarVibracion("toque");
                scrollRef.current?.scrollTo({
                  x: 0,
                  animated: true,
                });
              }}
              className="w-full flex-row items-center justify-center rounded-2xl border border-mostaza/40 bg-[#FBE9DF] py-3 active:bg-[#f5dccb]"
            >
              <Text style={{ fontFamily: "LaOriental" }} className="text-s text-calabaza">Volver</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* MODAL 1: ESCÁNER QR DNI */}
      <Modal visible={isQrScannerOpen} animationType="slide">
        <View className="flex-1 bg-stone-950">
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr", "pdf417"] }}
            onBarcodeScanned={handleBarCodeScanned}
          />
          <View className="absolute top-12 left-6 right-6">
            <ChineseFrame className="bg-vino" >
              <View className="flex-row items-center justify-evenly rounded-xl bg-mostaza/15 px-4 py-7">
              <Text style={{ fontFamily: "LaOriental" }} className="text-xs text-mostaza">
                Enfoque el código del documento
              </Text>
              <TouchableOpacity
                onPress={() => setIsQrScannerOpen(false)}
                className=" bg-mostaza px-2 py-1.5 active:bg-rose-800"
              >
                <Text style={{ fontFamily: "LaOriental" }}  className="text-xs text-terracota">Cerrar</Text>
              </TouchableOpacity>
            </View>
          </ChineseFrame>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: CÁMARA PARA FOTO EN VIVO */}
      <Modal visible={isCameraOpen} animationType="slide">
        <View className="flex-1 bg-stone-950">
          <CameraView ref={cameraRef} style={{ flex: 1 }} facing="front" />

          <View className="absolute top-12 right-6">
            <TouchableOpacity
              onPress={() => setIsCameraOpen(false)}
              className="border border-mostaza bg-vino px-4 py-2"
            >
              <Text style={{ fontFamily: "LaOriental" }} className="text-xs text-mostaza">Cerrar</Text>
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

      {/* MODAL GENERAL DE RETROALIMENTACIÓN (SIN ALERT) */}
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
    </SafeAreaView>
    </>
  );
}
