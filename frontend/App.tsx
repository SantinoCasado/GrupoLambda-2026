import "./global.css";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { CameraView, useCameraPermissions, BarcodeScanningResult } from "expo-camera";
import { parseDniData } from "./src/utils/dniParser";
import { validarFormEmpleado, FormErrors } from "./src/utils/validators";
import { registrarEmpleadoMock } from "./src/services/empleadosService";
import { FeedbackModal } from "./src/components/FeedbackModal";
import { CompanySpinner } from "./src/components/CompanySpinner";

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();

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
        "Documento Nacional de Identidad Leído",
        `Datos cargados: ${parsed.apellidos}, ${parsed.nombres}`
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
        "Por favor, complete correctamente los campos marcados en color carmín."
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
        }
      );
    } catch (error: any) {
      mostrarMensaje("error", "Fallo de Registro", error.message || "Ocurrió un error inesperado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-stone-900">
      <StatusBar style="light" />

      <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Cabecera sin fondos negros ni blancos */}
        <View className="mb-5 rounded-2xl border border-amber-600/30 bg-stone-800 p-4 shadow-md">
          <Text className="text-2xl font-black tracking-wider text-amber-400">
            Alta de Empleado
          </Text>
          <Text className="mt-1 text-xs font-semibold text-stone-300">
            Perfil asignado: <Text className="font-extrabold text-amber-200 uppercase">Cocinero</Text> • Dueño o Supervisor
          </Text>
        </View>

        {/* Botón Lector QR DNI */}
        <TouchableOpacity
          onPress={async () => {
            if (!permission?.granted) await requestPermission();
            ejecutarVibracion("toque");
            setIsQrScannerOpen(true);
          }}
          className="mb-5 flex-row items-center justify-center rounded-2xl border border-amber-500/60 bg-amber-700/40 py-3.5 px-4 shadow-sm active:bg-amber-700/60"
        >
          <Text className="mr-2 text-lg">📷</Text>
          <Text className="text-sm font-bold text-amber-100">
            Escanear Código QR de DNI
          </Text>
        </TouchableOpacity>

        {/* Contenedor de Formularios */}
        <View className="gap-y-4 rounded-2xl border border-stone-700 bg-stone-800/80 p-4 shadow-sm">
          {/* Nombres */}
          <View>
            <Text className="mb-1 text-xs font-bold text-amber-200">Nombres *</Text>
            <TextInput
              value={nombres}
              onChangeText={setNombres}
              placeholder="Ingrese los nombres"
              placeholderTextColor="#a8a29e"
              className={`rounded-xl border bg-stone-900 px-4 py-3 text-stone-100 ${
                errors.nombres ? "border-rose-500" : "border-stone-700"
              }`}
            />
            {errors.nombres && <Text className="mt-1 text-xs font-medium text-rose-400">{errors.nombres}</Text>}
          </View>

          {/* Apellidos */}
          <View>
            <Text className="mb-1 text-xs font-bold text-amber-200">Apellidos *</Text>
            <TextInput
              value={apellidos}
              onChangeText={setApellidos}
              placeholder="Ingrese los apellidos"
              placeholderTextColor="#a8a29e"
              className={`rounded-xl border bg-stone-900 px-4 py-3 text-stone-100 ${
                errors.apellidos ? "border-rose-500" : "border-stone-700"
              }`}
            />
            {errors.apellidos && <Text className="mt-1 text-xs font-medium text-rose-400">{errors.apellidos}</Text>}
          </View>

          {/* DNI */}
          <View>
            <Text className="mb-1 text-xs font-bold text-amber-200">Número de DNI *</Text>
            <TextInput
              value={dni}
              onChangeText={setDni}
              keyboardType="numeric"
              maxLength={8}
              placeholder="Ejemplo: 38123456"
              placeholderTextColor="#a8a29e"
              className={`rounded-xl border bg-stone-900 px-4 py-3 text-stone-100 ${
                errors.dni ? "border-rose-500" : "border-stone-700"
              }`}
            />
            {errors.dni && <Text className="mt-1 text-xs font-medium text-rose-400">{errors.dni}</Text>}
          </View>

          {/* CUIL */}
          <View>
            <Text className="mb-1 text-xs font-bold text-amber-200">Número de CUIL *</Text>
            <TextInput
              value={cuil}
              onChangeText={setCuil}
              keyboardType="numeric"
              maxLength={11}
              placeholder="Ejemplo: 20381234562"
              placeholderTextColor="#a8a29e"
              className={`rounded-xl border bg-stone-900 px-4 py-3 text-stone-100 ${
                errors.cuil ? "border-rose-500" : "border-stone-700"
              }`}
            />
            {errors.cuil && <Text className="mt-1 text-xs font-medium text-rose-400">{errors.cuil}</Text>}
          </View>

          {/* Correo Electrónico */}
          <View>
            <Text className="mb-1 text-xs font-bold text-amber-200">Correo Electrónico *</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="empleado@restaurante.com"
              placeholderTextColor="#a8a29e"
              className={`rounded-xl border bg-stone-900 px-4 py-3 text-stone-100 ${
                errors.email ? "border-rose-500" : "border-stone-700"
              }`}
            />
            {errors.email && <Text className="mt-1 text-xs font-medium text-rose-400">{errors.email}</Text>}
          </View>

          {/* Contraseña */}
          <View>
            <Text className="mb-1 text-xs font-bold text-amber-200">Contraseña *</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Mínimo seis caracteres"
              placeholderTextColor="#a8a29e"
              className={`rounded-xl border bg-stone-900 px-4 py-3 text-stone-100 ${
                errors.password ? "border-rose-500" : "border-stone-700"
              }`}
            />
            {errors.password && <Text className="mt-1 text-xs font-medium text-rose-400">{errors.password}</Text>}
          </View>
        </View>

        {/* Sección Fotografía Personal */}
        <View className="mt-5 rounded-2xl border border-stone-700 bg-stone-800/80 p-4 shadow-sm">
          <Text className="mb-2 text-xs font-bold text-amber-200">
            Fotografía Personal (Captura exclusiva desde la cámara) *
          </Text>

          {fotoUri ? (
            <View className="items-center">
              <Image
                source={{ uri: fotoUri }}
                className="h-44 w-44 rounded-2xl border-2 border-amber-500"
              />
              <TouchableOpacity
                onPress={() => {
                  ejecutarVibracion("toque");
                  setIsCameraOpen(true);
                }}
                className="mt-3 rounded-xl bg-amber-700/60 px-5 py-2.5 active:bg-amber-700"
              >
                <Text className="text-xs font-bold text-amber-100">Tomar otra fotografía</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={async () => {
                if (!permission?.granted) await requestPermission();
                ejecutarVibracion("toque");
                setIsCameraOpen(true);
              }}
              className="h-36 items-center justify-center rounded-xl border border-dashed border-amber-600/50 bg-stone-900/60 active:bg-stone-900"
            >
              <Text className="mb-1 text-3xl">📸</Text>
              <Text className="text-xs font-bold text-amber-100">Activar Cámara en Vivo</Text>
              <Text className="text-[10px] text-stone-400">Sin acceso a la galería de fotos</Text>
            </TouchableOpacity>
          )}

          {errors.fotoUri && (
            <Text className="mt-2 text-center text-xs font-medium text-rose-400">{errors.fotoUri}</Text>
          )}
        </View>

        {/* Spinner o Botón de Acción */}
        {isSubmitting ? (
          <View className="mt-6">
            <CompanySpinner mensaje="Registrando empleado cocinero..." />
          </View>
        ) : (
          <TouchableOpacity
            onPress={handleSubmit}
            className="mt-6 rounded-2xl border border-amber-400/40 bg-amber-600 py-4 shadow-lg active:bg-amber-700"
          >
            <Text className="text-center text-base font-extrabold uppercase tracking-wider text-amber-50">
              Registrar Empleado
            </Text>
          </TouchableOpacity>
        )}
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
          <View className="absolute top-12 left-6 right-6 flex-row items-center justify-between rounded-xl border border-amber-500/40 bg-stone-900/90 p-3.5">
            <Text className="text-xs font-bold text-amber-100">
              Enfoque el código del documento
            </Text>
            <TouchableOpacity
              onPress={() => setIsQrScannerOpen(false)}
              className="rounded-lg bg-rose-700 px-3 py-1.5 active:bg-rose-800"
            >
              <Text className="text-xs font-bold text-amber-50">Cerrar</Text>
            </TouchableOpacity>
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
              className="rounded-full border border-stone-600 bg-stone-900/80 px-4 py-2"
            >
              <Text className="text-xs font-bold text-amber-100">Cancelar</Text>
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
  );
}