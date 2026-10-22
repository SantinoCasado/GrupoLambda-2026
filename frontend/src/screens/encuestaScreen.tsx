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
import Svg, { Rect, Text as SvgText, Path, G, Line, Circle } from "react-native-svg";
import { ChineseFrame } from "../components/ChineseFrame";
import { FeedbackModal } from "../components/FeedbackModal";
import { FaceRating } from "../components/FaceRating";
import { RatingSlider } from "../components/RatingSlider";
import {
  verificarEncuestaCompletada,
  guardarEncuestaApi,
  obtenerEstadisticasEncuestasApi,
  EncuestaData,
} from "../services/encuestasService";

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
  const totalRespuestas = encuestas.length;
  const promComida =
    totalRespuestas > 0
      ? (encuestas.reduce((acc, e) => acc + (e.rating_food || 0), 0) / totalRespuestas).toFixed(1)
      : "0";
  const promAtencion =
    totalRespuestas > 0
      ? (encuestas.reduce((acc, e) => acc + (e.rating_service || 0), 0) / totalRespuestas).toFixed(1)
      : "0";
  const promComodidad =
    totalRespuestas > 0
      ? (encuestas.reduce((acc, e) => acc + (e.rating_cleanliness || 0), 0) / totalRespuestas).toFixed(1)
      : "0";

  // Distribución global de satisfacción
  const distribucionGlobal = [0, 0, 0, 0, 0];
  encuestas.forEach((e) => {
    const prom = Math.round(((e.rating_cleanliness || 0) + (e.rating_food || 0) + (e.rating_service || 0)) / 3);
    const starIdx = Math.max(1, Math.min(5, prom)) - 1;
    distribucionGlobal[starIdx]++;
  });

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
          contentContainerStyle={{ paddingBottom: 30 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Selector de Tipo de Gráfico */}
          <View className="flex-row gap-1.5 mb-4">
            <TouchableOpacity
              onPress={() => setTipoGrafico("barras")}
              className={`flex-1 py-2 rounded-xl items-center border ${
                tipoGrafico === "barras" ? "bg-calabaza border-calabaza" : "bg-white border-stone-300"
              }`}
            >
              <Text
                style={{ fontFamily: "LaOriental" }}
                className={`text-xs uppercase ${tipoGrafico === "barras" ? "text-white" : "text-stone-700"}`}
              >
                General
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setTipoGrafico("torta")}
              className={`flex-1 py-2 rounded-xl items-center border ${
                tipoGrafico === "torta" ? "bg-calabaza border-calabaza" : "bg-white border-stone-300"
              }`}
            >
              <Text
                style={{ fontFamily: "LaOriental" }}
                className={`text-xs uppercase ${tipoGrafico === "torta" ? "text-white" : "text-stone-700"}`}
              >
                Torta
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setTipoGrafico("lineal")}
              className={`flex-1 py-2 rounded-xl items-center border ${
                tipoGrafico === "lineal" ? "bg-calabaza border-calabaza" : "bg-white border-stone-300"
              }`}
            >
              <Text
                style={{ fontFamily: "LaOriental" }}
                className={`text-xs uppercase ${tipoGrafico === "lineal" ? "text-white" : "text-stone-700"}`}
              >
                Lineal
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tarjeta del Gráfico Activo */}
          <View className="rounded-2xl border-2 border-mostaza/40 bg-white p-4 items-center">
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
                <Text style={{ fontFamily: "LaOriental" }} className="text-base uppercase text-vino mb-1">
                  Promedio general de valoraciones
                </Text>
                <Text className="text-[10px] text-stone-500 mb-4">Total de encuestas: {totalRespuestas}</Text>

                <Svg height={180} width={280}>
                  <Line x1={40} y1={10} x2={40} y2={140} stroke="#d1d5db" strokeWidth={2} />
                  <Line x1={40} y1={140} x2={260} y2={140} stroke="#d1d5db" strokeWidth={2} />

                  {[
                    { label: "Sabor", val: Number(promComida), col: "#f97316", x: 60 },
                    { label: "Atención", val: Number(promAtencion), col: "#eab308", x: 130 },
                    { label: "Comodidad", val: Number(promComodidad), col: "#780116", x: 200 },
                  ].map((bar, i) => {
                    const barHeight = Math.max(8, (bar.val / 5) * 115);
                    return (
                      <G key={i}>
                        <Rect
                          x={bar.x}
                          y={140 - barHeight}
                          width={40}
                          height={barHeight}
                          fill={bar.col}
                          rx={4}
                        />
                        <SvgText
                          x={bar.x + 20}
                          y={130 - barHeight}
                          fontSize={11}
                          fontWeight="bold"
                          fill={bar.col}
                          textAnchor="middle"
                        >
                          {bar.val}
                        </SvgText>
                        <SvgText
                          x={bar.x + 20}
                          y={155}
                          fontSize={9}
                          fill="#44403c"
                          textAnchor="middle"
                        >
                          {bar.label}
                        </SvgText>
                      </G>
                    );
                  })}
                </Svg>
              </View>
            ) : tipoGrafico === "torta" ? (
              /* GRÁFICO 2: TORTA */
              <View className="w-full items-center">
                <Text style={{ fontFamily: "LaOriental" }} className="text-base uppercase text-vino mb-1">
                  Distribución de Satisfacción
                </Text>
                <Text className="text-[10px] text-stone-500 mb-3">Valoración general de clientes</Text>

                <Svg height={180} width={180} viewBox="-90 -90 180 180">
                  {(() => {
                    const colores = ["#ef4444", "#f97316", "#eab308", "#10b981", "#780116"];
                    const categoriasConDatos = distribucionGlobal
                      .map((cant, idx) => ({ cant, idx }))
                      .filter((c) => c.cant > 0);

                    if (categoriasConDatos.length === 1) {
                      const unico = categoriasConDatos[0];
                      return (
                        <Circle
                          cx={0}
                          cy={0}
                          r={70}
                          fill={colores[unico.idx]}
                          stroke="#FFF"
                          strokeWidth={2}
                        />
                      );
                    }

                    let acumulado = 0;
                    return distribucionGlobal.map((cant, idx) => {
                      if (cant === 0) return null;
                      const porc = cant / totalRespuestas;
                      const angulo = porc * 360;
                      const r = 70;

                      const rad1 = ((acumulado - 90) * Math.PI) / 180;
                      const x1 = r * Math.cos(rad1);
                      const y1 = r * Math.sin(rad1);

                      acumulado += angulo;
                      const rad2 = ((acumulado - 90) * Math.PI) / 180;
                      const x2 = r * Math.cos(rad2);
                      const y2 = r * Math.sin(rad2);

                      const largeArc = angulo > 180 ? 1 : 0;
                      const d = `M 0 0 L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

                      return (
                        <Path
                          key={idx}
                          d={d}
                          fill={colores[idx]}
                          stroke="#FFF"
                          strokeWidth={2}
                        />
                      );
                    });
                  })()}
                </Svg>

                <View className="flex-row flex-wrap justify-center gap-x-3 gap-y-1 mt-4">
                  {["1★", "2★", "3★", "4★", "5★"].map((txt, i) => (
                    <View key={i} className="flex-row items-center gap-1">
                      <View
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor: ["#ef4444", "#f97316", "#eab308", "#10b981", "#780116"][i],
                        }}
                      />
                      <Text className="text-[10px] text-stone-600">
                        {txt}: {distribucionGlobal[i]}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              /* GRÁFICO 3: LINEAL */
              <View className="w-full items-center">
                <Text style={{ fontFamily: "LaOriental" }} className="text-base uppercase text-vino mb-1">
                  Evolución Reciente
                </Text>
                <Text className="text-[10px] text-stone-500 mb-4">Promedio general de valoraciones</Text>

                <Svg height={170} width={280}>
                  <Line x1={35} y1={15} x2={35} y2={135} stroke="#d1d5db" strokeWidth={2} />
                  <Line x1={35} y1={135} x2={265} y2={135} stroke="#d1d5db" strokeWidth={2} />
                  <Line x1={35} y1={25} x2={265} y2={25} stroke="#f3f4f6" strokeWidth={1} strokeDasharray="4,4" />

                  {(() => {
                    const ultimas = encuestas.slice(0, 6).reverse();
                    if (ultimas.length === 0) return null;

                    if (ultimas.length === 1) {
                      const enc = ultimas[0];
                      const prom = ((enc.rating_cleanliness || 0) + (enc.rating_food || 0) + (enc.rating_service || 0)) / 3;
                      const y = 135 - (prom / 5) * 110;

                      return (
                        <G>
                          <Line
                            x1={40}
                            y1={y}
                            x2={260}
                            y2={y}
                            stroke="#780116"
                            strokeWidth={3}
                            strokeDasharray="6,4"
                          />
                          <Circle cx={150} cy={y} r={7} fill="#eab308" stroke="#780116" strokeWidth={3} />
                          <SvgText
                            x={150}
                            y={y - 12}
                            fontSize={11}
                            fontWeight="bold"
                            fill="#780116"
                            textAnchor="middle"
                          >
                            ⭐ {prom.toFixed(1)} / 5
                          </SvgText>
                          <SvgText
                            x={150}
                            y={152}
                            fontSize={10}
                            fill="#78716c"
                            textAnchor="middle"
                          >
                            1ª Respuesta
                          </SvgText>
                        </G>
                      );
                    }

                    const espacio = 210 / (ultimas.length - 1);
                    const puntos = ultimas.map((enc, idx) => {
                      const prom = ((enc.rating_cleanliness || 0) + (enc.rating_food || 0) + (enc.rating_service || 0)) / 3;
                      const x = 50 + idx * espacio;
                      const y = 135 - (prom / 5) * 110;
                      return { x, y, val: prom.toFixed(1) };
                    });

                    const pathLine = puntos.reduce(
                      (acc, p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
                      ""
                    );

                    return (
                      <G>
                        <Path d={pathLine} fill="none" stroke="#780116" strokeWidth={3} />
                        {puntos.map((p, i) => (
                          <G key={i}>
                            <Circle cx={p.x} cy={p.y} r={5} fill="#eab308" stroke="#780116" strokeWidth={2} />
                            <SvgText
                              x={p.x}
                              y={p.y - 8}
                              fontSize={10}
                              fontWeight="bold"
                              fill="#780116"
                              textAnchor="middle"
                            >
                              {p.val}
                            </SvgText>
                            <SvgText
                              x={p.x}
                              y={150}
                              fontSize={9}
                              fill="#78716c"
                              textAnchor="middle"
                            >
                              #{i + 1}
                            </SvgText>
                          </G>
                        ))}
                      </G>
                    );
                  })()}
                </Svg>
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