import React, { useState, useEffect, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChineseFrame } from "../components/ChineseFrame";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Dimensions,
  Modal,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { CameraView, useCameraPermissions } from "expo-camera";
import { OptionModal } from "../components/OptionModal";
import { ConfirmModal } from "../components/ConfirmModal";
import { FeedbackModal } from "../components/FeedbackModal";
import { CompanySpinner } from "../components/CompanySpinner";
import QRCode from "react-native-qrcode-svg";
import {
  TipoMesa,
  EstadoMesa,
  Mesa,
  validateMesaForm,
  validateMesaPaso1,
  registrarMesa,
  obtenerMesas,
  actualizarDisponibilidadMesa,
  MesaFormErrors,
} from "../services/mesasService";

export default function AltaMesaScreen() {
  const [tab, setTab] = useState<"alta" | "listado">("alta");
  const [numero, setNumero] = useState("");
  const [comensales, setComensales] = useState("");
  const [tipo, setTipo] = useState<TipoMesa>("estandar");
  const [foto, setFoto] = useState<string | null>(null);

  const [errors, setErrors] = useState<MesaFormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [confirmarMesaVisible, setConfirmarMesaVisible] = useState(false);
  const [modalFoto, setModalFoto] = useState(false);
  const [mesaQr, setMesaQr] = useState<Mesa | null>(null);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [mesaActualizando, setMesaActualizando] = useState<number | null>(null);
  const insets = useSafeAreaInsets();

  // Cámara en vivo (misma estrategia que Alta Empleados, evita reinicios de la app)
  const [permission, requestPermission] = useCameraPermissions();
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);

  // Carrusel de secciones
  const scrollRef = useRef<ScrollView>(null);
  const paso1Validado = useRef(false);
  const [currentStep, setCurrentStep] = useState(0);
  const screenWidth = Dimensions.get("window").width;

  // Carrusel del listado de mesas (2 por página)
  const listaScrollRef = useRef<ScrollView>(null);
  const [listaPage, setListaPage] = useState(0);
  const MESAS_POR_PAGINA = 2;
  const agrupadas: Mesa[][] = [];
  for (let i = 0; i < mesas.length; i += MESAS_POR_PAGINA) {
    agrupadas.push(mesas.slice(i, i + MESAS_POR_PAGINA));
  }

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
    onAceptar?: () => void
  ) => {
    if (tipo === "error") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    else if (tipo === "exito") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    setModalFeedback({
      visible: true,
      tipo,
      titulo,
      mensaje,
      onAceptar,
    });
  };

  // Limpieza de error de campo cuando el valor se corrige
  const clearFieldError = (field: keyof MesaFormErrors, value: string) => {
    if (!errors[field]) return;

    let valid = false;
    switch (field) {
      case "numero": {
        const num = Number(value);
        valid = value.trim() !== "" && Number.isInteger(num) && num > 0;
        break;
      }
      case "comensales": {
        const com = Number(value);
        valid = value.trim() !== "" && Number.isInteger(com) && com > 0 && com <= 8;
        break;
      }
    }

    if (valid) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  useEffect(() => {
    cargarMesas();
  }, [tab]);

  const cargarMesas = async () => {
    const listado = await obtenerMesas();
    setMesas([...listado]);
  };

  const abrirCamara = async () => {
    setModalFoto(false);
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        mostrarMensaje("error", "Permiso Requerido", "Se requiere permiso para usar la cámara.");
        return;
      }
    }
    setIsCameraOpen(true);
  };

  const tomarFoto = async () => {
    if (cameraRef.current) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
        if (photo?.uri) {
          setFoto(photo.uri);
          setErrors((prev) => ({ ...prev, foto: undefined }));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setIsCameraOpen(false);
        }
      } catch {
        mostrarMensaje("error", "Error de Captura", "No se pudo tomar la fotografía. Inténtelo nuevamente.");
      }
    }
  };

  const elegirGaleria = async () => {
    setModalFoto(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      mostrarMensaje("error", "Permiso Requerido", "Se requiere permiso para acceder a la galería.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!res.canceled) {
      setFoto(res.assets[0].uri);
      setErrors((prev) => ({ ...prev, foto: undefined }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  // Avance al paso 2 con validación
  const irSiguiente = () => {
    if (isLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const paso1Errors = validateMesaPaso1({ numero, comensales });

    setErrors((prev) => {
      const cleaned = { ...prev };
      delete cleaned.foto;
      return { ...cleaned, ...paso1Errors };
    });

    if (Object.keys(paso1Errors).length > 0) {
      mostrarMensaje(
        "error",
        "Datos Incompletos",
        "Por favor, complete correctamente los campos marcados antes de continuar."
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

  const irSiguienteLista = () => {
    if (isLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = listaPage + 1;
    if (next < agrupadas.length) {
      setListaPage(next);
      listaScrollRef.current?.scrollTo({ x: next * screenWidth, animated: true });
    }
  };

  const irVolverLista = () => {
    if (isLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const prev = listaPage - 1;
    if (prev >= 0) {
      setListaPage(prev);
      listaScrollRef.current?.scrollTo({ x: prev * screenWidth, animated: true });
    }
  };

  const handleCrearMesa = () => {
    const errs = validateMesaForm({ numero, comensales, tipo, foto });
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      mostrarMensaje(
        "error",
        "Formulario Incompleto",
        "Por favor revise los campos marcados en rojo."
      );
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setConfirmarMesaVisible(true);
  };

  const ejecutarCrearMesa = async () => {
    setConfirmarMesaVisible(false);
    setErrors({});
    setIsLoading(true);

    try {
      await registrarMesa({
        numero: Number(numero),
        comensales: Number(comensales),
        tipo,
        foto: foto!,
      });

      mostrarMensaje(
        "exito",
        "¡Éxito!",
        `La Mesa #${numero} fue dada de alta con su código QR.`,
        () => {
          setNumero("");
          setComensales("");
          setTipo("estandar");
          setFoto(null);
          setErrors({});
          paso1Validado.current = false;
          setCurrentStep(0);
          scrollRef.current?.scrollTo({ x: 0, animated: false });
          setTab("listado");
        }
      );
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      mostrarMensaje("error", "Error", error.message || "No se pudo crear la mesa.");
    } finally {
      setIsLoading(false);
    }
  };

  const cambiarEstado = async (mesa: Mesa, estadoActual: EstadoMesa) => {
    if (mesaActualizando !== null) return;
    const nuevoEstado: EstadoMesa =
      estadoActual === "vacia" ? "ocupada" : "vacia";

    try {
      setMesaActualizando(mesa.numero);
      await actualizarDisponibilidadMesa(mesa, nuevoEstado);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      cargarMesas();
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      mostrarMensaje("error", "Error", error.message || "No se pudo cambiar el estado de la mesa.");
    } finally {
      setMesaActualizando(null);
    }
  };

  return (
    <>
      <SafeAreaView className="flex-1">
        <StatusBar style="light" />

        {/* Nombres del equipo */}
        <View className="absolute right-4 z-10 items-end" style={{ top: insets.top + 16 }}>
          <Text className="text-[10px] text-vino/70">Rocío Sanchez</Text>
          <Text className="text-[10px] text-vino/70">Santino Casado</Text>
          <Text className="text-[10px] text-vino/70">Sebastián Andreozzi</Text>
          <Text className="text-[10px] text-vino/70">Valentín Brazanovich</Text>
        </View>

        {/* Cabecera idéntica a Alta Empleados */}
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
                <Text style={{ fontFamily: "LaOriental" }} className="text-xl text-mostaza uppercase">
                  Gestión de Mesas y QR
                </Text>
                <Text className="mt-1 text-xs font-semibold text-amber-100">
                  Puede dar de alta nuevas mesas o gestionar las existentes.
                </Text>
              </View>
            </ChineseFrame>
          </View>
        </View>

        {/* Selector de Solapas: Alta vs Listado */}
        <ChineseFrame color="#8f0018" className="mx-9 mb-3 bg-mostaza">
          <View className="flex-row px-4 py-1.5 rounded-2xl m-2 gap-4">
            <TouchableOpacity
              className={`flex-1 py-2.5 rounded-xl items-center border ${
                tab === "alta" ? "bg-vino border-mostaza" : "bg-mostaza border-transparent"
              }`}
              onPress={() => setTab("alta")}
            >
              <View className="flex-row items-center">
                <Image
                  source={tab === "alta" ? require("../../assets/images/plus-y.png") : require("../../assets/images/plus-v.png")}
                  className="mr-2 h-3.5 w-3.5"
                  resizeMode="contain"
                />
                <Text
                  className={`text-xs uppercase ${tab === "alta" ? "text-mostaza font-black" : "text-vino font-black"}`}
                >
                  Nueva Mesa
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 py-2.5 rounded-xl items-center border ${
                tab === "listado" ? "bg-vino border-mostaza" : "bg-mostaza border-transparent"
              }`}
              onPress={() => setTab("listado")}
            >
              <View className="flex-row items-center">
                <Image
                  source={tab === "listado" ? require("../../assets/images/audit-y.png") : require("../../assets/images/audit-v.png")}
                  className="mr-2 h-3.5 w-3.5"
                  resizeMode="contain"
                />
                <Text
                  className={`text-xs uppercase ${tab === "listado" ? "text-mostaza font-black" : "text-vino font-black"}`}
                >
                  Ver Mesas
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </ChineseFrame>

        {/* Contenido según solapa */}
        {tab === "alta" ? (
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
            {/* SECCIÓN 0: Datos de la mesa */}
            <View style={{ width: screenWidth }} className="flex-1 px-5 pt-2">
              <ScrollView
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
                contentContainerStyle={{ paddingBottom: 40 }}
              >
                <View className="mx-6 gap-y-4">
                  {/* Número de mesa */}
                  <View>
                    <Text className="mb-1 text-s font-bold text-vino">Número de Mesa *</Text>
                    <TextInput
                      value={numero}
                      onChangeText={(v) => { setNumero(v); clearFieldError("numero", v); }}
                      keyboardType="number-pad"
                      placeholder="Ej: 5"
                      placeholderTextColor="#a37e1f"
                      className={`rounded-xl border px-4 py-3 text-stone-700 ${
                        errors.numero ? "border-terracota" : "border-mostaza"
                      }`}
                    />
                    {errors.numero && (
                      <Text className="mt-1 text-xs font-medium text-rose-400">{errors.numero}</Text>
                    )}
                  </View>

                  {/* Comensales */}
                  <View>
                    <Text className="mb-1 text-s font-bold text-vino">Cantidad de Comensales (Máx. 8) *</Text>
                    <TextInput
                      value={comensales}
                      onChangeText={(v) => { setComensales(v); clearFieldError("comensales", v); }}
                      keyboardType="number-pad"
                      placeholder="Ej: 4"
                      placeholderTextColor="#a37e1f"
                      className={`rounded-xl border px-4 py-3 text-stone-700 ${
                        errors.comensales ? "border-terracota" : "border-mostaza"
                      }`}
                    />
                    {errors.comensales && (
                      <Text className="mt-1 text-xs font-medium text-rose-400">{errors.comensales}</Text>
                    )}
                  </View>

                  {/* Tipo de Mesa */}
                  <View>
                    <Text className="mb-1 text-s font-bold text-vino">Tipo de Mesa *</Text>
                    <View className="flex-row gap-2">
                      {(
                        [
                          {
                            key: "estandar",
                            label: "Estándar",
                            icono: require("../../assets/images/table-car.png"),
                            iconoActivo: require("../../assets/images/table-v.png"),
                          },
                          {
                            key: "vip",
                            label: "VIP",
                            icono: require("../../assets/images/vip-car.png"),
                            iconoActivo: require("../../assets/images/vip-v.png"),
                          },
                          {
                            key: "movilidad_reducida",
                            label: "Mov. Reducida",
                            icono: require("../../assets/images/wheel-chair-car.png"),
                            iconoActivo: require("../../assets/images/wheel-chair-v.png"),
                          },
                        ] as const
                      ).map((item) => (
                        <TouchableOpacity
                          key={item.key}
                          onPress={() => setTipo(item.key)}
                          className={`flex-1 items-center rounded-xl border px-2 py-3 ${
                            tipo === item.key ? "border-vino bg-mostaza" : "border-transparent bg-caramelo/10"
                          }`}
                        >
                          <Image
                            source={tipo === item.key ? item.iconoActivo : item.icono}
                            className="h-8 w-8"
                            resizeMode="contain"
                          />
                          <Text
                            className={`mt-1 text-sm font-bold ${
                              tipo === item.key ? "text-vino" : "text-caramelo"
                            }`}
                          >
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                {/* Paginación + Siguiente */}
                <View className="mx-6 mt-4 items-center">
                  <View className="flex-row items-center justify-center gap-2 py-1 mb-3">
                    {[0, 1].map((i) => (
                      <View
                        key={i}
                        className={`h-2 w-2 rotate-45 ${currentStep === i ? "bg-vino" : "bg-mostaza/30"}`}
                      />
                    ))}
                  </View>
                  <TouchableOpacity
                    onPress={irSiguiente}
                    className="w-full flex-row items-center justify-center rounded-2xl border border-calabaza bg-[#FBE9DF] py-3 active:bg-[#f5dccb]"
                  >
                    <Text style={{ fontFamily: "LaOriental" }} className="text-s text-calabaza">Siguiente</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>

            {/* SECCIÓN 1: Foto de la mesa y registro */}
            <View style={{ width: screenWidth }} className="flex-1 px-5 pt-2">
              <ScrollView
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
                contentContainerStyle={{ paddingBottom: 40 }}
              >
                <View className="rounded-2xl border border-mostaza p-4">
                  <Text className="mb-2 text-s font-bold text-vino">Foto de la Mesa *</Text>
                  {errors.foto && (
                    <Text className="mb-2 text-xs font-medium text-rose-400">{errors.foto}</Text>
                  )}

                  {foto ? (
                    <View className="items-center">
                      <Image source={{ uri: foto }} className="h-44 w-44 rounded-2xl border border-calabaza" />
                      <TouchableOpacity
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setModalFoto(true); }}
                        className="mt-3 rounded-xl border border-calabaza bg-[#FBE9DF] px-5 py-2.5 active:bg-[#f5dccb]"
                      >
                        <Text className="text-xs font-bold text-calabaza">Cambiar fotografía</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setModalFoto(true); }}
                      className="h-36 items-center justify-center rounded-xl border border-dashed border-amber-600/50"
                    >
                      <Image source={require("../../assets/images/camera.png")} className="mb-1 h-9 w-9" />
                      <Text className="text-xs font-bold text-terracota">Cargar Foto de la Mesa</Text>
                      <Text className="text-[10px] text-stone-400">Cámara o galería</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  onPress={handleCrearMesa}
                  disabled={isLoading}
                  className="mt-6 flex-row items-center justify-center rounded-2xl border border-amber-400/40 bg-vino py-3 active:bg-terracota"
                >
                  <Image
                    source={require("../../assets/images/sello.png")}
                    className="h-7 w-7"
                    resizeMode="contain"
                  />
                  <Text style={{ fontFamily: "LaOriental" }} className="mx-4 text-center text-l uppercase tracking-wider text-mostaza">
                    {isLoading ? "Guardando..." : "Guardar Mesa y Generar QR"}
                  </Text>
                  <Image
                    source={require("../../assets/images/sello.png")}
                    className="h-7 w-7"
                    resizeMode="contain"
                  />
                </TouchableOpacity>

                {/* Paginación + Volver */}
                <View className="mx-6 mt-4 items-center">
                  <View className="flex-row items-center justify-center gap-2 py-1 mb-3">
                    {[0, 1].map((i) => (
                      <View
                        key={i}
                        className={`h-2 w-2 rotate-45 ${currentStep === i ? "bg-vino" : "bg-mostaza/30"}`}
                      />
                    ))}
                  </View>
                  <TouchableOpacity
                    onPress={irVolver}
                    className="w-full flex-row items-center justify-center rounded-2xl border border-mostaza/40 bg-[#FBE9DF] py-3 active:bg-[#f5dccb]"
                  >
                    <Text style={{ fontFamily: "LaOriental" }} className="text-s text-calabaza">Volver</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </ScrollView>
        ) : (
          /* Solapa de Gestión y Listado */
          <View className="flex-1">
            {agrupadas.length === 0 ? (
              <View className="flex-1 items-center pt-10">
                <Text className="text-xs font-bold text-calabaza">No hay mesas disponibles aún.</Text>
              </View>
            ) : (
              <>
                <View className="mx-5 mt-1 mb-2 items-center">
                  <Text className="text-xs font-bold text-vino">Toca el estado de una mesa para alternarlo.</Text>
                  <Text className="text-xs font-bold text-vino">(Vacía ➔ Ocupada)</Text>
                </View>

                <ScrollView
                  ref={listaScrollRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(e) => {
                    setListaPage(Math.round(e.nativeEvent.contentOffset.x / screenWidth));
                  }}
                  style={{ flexGrow: 0, flexShrink: 0 }}
                >
                  {agrupadas.map((grupo, index) => (
                    <View key={index} style={{ width: screenWidth }} className="px-5 pt-2">
                      <View className="gap-y-4">
                        {grupo.map((m) => (
                            <View key={m.numero} style={[styles.cardMesa, m.disponibilidad === "vacia" ? styles.cardBordeVacia : styles.cardBordeOcupada, m.disponibilidad === "vacia" ? styles.cardFondoVacia : styles.cardFondoOcupada]}>
                              <View style={styles.cardMesaInfo}>
                                <Text style={styles.cardMesaTitle}>Mesa #{m.numero}</Text>
                                <Text style={[styles.cardMesaSub, { marginBottom: 0 }]}>– Capacidad: {m.comensales} comensales</Text>
                                <Text style={[styles.cardMesaSub, { marginTop: 0 }]}>– Tipo: {m.tipo === "movilidad_reducida" ? "MOV. REDUCIDA" : m.tipo.toUpperCase()}</Text>

                                <TouchableOpacity
                                  style={[
                                    styles.badgeEstado,
                                    mesaActualizando === m.numero
                                      ? styles.badgeCargando
                                      : m.disponibilidad === "vacia"
                                      ? styles.badgeVacia
                                      : styles.badgeOcupada,
                                  ]}
                                  onPress={() => cambiarEstado(m, m.disponibilidad)}
                                  disabled={mesaActualizando !== null}
                                >
                                  {mesaActualizando === m.numero ? (
                                    <ActivityIndicator size="small" color="#d8572a" />
                                  ) : (
                                    <Text style={styles.badgeEstadoText}>
                                      ESTADO: {m.disponibilidad.toUpperCase()}
                                    </Text>
                                  )}
                                </TouchableOpacity>
                              </View>

                              {/* QR Accesible desde botón (modal) */}
                              <View className="items-center gap-2">
                                {m.foto ? (
                                  <Image
                                    source={{ uri: m.foto }}
                                    style={[styles.cardMesaFoto, m.disponibilidad === "vacia" ? styles.cardBordeVacia : styles.cardBordeOcupada]}
                                    resizeMode="cover"
                                  />
                                ) : null}
                                <TouchableOpacity
                                  onPress={() => setMesaQr(m)}
                                  className="mt-1 items-center rounded-lg border border-vino bg-[#FBE9DF] px-4 py-1.5 active:bg-[#f5dccb]"
                                  activeOpacity={0.7}
                                  accessible
                                  accessibilityLabel={`Ver código QR de la mesa ${m.numero}`}
                                >
                                  <Text className="text-xs font-bold text-vino">QR</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          ))}
                      </View>
                    </View>
                  ))}
                </ScrollView>

                {agrupadas.length > 1 && (
                  <View className="flex-row items-center justify-center gap-2 py-2">
                    {agrupadas.map((_, i) => (
                      <View
                        key={i}
                        className={`h-2 w-2 rotate-45 ${listaPage === i ? "bg-vino" : "bg-mostaza/30"}`}
                      />
                    ))}
                  </View>
                )}

                {listaPage < agrupadas.length - 1 && (
                  <TouchableOpacity
                    onPress={irSiguienteLista}
                    className="mx-5 my-1 flex-row items-center justify-center rounded-2xl border border-calabaza bg-[#FBE9DF] py-3 active:bg-[#f5dccb]"
                  >
                    <Text style={{ fontFamily: "LaOriental" }} className="text-s text-calabaza">Siguiente</Text>
                  </TouchableOpacity>
                )}

                {listaPage > 0 && (
                  <TouchableOpacity
                    onPress={irVolverLista}
                    className="mx-5 mt-1 flex-row items-center justify-center rounded-2xl border border-calabaza bg-[#FBE9DF] py-3 active:bg-[#f5dccb]"
                  >
                    <Text style={{ fontFamily: "LaOriental" }} className="text-s text-calabaza">Volver</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}

        {/* Modal Cámara / Galería */}
        <OptionModal
          visible={modalFoto}
          titulo="Seleccionar Foto de la Mesa"
          opciones={[
            { etiqueta: "Tomar Foto", icono: require("../../assets/images/camera-v.png"), onPress: abrirCamara },
            { etiqueta: "Elegir de la Galería", icono: require("../../assets/images/galery-v.png"), onPress: elegirGaleria },
          ]}
          onCancel={() => setModalFoto(false)}
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
                <Text style={{ fontFamily: "LaOriental" }} className="text-xs text-mostaza">Cerrar</Text>
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

        {/* MODAL: QR DE LA MESA */}
        <Modal
          visible={mesaQr !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setMesaQr(null)}
        >
          <View className="flex-1 items-center justify-center bg-black/60 px-8">
            <ChineseFrame className="w-full max-w-sm bg-vino shadow-2xl p-3">
              <View style={styles.qrModalBox}>
                <Text style={styles.qrModalTitle}>Mesa #{mesaQr?.numero}</Text>
                <View style={styles.cardMesaQr}>
                  <QRCode
                    value={mesaQr?.qrCode || `mesa_${mesaQr?.numero}`}
                    size={200}
                    backgroundColor="#111827"
                    color="#FFF"
                  />
                </View>
                <TouchableOpacity
                  onPress={() => setMesaQr(null)}
                  className="mt-5 rounded-2xl bg-mostaza px-8 py-2.5 active:bg-calabaza/60"
                  activeOpacity={0.7}
                >
                  <Text
                    style={{ fontFamily: "LaOriental" }}
                    className="text-center uppercase tracking-wider text-vino"
                  >
                    Cerrar
                  </Text>
                </TouchableOpacity>
              </View>
            </ChineseFrame>
          </View>
        </Modal>

        {/* Modal de Confirmación de Alta */}
        <ConfirmModal
          visible={confirmarMesaVisible}
          titulo="Confirmar Mesa"
          mensaje={`¿Está seguro de que desea dar de alta la Mesa #${numero} con ${comensales} comensales y generar su código QR?`}
          textoConfirmar="Confirmar"
          textoCancelar="Cancelar"
          cargando={isLoading}
          onConfirm={ejecutarCrearMesa}
          onCancel={() => setConfirmarMesaVisible(false)}
        />

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

        <CompanySpinner visible={isLoading} />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  cardMesa: { backgroundColor: "transparent", borderRadius: 10, padding: 14, marginBottom: 3, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 2, borderColor: "#f7b538" },
  cardBordeVacia: { borderColor: "#10b981" },
  cardBordeOcupada: { borderColor: "#c32f27" },
  cardFondoVacia: { backgroundColor: "rgba(16, 185, 129, 0.1)" },
  cardFondoOcupada: { backgroundColor: "rgba(195, 47, 39, 0.1)" },
  cardMesaInfo: { flex: 1, marginRight: 10 },
  cardMesaTitle: { color: "#8f0018", fontSize: 16, fontWeight: "bold" },
  cardMesaSub: { color: "#8f0018", fontSize: 12, marginVertical: 4 },
  badgeEstado: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, alignSelf: "flex-start", marginTop: 4 },
  badgeVacia: { backgroundColor: "#10b981" },
  badgeOcupada: { backgroundColor: "#c32f27" },
  badgeCargando: { backgroundColor: "#FBE9DF" },
  badgeEstadoText: { color: "#FFF", fontSize: 10, fontWeight: "bold" },
  cardMesaQr: { backgroundColor: "transparent", padding: 6, borderRadius: 8 },
  cardMesaFoto: { width: 48, height: 48, borderRadius: 8, borderWidth: 1, borderColor: "#8f0018" },
  qrModalBox: { alignItems: "center", backgroundColor: "#8f0018", borderRadius: 16, padding: 24, borderWidth: 1, borderColor: "transparent" },
  qrModalTitle: { color: "#f7b538", fontSize: 18, marginBottom: 14, fontFamily: "LaOriental" },
});