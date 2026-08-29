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
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { CameraView, useCameraPermissions, BarcodeScanningResult } from "expo-camera";
import { parseDniData } from "./src/utils/dniParser";
import { validarFormEmpleado, FormErrors } from "./src/utils/validators";
import { registrarEmpleadoMock } from "./src/services/empleadosService";

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();

  // Estados del Formulario
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [dni, setDni] = useState("");
  const [cuil, setCuil] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const perfil = "cocinero"; // Fijo según requerimiento
  const [fotoUri, setFotoUri] = useState<string | null>(null);

  // Modales
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  // Estado de carga y errores
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cameraRef = useRef<CameraView | null>(null);

  // Helper háptico
  const triggerHaptic = (type: "tap" | "success" | "error") => {
    if (type === "tap") Vibration.vibrate([0, 40, 0, 40]);
    else if (type === "success") Vibration.vibrate([0, 80, 60, 150]);
    else Vibration.vibrate([0, 100, 50, 100, 50, 200]);
  };

  // Manejador del Escaneo QR
  const handleBarCodeScanned = (result: BarcodeScanningResult) => {
    if (!result.data) return;

    triggerHaptic("success");
    const parsed = parseDniData(result.data);

    if (parsed && (parsed.dni || parsed.apellidos)) {
      if (parsed.nombres) setNombres(parsed.nombres);
      if (parsed.apellidos) setApellidos(parsed.apellidos);
      if (parsed.dni) setDni(parsed.dni);

      setIsQrScannerOpen(false);
      Alert.alert("DNI Leído", `Datos completados: ${parsed.apellidos}, ${parsed.nombres}`);
    } else {
      // Si el código no tenía el formato de DNI
      setIsQrScannerOpen(false);
      triggerHaptic("error");
      Alert.alert("Aviso", "El código escaneado no tiene formato de DNI argentino válido.");
    }
  };

  // Manejador de la Captura de Foto
  const handleTakePhoto = async () => {
    if (cameraRef.current) {
      try {
        triggerHaptic("tap");
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
        if (photo?.uri) {
          setFotoUri(photo.uri);
          setIsCameraOpen(false);
          triggerHaptic("success");
        }
      } catch (err) {
        Alert.alert("Error", "No se pudo capturar la foto.");
      }
    }
  };

  // Enviar el formulario
  const handleSubmit = async () => {
    triggerHaptic("tap");

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
      triggerHaptic("error");
      Alert.alert("Validación", "Por favor corrige los campos marcados en rojo.");
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

      triggerHaptic("success");
      Alert.alert("¡Éxito!", "Empleado Cocinero registrado correctamente (dispositivo 1).", [
        {
          text: "OK",
          onPress: () => {
            // Limpiar formulario
            setNombres("");
            setApellidos("");
            setDni("");
            setCuil("");
            setEmail("");
            setPassword("");
            setFotoUri(null);
            setErrors({});
          },
        },
      ]);
    } catch (error: any) {
      triggerHaptic("error");
      Alert.alert("Error de Registro", error.message || "Ocurrió un error inesperado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <StatusBar style="light" />

      <ScrollView className="flex-1 px-5 pt-10" contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Cabecera */}
        <View className="mb-6">
          <Text className="text-2xl font-black text-teal-400">Alta de Empleado</Text>
          <Text className="text-xs text-slate-400">
            Perfil asignado: <Text className="font-bold text-teal-300 uppercase">Cocinero</Text> • Dueño / Supervisor
          </Text>
        </View>

        {/* Botón Escanear QR DNI */}
        <TouchableOpacity
          onPress={async () => {
            if (!permission?.granted) await requestPermission();
            triggerHaptic("tap");
            setIsQrScannerOpen(true);
          }}
          className="mb-6 flex-row items-center justify-center rounded-2xl bg-indigo-600/30 border border-indigo-500/50 py-3.5 px-4 active:bg-indigo-600/40"
        >
          <Text className="text-lg mr-2">📷</Text>
          <Text className="font-bold text-indigo-200 text-sm">
            Escanear Código QR de DNI
          </Text>
        </TouchableOpacity>

        {/* Campos de texto */}
        <View className="gap-y-4">
          {/* Nombres */}
          <View>
            <Text className="text-xs font-semibold text-slate-300 mb-1">Nombres *</Text>
            <TextInput
              value={nombres}
              onChangeText={setNombres}
              placeholder="Ej: Juan Martín"
              placeholderTextColor="#64748b"
              className={`rounded-xl bg-slate-900 border px-4 py-3 text-slate-100 ${
                errors.nombres ? "border-rose-500" : "border-slate-800"
              }`}
            />
            {errors.nombres && <Text className="text-rose-400 text-xs mt-1">{errors.nombres}</Text>}
          </View>

          {/* Apellidos */}
          <View>
            <Text className="text-xs font-semibold text-slate-300 mb-1">Apellidos *</Text>
            <TextInput
              value={apellidos}
              onChangeText={setApellidos}
              placeholder="Ej: Pérez"
              placeholderTextColor="#64748b"
              className={`rounded-xl bg-slate-900 border px-4 py-3 text-slate-100 ${
                errors.apellidos ? "border-rose-500" : "border-slate-800"
              }`}
            />
            {errors.apellidos && <Text className="text-rose-400 text-xs mt-1">{errors.apellidos}</Text>}
          </View>

          {/* DNI */}
          <View>
            <Text className="text-xs font-semibold text-slate-300 mb-1">Número de DNI *</Text>
            <TextInput
              value={dni}
              onChangeText={setDni}
              keyboardType="numeric"
              maxLength={8}
              placeholder="Ej: 38123456"
              placeholderTextColor="#64748b"
              className={`rounded-xl bg-slate-900 border px-4 py-3 text-slate-100 ${
                errors.dni ? "border-rose-500" : "border-slate-800"
              }`}
            />
            {errors.dni && <Text className="text-rose-400 text-xs mt-1">{errors.dni}</Text>}
          </View>

          {/* CUIL */}
          <View>
            <Text className="text-xs font-semibold text-slate-300 mb-1">Número de CUIL *</Text>
            <TextInput
              value={cuil}
              onChangeText={setCuil}
              keyboardType="numeric"
              maxLength={11}
              placeholder="Ej: 20381234562"
              placeholderTextColor="#64748b"
              className={`rounded-xl bg-slate-900 border px-4 py-3 text-slate-100 ${
                errors.cuil ? "border-rose-500" : "border-slate-800"
              }`}
            />
            {errors.cuil && <Text className="text-rose-400 text-xs mt-1">{errors.cuil}</Text>}
          </View>

          {/* Correo Electrónico */}
          <View>
            <Text className="text-xs font-semibold text-slate-300 mb-1">Correo Electrónico *</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="cocinero@restaurante.com"
              placeholderTextColor="#64748b"
              className={`rounded-xl bg-slate-900 border px-4 py-3 text-slate-100 ${
                errors.email ? "border-rose-500" : "border-slate-800"
              }`}
            />
            {errors.email && <Text className="text-rose-400 text-xs mt-1">{errors.email}</Text>}
          </View>

          {/* Contraseña */}
          <View>
            <Text className="text-xs font-semibold text-slate-300 mb-1">Contraseña *</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor="#64748b"
              className={`rounded-xl bg-slate-900 border px-4 py-3 text-slate-100 ${
                errors.password ? "border-rose-500" : "border-slate-800"
              }`}
            />
            {errors.password && <Text className="text-rose-400 text-xs mt-1">{errors.password}</Text>}
          </View>
        </View>

        {/* Sección Foto Personal (Cámara en Vivo Exclusiva) */}
        <View className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <Text className="text-xs font-semibold text-slate-300 mb-2">
            Foto Personal (Obligatoria desde la cámara) *
          </Text>

          {fotoUri ? (
            <View className="items-center">
              <Image
                source={{ uri: fotoUri }}
                className="h-44 w-44 rounded-2xl border-2 border-teal-500"
              />
              <TouchableOpacity
                onPress={() => {
                  triggerHaptic("tap");
                  setIsCameraOpen(true);
                }}
                className="mt-3 rounded-xl bg-slate-800 px-4 py-2 active:bg-slate-700"
              >
                <Text className="text-xs font-bold text-teal-400">Tomar otra foto</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={async () => {
                if (!permission?.granted) await requestPermission();
                triggerHaptic("tap");
                setIsCameraOpen(true);
              }}
              className="h-36 items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950/40 active:bg-slate-900"
            >
              <Text className="text-3xl mb-1">📸</Text>
              <Text className="text-xs font-bold text-slate-300">Abrir Cámara en Vivo</Text>
              <Text className="text-[10px] text-slate-500">Sin acceso a galería de fotos</Text>
            </TouchableOpacity>
          )}

          {errors.fotoUri && (
            <Text className="text-rose-400 text-xs mt-2 text-center">{errors.fotoUri}</Text>
          )}
        </View>

        {/* Botón Registrar */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting}
          className="mt-8 rounded-2xl bg-teal-500 py-4 items-center active:bg-teal-600 disabled:opacity-50"
        >
          {isSubmitting ? (
            <ActivityIndicator color="#020617" />
          ) : (
            <Text className="font-bold text-slate-950 text-base">Registrar Empleado</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* MODAL 1: ESCÁNER QR DNI */}
      <Modal visible={isQrScannerOpen} animationType="slide">
        <View className="flex-1 bg-black">
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ["qr", "pdf417"],
            }}
            onBarcodeScanned={handleBarCodeScanned}
          />
          <View className="absolute top-12 left-6 right-6 flex-row justify-between items-center bg-black/50 p-3 rounded-xl">
            <Text className="text-white text-xs font-semibold">
              Enfoca el código QR o PDF417 del DNI
            </Text>
            <TouchableOpacity
              onPress={() => setIsQrScannerOpen(false)}
              className="bg-rose-600 px-3 py-1.5 rounded-lg"
            >
              <Text className="text-white text-xs font-bold">Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: CÁMARA PARA FOTO EN VIVO */}
      <Modal visible={isCameraOpen} animationType="slide">
        <View className="flex-1 bg-black">
          <CameraView ref={cameraRef} style={{ flex: 1 }} facing="front" />

          {/* Botón Cancelar arriba */}
          <View className="absolute top-12 right-6">
            <TouchableOpacity
              onPress={() => setIsCameraOpen(false)}
              className="bg-black/60 px-4 py-2 rounded-full"
            >
              <Text className="text-white text-xs font-bold">Cancelar</Text>
            </TouchableOpacity>
          </View>

          {/* Botón de disparo abajo */}
          <View className="absolute bottom-10 left-0 right-0 items-center">
            <TouchableOpacity
              onPress={handleTakePhoto}
              className="h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white/20 active:bg-white/40"
            >
              <View className="h-14 w-14 rounded-full bg-white" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}