import React, { useState } from "react";
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
import * as ImagePicker from "expo-image-picker";
import { validatePlatoForm, PlatoFormErrors } from "../utils/platoValidators";
import { registrarPlato } from "../services/platosService";
import { FeedbackModal } from "../components/FeedbackModal";
import { CompanySpinner } from "../components/CompanySpinner";

export default function App() {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [tiempoElaboracion, setTiempoElaboracion] = useState("");
  const [precio, setPrecio] = useState("");

  // Arreglo con 3 posiciones para las 3 fotos individuales
  const [fotos, setFotos] = useState<(string | null)[]>([null, null, null]);

  // Modal para seleccionar origen (Cámara o Galería)
  const [indiceFotoSeleccionada, setIndiceFotoSeleccionada] = useState<number | null>(null);
  const [modalOrigenVisible, setModalOrigenVisible] = useState(false);

  // Estados de validación y red
  const [errors, setErrors] = useState<PlatoFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Feedback
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

    setModalFeedback({ visible: true, tipo, titulo, mensaje, onAceptar });
  };

  // Abrir selector de origen
  const abrirSelectorFoto = (index: number) => {
    ejecutarVibracion("toque");
    setIndiceFotoSeleccionada(index);
    setModalOrigenVisible(true);
  };

  // Capturar con cámara
  const tomarFotoConCamara = async () => {
    setModalOrigenVisible(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      mostrarMensaje("error", "Permiso Denegado", "Se requiere autorización para acceder a la cámara.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri && indiceFotoSeleccionada !== null) {
      const nuevasFotos = [...fotos];
      nuevasFotos[indiceFotoSeleccionada] = result.assets[0].uri;
      setFotos(nuevasFotos);
      ejecutarVibracion("exito");
    }
  };

  // Seleccionar de galería
  const elegirDeGaleria = async () => {
    setModalOrigenVisible(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      mostrarMensaje("error", "Permiso Denegado", "Se requiere autorización para acceder a la galería.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri && indiceFotoSeleccionada !== null) {
      const nuevasFotos = [...fotos];
      nuevasFotos[indiceFotoSeleccionada] = result.assets[0].uri;
      setFotos(nuevasFotos);
      ejecutarVibracion("exito");
    }
  };

  // Envío del Formulario
  const handleSubmit = async () => {
    ejecutarVibracion("toque");

    const validacion = validatePlatoForm({
      nombre,
      descripcion,
      tiempoElaboracion,
      precio,
      fotos,
    });

    setErrors(validacion);

    if (Object.keys(validacion).length > 0) {
      mostrarMensaje(
        "error",
        "Formulario Incompleto",
        "Por favor, complete todos los campos requeridos y cargue las tres fotografías correspondientes."
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await registrarPlato({
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        tiempoElaboracionMinutos: parseInt(tiempoElaboracion, 10),
        precio: parseFloat(precio.replace(",", ".")),
        fotos: fotos as string[],
      });

      mostrarMensaje(
        "exito",
        "Plato Registrado",
        "El nuevo plato ha sido verificado e incorporado exitosamente a la carta del restaurante.",
        () => {
          setNombre("");
          setDescripcion("");
          setTiempoElaboracion("");
          setPrecio("");
          setFotos([null, null, null]);
          setErrors({});
        }
      );
    } catch (error: any) {
      mostrarMensaje("error", "Validación de Menú", error.message || "Error al registrar el plato.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-vino">
      <StatusBar style="light" />

      <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Cabecera */}
        <View className="mb-5 rounded-3xl border-2 border-caramelo bg-vino p-4 shadow-md">
          <Text className="text-2xl font-black tracking-wider text-mostaza">
            Alta de Plato
          </Text>
          <Text className="mt-1 text-xs font-bold uppercase tracking-wide text-amber-100">
            Perfil: Cocinero • Dispositivo 2
          </Text>
        </View>

        {/* Campos de texto */}
        <View className="gap-y-4 rounded-3xl border-2 border-caramelo bg-vino p-4 shadow-md">
          {/* Nombre */}
          <View>
            <Text className="mb-1 text-xs font-bold text-mostaza">Nombre del Plato *</Text>
            <TextInput
              value={nombre}
              onChangeText={setNombre}
              placeholder="Ejemplo: Pastel de Papa Tradicional"
              placeholderTextColor="#f7b53880"
              className={`rounded-2xl border-2 bg-vino px-4 py-3 text-amber-50 ${
                errors.nombre ? "border-terracota" : "border-caramelo"
              }`}
            />
            {errors.nombre && <Text className="mt-1 text-xs font-bold text-terracota">{errors.nombre}</Text>}
          </View>

          {/* Descripción */}
          <View>
            <Text className="mb-1 text-xs font-bold text-mostaza">Descripción del Plato *</Text>
            <TextInput
              value={descripcion}
              onChangeText={setDescripcion}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              placeholder="Describa ingredientes, guarniciones y modo de preparación"
              placeholderTextColor="#f7b53880"
              className={`rounded-2xl border-2 bg-vino px-4 py-3 text-amber-50 ${
                errors.descripcion ? "border-terracota" : "border-caramelo"
              }`}
            />
            {errors.descripcion && <Text className="mt-1 text-xs font-bold text-terracota">{errors.descripcion}</Text>}
          </View>

          {/* Tiempo y Precio */}
          <View className="flex-row gap-x-3">
            <View className="flex-1">
              <Text className="mb-1 text-xs font-bold text-mostaza">Tiempo (Minutos) *</Text>
              <TextInput
                value={tiempoElaboracion}
                onChangeText={setTiempoElaboracion}
                keyboardType="numeric"
                maxLength={3}
                placeholder="Ejemplo: 35"
                placeholderTextColor="#f7b53880"
                className={`rounded-2xl border-2 bg-vino px-4 py-3 text-amber-50 ${
                  errors.tiempoElaboracion ? "border-terracota" : "border-caramelo"
                }`}
              />
              {errors.tiempoElaboracion && (
                <Text className="mt-1 text-xs font-bold text-terracota">{errors.tiempoElaboracion}</Text>
              )}
            </View>

            <View className="flex-1">
              <Text className="mb-1 text-xs font-bold text-mostaza">Precio ($) *</Text>
              <TextInput
                value={precio}
                onChangeText={setPrecio}
                keyboardType="numeric"
                placeholder="Ejemplo: 9500"
                placeholderTextColor="#f7b53880"
                className={`rounded-2xl border-2 bg-vino px-4 py-3 text-amber-50 ${
                  errors.precio ? "border-terracota" : "border-caramelo"
                }`}
              />
              {errors.precio && (
                <Text className="mt-1 text-xs font-bold text-terracota">{errors.precio}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Sección de 3 Fotos Individuales */}
        <View className="mt-5 rounded-3xl border-2 border-caramelo bg-vino p-4 shadow-md">
          <Text className="mb-1 text-sm font-black text-mostaza">
            Fotografías del Plato (3 Requeridas) *
          </Text>
          <Text className="mb-4 text-xs font-medium text-amber-100">
            Imágenes individuales, centradas y con opción de reemplazo.
          </Text>

          {errors.fotos && (
            <Text className="mb-3 text-center text-xs font-bold text-terracota">{errors.fotos}</Text>
          )}

          <View className="gap-y-4">
            {[0, 1, 2].map((index) => {
              const fotoUri = fotos[index];
              return (
                <View
                  key={index}
                  className="items-center rounded-2xl border-2 border-caramelo bg-vino/60 p-3"
                >
                  <Text className="mb-2 text-xs font-bold text-mostaza">
                    Fotografía N° {index + 1}
                  </Text>

                  {fotoUri ? (
                    <View className="items-center">
                      <Image
                        source={{ uri: fotoUri }}
                        className="h-44 w-64 rounded-xl border-2 border-mostaza"
                        resizeMode="cover"
                      />
                      <TouchableOpacity
                        onPress={() => abrirSelectorFoto(index)}
                        className="mt-3 rounded-xl bg-calabaza px-4 py-2 active:bg-caramelo"
                      >
                        <Text className="text-xs font-bold text-amber-50">Cambiar Imagen</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => abrirSelectorFoto(index)}
                      className="h-32 w-64 items-center justify-center rounded-xl border-2 border-dashed border-mostaza/60 bg-caramelo/20 active:bg-caramelo/40"
                    >
                      <Text className="text-2xl mb-1">📷</Text>
                      <Text className="text-xs font-bold text-mostaza">
                        Cargar Fotografía {index + 1}
                      </Text>
                      <Text className="text-[10px] text-amber-200">Cámara o Galería</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Spinner o Botón de Acción */}
        <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting}
            className="mt-6 rounded-2xl border-2 border-mostaza bg-mostaza py-4 shadow-lg active:bg-caramelo"
          >
            <Text className="text-center text-base font-black uppercase tracking-wider text-vino">
              Agregar Plato a la Carta
            </Text>
          </TouchableOpacity>
      </ScrollView>

      {/* MODAL SELECTOR: CÁMARA O GALERÍA */}
      <Modal visible={modalOrigenVisible} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-vino/80 px-6">
          <View className="w-full max-w-sm rounded-3xl border-2 border-mostaza bg-vino p-5 shadow-2xl">
            <Text className="mb-4 text-center text-lg font-black text-mostaza">
              Seleccionar Origen
            </Text>

            <TouchableOpacity
              onPress={tomarFotoConCamara}
              className="mb-3 rounded-2xl bg-calabaza py-3.5 active:bg-caramelo"
            >
              <Text className="text-center font-bold text-amber-50">📷 Tomar Foto con Cámara</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={elegirDeGaleria}
              className="mb-4 rounded-2xl bg-caramelo py-3.5 active:bg-calabaza"
            >
              <Text className="text-center font-bold text-amber-50">🖼 Elegir de la Galería</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setModalOrigenVisible(false)}
              className="rounded-2xl border border-terracota bg-terracota/30 py-3 active:bg-terracota/50"
            >
              <Text className="text-center font-bold text-amber-100">Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <CompanySpinner visible={isSubmitting} mensaje="Verificando carta y guardando plato..." />

      {/* FEEDBACK MODAL PROPIO */}
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