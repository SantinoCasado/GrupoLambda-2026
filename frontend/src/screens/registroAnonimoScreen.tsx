import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Vibration,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { CameraView, useCameraPermissions } from "expo-camera";
import {
  registrarClienteAnonimo,
  ClienteAnonimoSesion,
} from "../services/clienteAnonimoService";
import { FeedbackModal } from "../components/FeedbackModal";
import { CompanySpinner } from "../components/CompanySpinner";
import { ConfirmModal } from "../components/ConfirmModal";
import { ChineseFrame } from "../components/ChineseFrame";

interface Props {
  onVolver: () => void;
  onRegistroExitoso: (cliente: ClienteAnonimoSesion) => void;
}

export function RegistroAnonimoScreen({ onVolver, onRegistroExitoso }: Props) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [nombre, setNombre] = useState("");
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [errors, setErrors] = useState<{ nombre?: string; fotoUri?: string }>({});
  const [modalConfirmarVisible, setModalConfirmarVisible] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);

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

  // Abrir cámara en vivo para la selfie
  const abrirCamara = async () => {
    if (!permission?.granted) await requestPermission();
    ejecutarVibracion("toque");
    setIsCameraOpen(true);
  };

  // Captura con la cámara en vivo
  const capturarFoto = async () => {
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

  const manejarToqueIngresar = () => {
    if (cargando) return;

    ejecutarVibracion("toque");

    const errores: { nombre?: string; fotoUri?: string } = {};
    if (!nombre.trim()) {
      errores.nombre = "Ingrese su nombre o apodo.";
    }
    if (!fotoUri) {
      errores.fotoUri = "Tome una foto para identificarse.";
    }
    setErrors(errores);

    if (Object.keys(errores).length > 0) {
      mostrarMensaje(
        "error",
        "Datos Incompletos",
        "Por favor, complete correctamente los campos marcados."
      );
      return;
    }

    setModalConfirmarVisible(true);
  };

  const confirmarIngreso = async () => {
    setModalConfirmarVisible(false);

    setCargando(true);
    const res = await registrarClienteAnonimo(nombre.trim(), fotoUri!);
    setCargando(false);

    if (res.exito && res.cliente) {
      mostrarMensaje(
        "exito",
        "Ingreso Registrado",
        "Ya estás en la lista de espera. El metre te llamará y te identificará por tu foto.",
        () => {
          onRegistroExitoso(res.cliente!);
        }
      );
    } else {
      mostrarMensaje(
        "error",
        "Error de Registro",
        res.error || "No se pudo registrar en la lista de espera."
      );
    }
  };

  return (
    <View style={{ flex: 1, overflow: "hidden" }}>
      <StatusBar style="light" />

      {/* Botón Volver al Login (top right) */}
      <TouchableOpacity
        onPress={() => {
          ejecutarVibracion("toque");
          onVolver();
        }}
        className="absolute right-4 z-20 rounded-xl border border-mostaza bg-vino px-3 py-1.5 active:bg-terracota"
        style={{ top: insets.top + 8 }}
      >
        <Image source={require("../../assets/images/left-arrow-y.png")} className="h-5 w-5" resizeMode="contain" />
      </TouchableOpacity>

      {/* Nombres del equipo */}
      <View className="absolute right-4 z-10 items-end" style={{ top: insets.top + 60 }}>
        <Text className="text-[10px] text-vino/70">Rocío Sanchez</Text>
        <Text className="text-[10px] text-vino/70">Santino Casado</Text>
        <Text className="text-[10px] text-vino/70">Sebastián Andreozzi</Text>
        <Text className="text-[10px] text-vino/70">Valentín Brazanovich</Text>
      </View>

      {/* Cabecera */}
      <View className="px-5 pt-16">
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
            <View className="items-center rounded-xl bg-mostaza/15 px-5 py-5">
              <Text style={{ fontFamily: "LaOriental" }} className="text-2xl text-mostaza uppercase text-xl">
                Ingresar como Invitado
              </Text>
              <Text className="mt-1 text-xs font-semibold text-amber-100">
                Ingresá tu nombre y una foto para asignarte una mesa.
              </Text>
            </View>
          </ChineseFrame>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-2"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
          <View className="mx-6 gap-y-4">
            {/* Nombre / Apodo */}
            <View>
              <Text className="mb-1 text-s font-bold text-vino">Tu Nombre / Apodo *</Text>
              <TextInput
                value={nombre}
                onChangeText={(v) => {
                  setNombre(v);
                  if (errors.nombre) setErrors((prev) => ({ ...prev, nombre: undefined }));
                }}
                placeholder="Ej: Valen"
                placeholderTextColor="#a37e1f"
                className={`rounded-xl border px-4 py-3 text-stone-700 ${
                  errors.nombre ? "border-terracota" : "border-mostaza"
                }`}
              />
              {errors.nombre && (
                <Text className="mt-1 text-xs font-medium text-rose-400">{errors.nombre}</Text>
              )}
            </View>
          </View>

          {/* Foto de Identificación */}
          <View className="mx-6 mt-5">
            <Text className="mb-2 text-s font-bold text-vino">
              Foto *
            </Text>

            <View className="rounded-2xl border border-mostaza p-4">
              {fotoUri ? (
              <View className="items-center">
                <Image
                  source={{ uri: fotoUri }}
                  className="h-44 w-44 rounded-2xl border border-calabaza"
                />
                <TouchableOpacity
                  onPress={abrirCamara}
                  className="mt-3 rounded-xl border-calabaza border bg-[#FBE9DF] px-5 py-2.5 active:bg-amber-700"
                >
                  <Text className="text-xs font-bold text-calabaza">Tomar otra fotografía</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={abrirCamara}
                className={`h-36 items-center justify-center rounded-xl border border-dashed ${
                  errors.fotoUri ? "border-terracota" : "border-amber-600/50"
                }`}
              >
                <Image source={require("../../assets/images/camera.png")} className="mb-1 h-9 w-9" />
                <Text className="text-xs font-bold text-terracota">Tomar Foto</Text>
                <Text className="text-[10px] text-stone-400">
                  El metre te identificará con esta foto al llamarte
                </Text>
              </TouchableOpacity>
            )}
            </View>
            {errors.fotoUri && (
              <Text className="mt-1 text-xs font-medium text-rose-400">{errors.fotoUri}</Text>
            )}
          </View>

          {/* Botón de Envío */}
          <TouchableOpacity
            onPress={manejarToqueIngresar}
            className="mt-6 flex-row items-center justify-center rounded-2xl border border-amber-400/40 bg-vino py-3 active:bg-terracota"
          >
            <Image
              source={require("../../assets/images/sello.png")}
              className="h-7 w-7"
              resizeMode="contain"
            />
            <Text
              style={{ fontFamily: "LaOriental" }}
              className="mx-4 text-center text-l uppercase tracking-wider text-mostaza"
            >
              Entrar a Lista de Espera
            </Text>
            <Image
              source={require("../../assets/images/sello.png")}
              className="h-7 w-7"
              resizeMode="contain"
            />
          </TouchableOpacity>

      </ScrollView>

      {/* SPINNER */}
      <CompanySpinner visible={cargando} mensaje="Registrando solicitud..." />

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
              onPress={capturarFoto}
              className="h-20 w-20 items-center justify-center rounded-full border-4 border-amber-300 bg-amber-500/30 active:bg-amber-500/50"
            >
              <View className="h-14 w-14 rounded-full bg-amber-400" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL CONFIRMACIÓN */}
      <ConfirmModal
        visible={modalConfirmarVisible}
        titulo="Ingresar a Lista de Espera"
        mensaje="¿Confirmás tu ingreso a la lista de espera?"
        textoConfirmar="Confirmar"
        textoCancelar="Cancelar"
        tipo="confirmar"
        onConfirm={confirmarIngreso}
        onCancel={() => setModalConfirmarVisible(false)}
      />

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