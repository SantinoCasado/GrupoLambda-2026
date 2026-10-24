import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { ChineseFrame } from "../components/ChineseFrame";
import { GraficoBarras } from "../components/charts/GraficoBarras";
import { GraficoTorta } from "../components/charts/GraficoTorta";
import { GraficoLineal } from "../components/charts/GraficoLineal";
import { FeedbackModal } from "../components/FeedbackModal";
import { FaceRating } from "../components/FaceRating";
import { RatingSlider } from "../components/RatingSlider";
import {
  verificarEncuestaCompletada,
  guardarEncuestaApi,
  obtenerEstadisticasEncuestasApi,
  EncuestaData,
} from "../services/encuestasService";
import { calcularResumenEncuestas } from "../utils/encuestasStats";

interface Props {
  pedidoId: string;
  userId?: string;
  userRole?: string;
  onVolver: () => void;
}

const ESTRELLA_LLENA = require("../../assets/images/star-v.png");
const ESTRELLA_VACIA = require("../../assets/images/empty-star-v.png");

export function EncuestaScreen({ pedidoId, userId, userRole = "cliente_registrado", onVolver }: Props) {
  const [cargando, setCargando] = useState(true);
  const [yaRespondio, setYaRespondio] = useState(false);
  const [vista, setVista] = useState<"formulario" | "graficos">("formulario");

  // Formulario: Sabor de comida, Calidad de atención, Comodidad del salón
  const [ratingComida, setRatingComida] = useState(5);
  const [ratingAtencion, setRatingAtencion] = useState(5);
  const [ratingComodidad, setRatingComodidad] = useState(5);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Carrusel horizontal del formulario (0: calificaciones, 1: comentario y envío)
  const carouselRef = useRef<ScrollView>(null);
  const [paso, setPaso] = useState(0);
  // Se bloquea el deslizamiento del carrusel mientras se arrastra el slider
  // de comodidad, para que el gesto no cambie de página.
  const [carruselBloqueado, setCarruselBloqueado] = useState(false);
  const { width: screenWidth } = useWindowDimensions();

  // Estadísticas
  const [encuestas, setEncuestas] = useState<EncuestaData[]>([]);
  const [tipoGrafico, setTipoGrafico] = useState<"barras" | "torta" | "lineal">("barras");

  const [feedback, setFeedback] = useState<{
    visible: boolean;
    tipo: "exito" | "error" | "informacion";
    titulo: string;
    mensaje: string;
    onCloseCustom?: () => void;
  }>({ visible: false, tipo: "exito", titulo: "", mensaje: "" });

  const verificarEstado = useCallback(async () => {
    try {
      setCargando(true);
      const completada = await verificarEncuestaCompletada(pedidoId);
      setYaRespondio(completada);
      if (completada) {
        setVista("graficos");
      }
      const data = await obtenerEstadisticasEncuestasApi();
      setEncuestas(data);
    } catch (err: any) {
      console.warn("Error inicializando encuesta:", err.message);
    } finally {
      setCargando(false);
    }
  }, [pedidoId]);

  useEffect(() => {
    verificarEstado();
  }, [verificarEstado]);

  const enviarEncuesta = async () => {
    if (comentario.trim().length === 0) {
      setFeedback({
        visible: true,
        tipo: "error",
        titulo: "Opinión requerida",
        mensaje: "Por favor déjanos un breve comentario de tu experiencia.",
      });
      return;
    }

    try {
      setEnviando(true);
      await guardarEncuestaApi({
        order_id: pedidoId,
        user_id: userId,
        user_role: userRole,
        rating_food: ratingComida,
        rating_service: ratingAtencion,
        rating_cleanliness: ratingComodidad,
        feedback_text: comentario.trim(),
        photos: [],
      });

      const actualizadas = await obtenerEstadisticasEncuestasApi();
      setEncuestas(actualizadas);
      setYaRespondio(true);

      setFeedback({
        visible: true,
        tipo: "exito",
        titulo: "¡Muchas Gracias!",
        mensaje: "Tu encuesta fue registrada. Ya puedes ver los resultados generales.",
        onCloseCustom: () => {
          setPaso(0);
          carouselRef.current?.scrollTo({ x: 0, animated: false });
          setVista("graficos");
        },
      });
    } catch (err: any) {
      setFeedback({
        visible: true,
        tipo: "error",
        titulo: "Error al enviar",
        mensaje: err?.message || "No se pudo registrar tu opinión. Intenta de nuevo.",
      });
    } finally {
      setEnviando(false);
    }
  };

  // Cálculos estadísticos para los gráficos
  const resumen = calcularResumenEncuestas(encuestas);
  const totalRespuestas = resumen.total;

  const barrasPromedios = [
    { label: "Sabor", value: resumen.promedios.sabor, color: "#f97316" },
    { label: "Atención", value: resumen.promedios.atencion, color: "#eab308" },
    { label: "Comodidad", value: resumen.promedios.comodidad, color: "#780116" },
  ];
  const coloresTorta = ["#ef4444", "#f97316", "#eab308", "#10b981", "#780116"];

  // Los gráficos ocupan todo el ancho posible del card (mínimo por padding y borde)
  const anchoGrafico = Math.min(300, screenWidth - 80);
  const tamanoTorta = Math.min(210, anchoGrafico);

  const renderSelectorEstrellas = (valor: number, setValor: (v: number) => void) => (
    <View className="flex-row items-center justify-center gap-x-2 my-1">
      {[1, 2, 3, 4, 5].map((estrella) => (
        <TouchableOpacity
          key={estrella}
          onPress={() => setValor(estrella)}
          activeOpacity={0.7}
          className="p-1"
        >
          <Image
            source={estrella <= valor ? ESTRELLA_LLENA : ESTRELLA_VACIA}
            className="h-8 w-8"
            resizeMode="contain"
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderPaginacion = () => (
    <View className="flex-row items-center justify-center gap-2 py-1 my-2">
      {[0, 1].map((i) => (
        <View key={i} className={`h-2 w-2 rotate-45 ${paso === i ? "bg-vino" : "bg-mostaza/30"}`} />
      ))}
    </View>
  );

  if (cargando) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#800020" />
        <Text className="mt-3 text-xs font-bold text-vino">Cargando encuesta...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">

      
      {/* Header */}
      <View className="px-5 pt-4">
        <View className="absolute left-5 z-10"
            style={{ top: 30 }}>
            <TouchableOpacity
              onPress={onVolver}
              accessibilityRole="button"
              accessibilityLabel="Volver"
              className="items-center justify-center rounded-xl border-2 border-mostaza bg-vino px-2 py-1 active:bg-terracota/70"
            >
              <Image
                source={require("../../assets/images/left-arrow-y.png")}
                className="h-6 w-6 mr-1 my-1"
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
            <Image
              source={require("../../assets/images/logo-name.png")}
              className="h-20 w-auto self-center"
              resizeMode="contain"
            />
            <Image
              source={require("../../assets/images/separator.png")}
              className="my-2 h-8 w-full"
              resizeMode="contain"
            />
            <ChineseFrame className="mt-2 bg-vino">
              <View className="items-center rounded-xl bg-mostaza/15 px-4 py-3">
                <Text style={{ fontFamily: "LaOriental" }} className="text-xl text-mostaza uppercase text-center">
                  Encuesta
                </Text>
                <Text style={{ fontFamily: "LaOriental" }} className="text-xl text-mostaza uppercase text-center">
                  de Satisfacción
                </Text>
                <Text className="text-[11px] font-semibold text-amber-100">
                  {vista === "formulario" ? "Tus comentarios nos ayudan a mejorar" : "Reseñas de clientes anteriores"}
                </Text>
              </View>
            </ChineseFrame>
      </View>

      {/* Selector de Solapa si ya respondió */}
      

      {/* CONTENIDO 1: FORMULARIO EN DOS PÁGINAS (CARRUSEL) */}
      {!yaRespondio && vista === "formulario" && (
        <ScrollView
          ref={carouselRef}
          horizontal
          pagingEnabled
          scrollEnabled={!carruselBloqueado}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          onMomentumScrollEnd={(e) => {
            const step = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
            setPaso(step === 1 ? 1 : 0);
          }}
        >
          {/* PÁGINA 1/2: Calificaciones */}
          <View style={{ width: screenWidth }} className="flex-1 px-5 pt-3">
            <ScrollView
              className="flex-1"
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 12 }}
            >
              <View className="rounded-2xl border border-mostaza bg-white p-4">
                {/* 1. Sabor de la comida */}
                <Text style={{ fontFamily: "LaOriental" }} className="text-xl uppercase text-vino mb-1 text-center">
                  Sabor de la Comida
                </Text>
                <Text className="text-sm text-stone-500 text-center mb-1">
                  ¿Qué te pareció el sabor y elaboración de los platos?
                </Text>
                {renderSelectorEstrellas(ratingComida, setRatingComida)}

                <View className="my-2 border-t border-stone-200" />

                {/* 2. Calidad de la atención */}
                <Text style={{ fontFamily: "LaOriental" }} className="text-xl uppercase text-vino mb-1 text-center">
                  Calidad de la Atención
                </Text>
                <Text className="text-sm text-stone-500 text-center mb-1">
                  ¿Cómo fue el trato y predisposición del personal?
                </Text>
                <FaceRating value={ratingAtencion} onChange={setRatingAtencion} />

                <View className="my-2 border-t border-stone-200" />

                {/* 3. Comodidad del salón */}
                <Text style={{ fontFamily: "LaOriental" }} className="text-xl uppercase text-vino mb-1 text-center">
                  Comodidad del Salón
                </Text>
                <Text className="text-sm text-stone-500 text-center mb-1">
                  ¿Cómo calificarías el ambiente, la mesa y la comodidad?
                </Text>
                <RatingSlider
                  value={ratingComodidad}
                  onChange={setRatingComodidad}
                  onSlidingStart={() => setCarruselBloqueado(true)}
                  onSlidingEnd={() => setCarruselBloqueado(false)}
                />
              </View>
            </ScrollView>

            {/* Paginación + Siguiente */}
            <View className="pb-4">
              {renderPaginacion()}
              <TouchableOpacity
                onPress={() => carouselRef.current?.scrollTo({ x: screenWidth, animated: true })}
                className="w-full flex-row items-center justify-center rounded-2xl border border-calabaza bg-[#FBE9DF] py-3 active:bg-[#f5dccb]"
              >
                <Text style={{ fontFamily: "LaOriental" }} className="text-s text-calabaza">
                  Siguiente
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* PÁGINA 2/2: Comentario y envío */}
          <View style={{ width: screenWidth }} className="flex-1 px-5 pt-3">
            <ScrollView
              className="flex-1"
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets
              contentContainerStyle={{ paddingBottom: 12, flexGrow: 1 }}
            >
              {/* Comentario */}
              <View className="rounded-2xl border border-mostaza bg-white p-4" style={{ flexGrow: 1 }}>
                <Text style={{ fontFamily: "LaOriental" }} className="text-xl uppercase text-vino mb-2">
                  Déjanos tu comentario
                </Text>
                <TextInput
                  multiline
                  value={comentario}
                  onChangeText={setComentario}
                  placeholder="Contanos qué platos te gustaron más, sugerinos mejoras o felicitá al equipo..."
                  placeholderTextColor="#9ca3af"
                  textAlignVertical="top"
                  className="w-full rounded-xl border border-stone-300 p-3 text-sm text-stone-800 bg-amber-50/40"
                  style={{ flexGrow: 1, minHeight: 80 }}
                />
              </View>
            </ScrollView>

            {/* Paginación + Botón de Enviar */}
            <View className="pb-4">
              
              <TouchableOpacity
                onPress={enviarEncuesta}
                disabled={enviando}
                className={`flex-row items-center justify-center w-full rounded-2xl bg-vino py-3.5 active:bg-vino-700 ${
                  enviando ? "opacity-50" : ""
                }`}
              >
                <Image
                  source={require("../../assets/images/sello.png")}
                  className="h-7 w-7"
                  resizeMode="contain"
                />
                  <Text
                    style={{ fontFamily: "LaOriental" }}
                    className="text-center mt-1 mx-5 text-xl uppercase tracking-wider text-mostaza"
                  >
                    Enviar Encuesta
                  </Text>
               
                <Image
                  source={require("../../assets/images/sello.png")}
                  className="h-7 w-7"
                  resizeMode="contain"
                />
              </TouchableOpacity>
                {renderPaginacion()}
              <View className="pb-4">
                <TouchableOpacity
                  onPress={() => carouselRef.current?.scrollTo({ x: 0, animated: true })}
                  className="w-full flex-row items-center justify-center rounded-2xl border border-calabaza bg-[#FBE9DF] py-3 active:bg-[#f5dccb]"
                >
                  <Text style={{ fontFamily: "LaOriental" }} className="text-s text-calabaza">
                    Volver
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      {/* CONTENIDO 2: RESULTADOS Y GRÁFICOS */}
      {vista === "graficos" && (
        <ScrollView
          className="flex-1 px-5 pt-3"
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Selector de Tipo de Gráfico */}
          <ChineseFrame color="#8f0018" className="mb-3 bg-mostaza px-2">
            <View className="flex-row px-2 py-1.5 rounded-2xl m-2 gap-2">
              {([
                { tipo: "barras", label: "Individual" },
                { tipo: "torta", label: "General" },
                { tipo: "lineal", label: "Reciente" },
              ] as const).map(({ tipo, label }, index) => (
                <React.Fragment key={tipo}>
                  {index > 0 && (
                    <View style={{ width: 2 }} className="self-stretch my-1 bg-vino rounded-full" />
                  )}
                  <TouchableOpacity
                    onPress={() => setTipoGrafico(tipo)}
                    className={`flex-1 py-2.5 items-center border ${
                      tipoGrafico === tipo
                        ? "bg-vino rounded-xl border-mostaza"
                        : "bg-mostaza border-transparent"
                    }`}
                  >
                    <Text
                      className={`text-xs uppercase font-black ${
                        tipoGrafico === tipo ? "text-mostaza" : "text-vino"
                      }`}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                </React.Fragment>
              ))}
            </View>
          </ChineseFrame>

          {/* Tarjeta del Gráfico Activo */}
          <View className="flex-1 rounded-2xl border-2 border-mostaza/40 bg-white p-4 items-center mb-3 justify-center">
            {totalRespuestas === 0 ? (
              <View className="py-12 items-center">
                <Text className="text-3xl mb-2">📊</Text>
                <Text style={{ fontFamily: "LaOriental" }} className="text-sm uppercase text-vino text-center">
                  Aún no hay encuestas registradas
                </Text>
              </View>
            ) : tipoGrafico === "barras" ? (
              /* GRÁFICO 1: BARRAS - Sabor, Atención, Comodidad */
              <View className="w-full items-center">
                <Text style={{ fontFamily: "LaOriental" }} className="text-2xl uppercase text-vino mb-1">
                  Promedio individual
                </Text>
                <Text className="text-base text-stone-500 mb-4">Total de encuestas: {totalRespuestas}</Text>

                <GraficoBarras data={barrasPromedios} width={anchoGrafico} />
              </View>
            ) : tipoGrafico === "torta" ? (
              /* GRÁFICO 2: TORTA */
              <View className="w-full items-center">
                <Text style={{ fontFamily: "LaOriental" }} className="text-2xl uppercase text-vino mb-1 text-center">
                  Distribución de Satisfacción
                </Text>
                <Text className="text-base text-stone-500">Promedio general de valoracion</Text>

                <GraficoTorta
                  valores={resumen.distribucionSatisfaccion}
                  colores={coloresTorta}
                  size={tamanoTorta}
                />
              </View>
            ) : (
              /* GRÁFICO 3: LINEAL */
              <View className="w-full items-center">
                <Text style={{ fontFamily: "LaOriental" }} className="text-2xl uppercase text-vino mb-1">
                  Evolución Reciente
                </Text>
                <Text className="text-base text-stone-500 mb-12">
                  Promedio diario (1 a 5) · un punto por día
                </Text>

                <GraficoLineal puntos={resumen.dias} width={anchoGrafico} />
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* Modal Feedback */}
      <FeedbackModal
        visible={feedback.visible}
        tipo={feedback.tipo}
        titulo={feedback.titulo}
        mensaje={feedback.mensaje}
        onClose={() => {
          setFeedback((prev) => ({ ...prev, visible: false }));
          feedback.onCloseCustom?.();
        }}
      />
    </View>
  );
}