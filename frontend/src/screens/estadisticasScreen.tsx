import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChineseFrame } from "../components/ChineseFrame";
import { GraficoBarras } from "../components/charts/GraficoBarras";
import { GraficoTorta } from "../components/charts/GraficoTorta";
import { GraficoLineal } from "../components/charts/GraficoLineal";
import { obtenerEstadisticasEncuestasApi } from "../services/encuestasService";
import { calcularResumenEncuestas } from "../utils/encuestasStats";
import type { ResumenEncuestas } from "../utils/encuestasStats";

interface Props {
  onVolver: () => void;
  esModal?: boolean;
}

type TipoGrafico = "torta" | "barras" | "lineal";

const OPCIONES_GRAFICO: { tipo: TipoGrafico; label: string }[] = [
  { tipo: "barras", label: "Individual" },
  { tipo: "torta", label: "General" },
  { tipo: "lineal", label: "Reciente" },
];

// Misma paleta que usa encuestaScreen para los gráficos sobre fondo claro.
const COLORES_TORTA = ["#ef4444", "#f97316", "#eab308", "#10b981", "#780116"];

export function EstadisticasScreen({ onVolver, esModal = false }: Props) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [tipoGrafico, setTipoGrafico] = useState<TipoGrafico>("barras");
  const [cargando, setCargando] = useState(true);
  const [resumen, setResumen] = useState<ResumenEncuestas>(() => calcularResumenEncuestas([]));

  // Los SVG se ajustan al ancho interno del card (pantalla - padding - bordes)
  const anchoGrafico = Math.min(300, screenWidth - 80);
  const tamanoTorta = Math.min(210, anchoGrafico);

  // En el modal no hay SafeAreaView que cubra el notch: lo compensamos acá.
  const margenSuperior = esModal ? Math.max(insets.top, 8) : 0;

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const encuestas = await obtenerEstadisticasEncuestasApi();
      setResumen(calcularResumenEncuestas(encuestas));
    } catch (err: any) {
      console.warn("⚠️ [Estadisticas] Error al cargar encuestas:", err?.message || err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const barrasPromedios = [
    { label: "Sabor", value: resumen.promedios.sabor, color: "#f97316" },
    { label: "Atención", value: resumen.promedios.atencion, color: "#eab308" },
    { label: "Comodidad", value: resumen.promedios.comodidad, color: "#780116" },
  ];

  return (
    <View className="flex-1">
      <StatusBar style="light" />

      {/* Cabecera (mismo estilo que pedidoRecibidoScreen) */}
      <View
        className="px-5 pt-4"
        style={esModal ? { paddingTop: margenSuperior + 50 } : undefined}
      >

        <Image
          source={require("../../assets/images/logo-name.png")}
          className="h-20 w-auto self-center"
          resizeMode="contain"
        />
        <Image
          source={require("../../assets/images/separator.png")}
          className="mt-2 h-8 w-full"
          resizeMode="contain"
        />
        <ChineseFrame className="mt-1 bg-vino">
          <View className="items-center rounded-xl bg-mostaza/15 px-4 py-4">
            <Text
              style={{ fontFamily: "LaOriental" }}
              className="text-2xl text-mostaza uppercase text-center"
            >
              Estadísticas
            </Text>
            <Text className="mt-1 text-xs text-center font-semibold text-amber-100">
              Métricas y reseñas del restaurante
            </Text>
          </View>
        </ChineseFrame>
      </View>

      {/* Selector de gráficos */}
      <View className="mt-4 px-5">
        <ChineseFrame color="#8f0018" className="bg-mostaza px-2">
          <View className="flex-row px-2 py-1.5 rounded-2xl m-2 gap-2">
            {OPCIONES_GRAFICO.map(({ tipo, label }, index) => (
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
      </View>

      {/* Contenido: solo gráficos */}
      <ScrollView
        className="flex-1 px-5 pt-3"
        contentContainerStyle={{
          flexGrow: 1,
          // En modal el contenido llega hasta abajo de la pantalla: sumamos el
          // inset inferior para que la tarjeta no quede bajo los botones del sistema.
          paddingBottom: esModal ? insets.bottom + 24 : 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 items-center justify-center rounded-2xl border-2 border-mostaza/70 bg-amber-50 p-4">
          {cargando ? (
            <View className="items-center py-16">
              <ActivityIndicator size="large" color="#8f0018" />
              <Text className="mt-3 text-xs font-bold text-vino">Cargando encuestas...</Text>
            </View>
          ) : resumen.total === 0 ? (
            <View className="items-center py-16">
              <Text className="mb-2 text-3xl">📊</Text>
              <Text
                style={{ fontFamily: "LaOriental" }}
                className="text-center text-sm uppercase text-vino"
              >
                Aún no hay encuestas registradas
              </Text>
            </View>
          ) : tipoGrafico === "barras" ? (
            <View className="w-full items-center">
              <Text
                style={{ fontFamily: "LaOriental" }}
                className="mb-1 text-center text-2xl uppercase text-vino"
              >
                Promedio individual
              </Text>
              <Text className="mb-4 text-center text-base text-stone-500">
                Total de encuestas: {resumen.total}
              </Text>
              <GraficoBarras data={barrasPromedios} width={anchoGrafico} />
            </View>
          ) : tipoGrafico === "torta" ? (
            <View className="w-full items-center">
              <Text
                style={{ fontFamily: "LaOriental" }}
                className="mb-1 text-center text-2xl uppercase text-vino"
              >
                Distribución de Satisfacción
              </Text>
              <Text className="text-center text-base text-stone-500">
                Promedio general de valoracion
              </Text>
              <GraficoTorta
                valores={resumen.distribucionSatisfaccion}
                colores={COLORES_TORTA}
                size={tamanoTorta}
              />
            </View>
          ) : (
            <View className="w-full items-center">
              <Text
                style={{ fontFamily: "LaOriental" }}
                className="mb-1 text-center text-2xl uppercase text-vino"
              >
                Evolución Reciente
              </Text>
              <Text className="mb-12 text-center text-base text-stone-500">
                Promedio diario (1 a 5) · un punto por día
              </Text>
              <GraficoLineal puntos={resumen.dias} width={anchoGrafico} />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

export default EstadisticasScreen;
