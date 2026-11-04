import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Modal,
  LayoutChangeEvent,
  useWindowDimensions,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { CameraView, useCameraPermissions } from "expo-camera";
import {
  CategoriaProducto,
  validateProductoForm,
  validateProductoPaso1,
  registrarProducto,
  ProductoFormErrors,
} from "../services/productosService";
import { ChineseFrame } from "../components/ChineseFrame";
import { OptionModal } from "../components/OptionModal";
import { FeedbackModal } from "../components/FeedbackModal";
import { CompanySpinner } from "../components/CompanySpinner";
import { StatusBar } from "expo-status-bar";

const ALTO_REFERENCIA = 560;

interface Props {
  categoria: CategoriaProducto;
  onSuccess?: () => void;
}

export default function AltaProductoScreen({ categoria, onSuccess }: Props) {
  const esBebida = categoria === "bebida";

  const config = {
    titulo: esBebida ? "Alta de Bebida" : "Alta de Plato",
    placeholderNombre: esBebida ? "Ej: Gin Tonic" : "Ej: Pollo Gong Bao",
    placeholderDesc: esBebida
      ? "Ej: Gin artesanal con agua tónica y rodajas de pomelo."
      : "Ej: Pollo marinado mezclado con un sofrito de guindillas y pimienta de Sichuan preparada en wok.",
    placeholderTiempo: esBebida ? "Ej: 5" : "Ej: 35",
    placeholderPrecio: esBebida ? "Ej: 10500" : "Ej: 28900",
    botonTexto: esBebida
      ? "Agregar Bebida a la Carta"
      : "Agregar Plato a la Carta",
  };

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [tiempoElaboracion, setTiempoElaboracion] = useState("");
  const [precio, setPrecio] = useState("");
  const [fotos, setFotos] = useState<(string | null)[]>([null, null, null]);

  const [errors, setErrors] = useState<ProductoFormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Cámara en vivo (misma estrategia que Alta Empleados, evita reinicios de la app)
  const [permission, requestPermission] = useCameraPermissions();
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);

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

  const mostrarMensaje = (
    tipo: "exito" | "error" | "informacion",
    titulo: string,
    mensaje: string,
    onAceptar?: () => void,
  ) => {
    if (tipo === "error")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    else if (tipo === "exito")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    setModalFeedback({
      visible: true,
      tipo,
      titulo,
      mensaje,
      onAceptar,
    });
  };

  // Carrusel de secciones
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const paso1Validado = useRef(false);
  const [currentStep, setCurrentStep] = useState(0);
  const { width: screenWidth } = useWindowDimensions();

  const [altoArea, setAltoArea] = useState(0);
  const onLayoutArea = (e: LayoutChangeEvent) => {
    const { height } = e.nativeEvent.layout;
    if (height > 0 && Math.abs(height - altoArea) > 1) setAltoArea(height);
  };

  const area = altoArea || ALTO_REFERENCIA;
  const k = Math.min(1.3, Math.max(0.6, area / ALTO_REFERENCIA));
  const px = (base: number, tope: number) =>
    Math.round(Math.min(base * k, area * tope));
  const texto = (base: number, tope: number) => Math.max(11, px(base, tope));

  // Avance al paso 2 con validación
  const irSiguiente = () => {
    if (isLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const paso1Errors = validateProductoPaso1(
      { nombre, descripcion, tiempoElaboracion, precio },
      categoria,
    );

    setErrors((prev) => {
      const cleaned = { ...prev };
      delete cleaned.fotos;
      return { ...cleaned, ...paso1Errors };
    });

    if (Object.keys(paso1Errors).length > 0) {
      mostrarMensaje(
        "error",
        "Datos Incompletos",
        "Por favor, complete correctamente los campos marcados antes de continuar.",
      );
      return;
    }

    paso1Validado.current = true;
    scrollRef.current?.scrollTo({ x: screenWidth, animated: true });
  };

  const irVolver = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scrollRef.current?.scrollTo({ x: 0, animated: true });
  };

  // Limpieza de error de campo cuando el valor se corrige
  const clearFieldError = (field: keyof ProductoFormErrors, value: string) => {
    if (!errors[field]) return;

    let valid = false;
    switch (field) {
      case "nombre":
        valid = value.trim().length >= 3;
        break;
      case "descripcion":
        valid = value.trim().length >= 8;
        break;
      case "tiempoElaboracion": {
        const num = Number(value);
        valid =
          value.trim() !== "" &&
          Number.isInteger(num) &&
          num > 0 &&
          num <= (esBebida ? 15 : 60);
        break;
      }
      case "precio": {
        const num = Number(value.replace(",", "."));
        valid = value.trim() !== "" && !isNaN(num) && num > 0;
        break;
      }
    }

    if (valid) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const abrirSelectorFoto = (index: number) => {
    setSelectedSlot(index);
    setModalVisible(true);
  };

  const abrirCamara = async () => {
    setModalVisible(false);
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        mostrarMensaje(
          "error",
          "Permiso Requerido",
          "Se requiere permiso de cámara para tomar fotos.",
        );
        return;
      }
    }
    setIsCameraOpen(true);
  };

  const tomarFoto = async () => {
    if (cameraRef.current) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
        });
        if (photo?.uri && selectedSlot !== null) {
          const actualizadas = [...fotos];
          actualizadas[selectedSlot] = photo.uri;
          setFotos(actualizadas);
          if (actualizadas.filter((f) => f !== null && f !== "").length >= 3) {
            setErrors((prev) => ({ ...prev, fotos: undefined }));
          }
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setIsCameraOpen(false);
        }
      } catch {
        mostrarMensaje(
          "error",
          "Error de Captura",
          "No se pudo tomar la fotografía. Inténtelo nuevamente.",
        );
      }
    }
  };

  const elegirGaleria = async () => {
    setModalVisible(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      mostrarMensaje(
        "error",
        "Permiso Requerido",
        "Se requiere permiso para acceder a la galería.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled && selectedSlot !== null) {
      const actualizadas = [...fotos];
      actualizadas[selectedSlot] = result.assets[0].uri;
      setFotos(actualizadas);
      if (actualizadas.filter((f) => f !== null && f !== "").length >= 3) {
        setErrors((prev) => ({ ...prev, fotos: undefined }));
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleSubmit = async () => {
    const formErrors = validateProductoForm(
      { nombre, descripcion, tiempoElaboracion, precio, fotos },
      categoria,
    );

    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      mostrarMensaje(
        "error",
        "Formulario Incompleto",
        "Por favor revisa los campos marcados en rojo.",
      );
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      await registrarProducto({
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        tiempoElaboracionMinutos: Number(tiempoElaboracion),
        precio: Number(precio.replace(",", ".")),
        fotos: fotos as string[],
        categoria,
      });

      mostrarMensaje(
        "exito",
        "¡Éxito!",
        `"${nombre.trim()}" se registró correctamente.`,
        () => {
          setNombre("");
          setDescripcion("");
          setTiempoElaboracion("");
          setPrecio("");
          setFotos([null, null, null]);
          scrollRef.current?.scrollTo({ x: 0, animated: false });
          setCurrentStep(0);
          paso1Validado.current = false;

          if (onSuccess) onSuccess();
        },
      );
    } catch (error: any) {
      mostrarMensaje(
        "error",
        "Error de Carga",
        error.message || "No se pudo registrar el producto.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1">
      <StatusBar style="light" />

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
              <Text
                style={{ fontFamily: "LaOriental" }}
                className="text-2xl text-mostaza uppercase"
              >
                {config.titulo}
              </Text>
              <Text className="mt-1 text-xs font-semibold text-amber-100">
                Carga los datos y 3 fotografías individuales para la carta.
              </Text>
            </View>
          </ChineseFrame>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
        onMomentumScrollEnd={(e) => {
          const step = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
          if (step === 1 && !paso1Validado.current) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            scrollRef.current?.scrollTo({ x: 0, animated: true });
            return;
          }
          setCurrentStep(step);
        }}
        style={{ flex: 1 }}
      >
        {/* SECCIÓN 1: Datos del producto */}
        <View
          style={{ width: screenWidth }}
          className="flex-1 px-5 pt-2"
          onLayout={onLayoutArea}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            contentContainerStyle={{ paddingBottom: px(20, 0.05) }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ marginHorizontal: px(8, 0.03), gap: px(8, 0.02) }}>
              {/* Nombre */}
              <View>
                <Text className="mb-1 text-s font-bold text-vino">
                  Nombre *
                </Text>
                <TextInput
                  value={nombre}
                  onChangeText={(v) => {
                    setNombre(v);
                    clearFieldError("nombre", v);
                  }}
                  placeholder={config.placeholderNombre}
                  placeholderTextColor="#a37e1f"
                  className={`rounded-xl border bg-[#FFF8EA] pl-4 py-3 text-stone-700 ${
                    errors.nombre ? "border-terracota" : "border-mostaza"
                  }`}
                />
                {errors.nombre && (
                  <Text className="mt-1 text-xs font-medium text-rose-400">
                    {errors.nombre}
                  </Text>
                )}
              </View>

              {/* Descripción e Ingredientes */}
              <View>
                <Text className="mb-1 text-s font-bold text-vino">
                  Descripción *
                </Text>
                <TextInput
                  value={descripcion}
                  onChangeText={(v) => {
                    setDescripcion(v);
                    clearFieldError("descripcion", v);
                  }}
                  placeholder={config.placeholderDesc}
                  placeholderTextColor="#a37e1f"
                  multiline
                  numberOfLines={3}
                  style={{ textAlignVertical: "top" }}
                  className={`min-h-[75px] rounded-xl border bg-[#FFF8EA] pl-4 py-3 text-stone-700 ${
                    errors.descripcion ? "border-terracota" : "border-mostaza"
                  }`}
                />
                {errors.descripcion && (
                  <Text className="mt-1 text-xs font-medium text-rose-400">
                    {errors.descripcion}
                  </Text>
                )}
              </View>

              {/* Tiempo y Precio */}
              <View className="flex-row">
                <View className="flex-1 mr-2">
                  <Text className="mb-1 text-s font-bold text-vino">
                    Tiempo (minimo) *
                  </Text>
                  <TextInput
                    value={tiempoElaboracion}
                    onChangeText={(v) => {
                      setTiempoElaboracion(v);
                      clearFieldError("tiempoElaboracion", v);
                    }}
                    keyboardType="number-pad"
                    placeholder={config.placeholderTiempo}
                    placeholderTextColor="#a37e1f"
                    className={`rounded-xl border bg-[#FFF8EA] pl-4 py-3 text-stone-700 ${
                      errors.tiempoElaboracion
                        ? "border-terracota"
                        : "border-mostaza"
                    }`}
                  />
                  {errors.tiempoElaboracion && (
                    <Text className="mt-1 text-xs font-medium text-rose-400">
                      {errors.tiempoElaboracion}
                    </Text>
                  )}
                </View>
                <View className="flex-1 ml-2">
                  <Text className="mb-1 text-s font-bold text-vino">
                    Precio ($) *
                  </Text>
                  <TextInput
                    value={precio}
                    onChangeText={(v) => {
                      setPrecio(v);
                      clearFieldError("precio", v);
                    }}
                    keyboardType="decimal-pad"
                    placeholder={config.placeholderPrecio}
                    placeholderTextColor="#a37e1f"
                    className={`rounded-xl border bg-[#FFF8EA] pl-4 py-3 text-stone-700 ${
                      errors.precio ? "border-terracota" : "border-mostaza"
                    }`}
                  />
                  {errors.precio && (
                    <Text className="mt-1 text-xs font-medium text-rose-400">
                      {errors.precio}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Paginación + Siguiente */}
            <View className="mx-6 mt-7 items-center">
              <View className="flex-row items-center justify-center gap-2 mb-3">
                {[0, 1].map((i) => (
                  <View
                    key={i}
                    className={`h-2 w-2 rotate-45 ${currentStep === i ? "bg-vino" : "bg-mostaza/30"}`}
                  />
                ))}
              </View>
              <TouchableOpacity
                onPress={irSiguiente}
                className="w-full h-[60%] flex-column gap-2 items-center justify-center rounded-2xl border border-calabaza bg-[#FBE9DF] mt-1 py-3 active:bg-[#f5dccb]"
              >
                <Image
                  source={require("../../assets/images/camera-cal.png")}
                  className="mb-1 h-24 w-24"
                  resizeMode="contain"
                />
                <Text
                  style={{ fontFamily: "LaOriental" }}
                  className="text-2xl text-calabaza"
                >
                  Siguiente
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* SECCIÓN 2: Fotografías y registro */}
        <View style={{ width: screenWidth }} className="flex-1 px-5 pt-2">
          <ScrollView
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            <Text className="mb-2 ml-3 text-s font-bold text-vino">
                Fotografías (3 obligatorias) *
            </Text>
            <Text className="mb-3 ml-3 text-xs text-stone-500  w-[70%] ">
                Toca cada contenedor para tomar una foto con la cámara o elegir
                de la galería.
            </Text>

            {/* Fotografías */}
            <View className="mx-4 rounded-2xl border border-mostaza bg-[#FFF8EA] p-4">
              {errors.fotos && (
                <Text className="mb-2 text-xs font-medium text-rose-400">
                  {errors.fotos}
                </Text>
              )}

              <View className="w-full items-center justify-center">
                {/* Foto #1 - Principal */}
                <View className="mb-3 w-full items-center self-center">
                  <Text className="mb-1 text-[11px] font-semibold text-terracota">
                    Foto #1
                  </Text>
                  <TouchableOpacity
                    onPress={() => abrirSelectorFoto(0)}
                    className={`w-full aspect-[16/9] items-center justify-center overflow-hidden rounded-xl border ${
                      fotos[0]
                        ? "border-solid border-amber-600/50"
                        : "border-dashed border-amber-600/50"
                    }`}
                  >
                    {fotos[0] ? (
                      <Image
                        source={{ uri: fotos[0] }}
                        className="h-full w-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="items-center">
                        <Image
                          source={require("../../assets/images/camera.png")}
                          className="mb-1 h-7 w-7"
                        />
                        <Text className="text-xs font-bold text-terracota">
                          Cargar
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Fotos #2 y #3 */}
                <View className="w-full flex-row gap-3">
                  {[1, 2].map((index) => (
                    <View key={index} className="flex-1 min-w-0 items-center">
                      <Text className="text-[11px] font-semibold text-terracota">
                        Foto #{index + 1}
                      </Text>
                      <TouchableOpacity
                        onPress={() => abrirSelectorFoto(index)}
                        className={`w-full aspect-[3/2] items-center justify-center overflow-hidden rounded-xl border ${
                          fotos[index]
                            ? "border-solid border-amber-600/50"
                            : "border-dashed border-amber-600/50"
                        }`}
                      >
                        {fotos[index] ? (
                          <Image
                            source={{ uri: fotos[index] }}
                            className="h-full w-full"
                            resizeMode="cover"
                          />
                        ) : (
                          <View className="items-center">
                            <Image
                              source={require("../../assets/images/camera.png")}
                              className="mb-1 h-7 w-7"
                            />
                            <Text className="text-xs font-bold text-terracota">
                              Cargar
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            </View>
            
            <View className="mx-6 mt-4 items-center">
              <View className="flex-row items-center justify-center gap-2 py-1 mb-3">
                {[0, 1].map((i) => (
                  <View
                    key={i}
                    className={`h-2 w-2 rotate-45 ${currentStep === i ? "bg-vino" : "bg-mostaza/30"}`}
                  />
                ))}
              </View>
            </View>

            {/* Botón registrar */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isLoading}
              className="flex-row items-center justify-center rounded-2xl border border-amber-400/40 bg-vino py-3 active:bg-terracota"
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
                {config.botonTexto}
              </Text>
              <Image
                source={require("../../assets/images/sello.png")}
                className="h-7 w-7"
                resizeMode="contain"
              />
            </TouchableOpacity>

            {/* Paginación + Volver */}
            
          </ScrollView>
        </View>
      </ScrollView>

      {/* Modal origen de imagen */}
      <OptionModal
        visible={modalVisible}
        titulo={`Foto #${selectedSlot !== null ? selectedSlot + 1 : ""}`}
        opciones={[
          {
            etiqueta: "Tomar Foto",
            icono: require("../../assets/images/camera-v.png"),
            onPress: abrirCamara,
          },
          {
            etiqueta: "Elegir de la Galería",
            icono: require("../../assets/images/galery-v.png"),
            onPress: elegirGaleria,
          },
        ]}
        onCancel={() => setModalVisible(false)}
      />

      {/* MODAL: CÁMARA PARA FOTO EN VIVO */}
      <Modal visible={isCameraOpen} animationType="slide">
        <View className="flex-1 bg-stone-950">
          <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />

          <View className="absolute top-12 right-6">
            <TouchableOpacity
              onPress={() => setIsCameraOpen(false)}
              className="border border-mostaza bg-vino px-4 py-2"
            >
              <Text
                style={{ fontFamily: "LaOriental" }}
                className="text-xs text-mostaza"
              >
                Cerrar
              </Text>
            </TouchableOpacity>
          </View>

          <View className="absolute bottom-10 left-0 right-0 items-center">
            <TouchableOpacity
              onPress={tomarFoto}
              className="h-20 w-20 items-center justify-center rounded-full border-4 border-amber-300 bg-amber-500/30 active:bg-amber-500/50"
            >
              <View className="h-14 w-14 rounded-full bg-amber-400" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Feedback */}
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

      <CompanySpinner
        visible={isLoading}
        mensaje={
          esBebida
            ? "Registrando bebida en la carta..."
            : "Registrando plato en la carta..."
        }
      />
    </View>
  );
}
