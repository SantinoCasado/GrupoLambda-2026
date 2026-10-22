import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  useWindowDimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { ChineseFrame } from "../components/ChineseFrame";
import { GraficoBarras } from "../components/charts/GraficoBarras";
import { GraficoTorta } from "../components/charts/GraficoTorta";
import { GraficoLineal } from "../components/charts/GraficoLineal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { obtenerEstadisticasEncuestasApi } from "../services/encuestasService";
import { calcularResumenEncuestas } from "../utils/encuestasStats";
import type { ResumenEncuestas } from "../utils/encuestasStats";

interface Props {
  onVolver: () => void;
  esModal?: boolean;
}

type TipoGrafico = "torta" | "barras" | "lineal";

// Paleta para el fondo vino de esta pantalla (los gráficos vienen del tema claro)
const PALETA_TORTA = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"];
const EJE = "rgba(234,179,8,0.45)";
const GRILLA = "rgba(234,179,8,0.15)";
const TEXTO_GRAFICO = "#fde68a";
const DESTACADO = "#eab308";

const estiloTitulo = {
  fontFamily: "LaOriental",
  fontSize: 20,
  color: DESTACADO,
  textTransform: "uppercase" as const,
  marginBottom: 6,
  textAlign: "center" as const,
};

const estiloSubtitulo = {
  fontSize: 12,
  color: "#fef3c7",
  textAlign: "center" as const,
  marginBottom: 16,
};

export function EstadisticasScreen({ onVolver, esModal = false }: Props) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [tipoGrafico, setTipoGrafico] = useState<TipoGrafico>("torta");
  const [cargando, setCargando] = useState(true);
  const [resumen, setResumen] = useState<ResumenEncuestas>(() => calcularResumenEncuestas([]));

  // Los SVG se ajustan al ancho interno del card (pantalla - padding - gutter)
  const anchoGrafico = Math.min(300, screenWidth - 100);
  const tamanoTorta = Math.min(210, anchoGrafico);

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
    { label: "Sabor", value: resumen.promedios.sabor, color: "#f59e0b" },
    { label: "Atención", value: resumen.promedios.atencion, color: "#38bdf8" },
    { label: "Comodidad", value: resumen.promedios.comodidad, color: "#34d399" },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#500724" }}>
      <StatusBar style="light" />

      {/* Header: si es modal le da padding para el notch; si es pantalla normal queda al ras */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: esModal ? Math.max(insets.top + 10, 24) : 8,
          paddingBottom: 12,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text
              style={{
                fontSize: 11,
                fontWeight: "800",
                color: "#fde68a",
                textTransform: "uppercase",
                letterSpacing: 1.5,
              }}
            >
              Métricas & Encuestas
            </Text>
            <Text
              style={{
                fontFamily: "LaOriental",
                fontSize: 26,
                color: "#eab308",
                textTransform: "uppercase",
                marginTop: 2,
              }}
            >
              Estadísticas
            </Text>
          </View>

          <TouchableOpacity
            onPress={onVolver}
            style={{
              backgroundColor: "rgba(234,88,12,0.35)",
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "rgba(234,179,8,0.5)",
            }}
          >
            <Text style={{ color: "#eab308", fontSize: 13, fontWeight: "800" }}>Volver</Text>
          </TouchableOpacity>
        </View>

        {/* Selector de gráficos */}
        <View
          style={{
            flexDirection: "row",
            marginTop: 18,
            backgroundColor: "rgba(0,0,0,0.45)",
            padding: 5,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: "rgba(234,179,8,0.3)",
          }}
        >
          {(["torta", "barras", "lineal"] as TipoGrafico[]).map((tipo) => (
            <TouchableOpacity
              key={tipo}
              onPress={() => setTipoGrafico(tipo)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                alignItems: "center",
                backgroundColor: tipoGrafico === tipo ? "#eab308" : "transparent",
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "800",
                  textTransform: "uppercase",
                  color: tipoGrafico === tipo ? "#500724" : "#fef3c7",
                }}
              >
                {tipo}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Contenido */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 60,
        }}
        showsVerticalScrollIndicator={false}
      >
        <ChineseFrame className="bg-vino/95 p-5 border border-mostaza/40 rounded-2xl shadow-xl">
          {cargando ? (
            <View style={{ paddingVertical: 60, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator size="large" color="#eab308" />
              <Text style={{ marginTop: 12, fontSize: 12, fontWeight: "700", color: "#fde68a" }}>
                Cargando encuestas...
              </Text>
            </View>
          ) : resumen.total === 0 ? (
            <View style={{ paddingVertical: 60, alignItems: "center" }}>
              <Text style={{ fontSize: 30, marginBottom: 8 }}>📊</Text>
              <Text style={{ ...estiloTitulo, fontSize: 14, marginBottom: 0 }}>
                Aún no hay encuestas registradas
              </Text>
            </View>
          ) : tipoGrafico === "torta" ? (
            <View style={{ alignItems: "center", width: "100%" }}>
              <Text style={estiloTitulo}>Nivel de Satisfacción General</Text>
              <Text style={estiloSubtitulo}>Distribución de las opiniones según estrellas</Text>
              <GraficoTorta
                valores={resumen.distribucionSatisfaccion}
                colores={PALETA_TORTA}
                legendColor={TEXTO_GRAFICO}
                sliceStrokeColor="#500724"
                emptyTextColor={TEXTO_GRAFICO}
                size={tamanoTorta}
              />
            </View>
          ) : tipoGrafico === "barras" ? (
            <View style={{ alignItems: "center", width: "100%" }}>
              <Text style={estiloTitulo}>Desempeño por Área</Text>
              <Text style={estiloSubtitulo}>Promedio de estrellas sobre 5 en cada rubro</Text>
              <GraficoBarras
                data={barrasPromedios}
                axisColor={EJE}
                gridColor={GRILLA}
                tickColor={TEXTO_GRAFICO}
                categoryColor={TEXTO_GRAFICO}
                emptyTextColor={TEXTO_GRAFICO}
                width={anchoGrafico}
              />
            </View>
          ) : (
            <View style={{ alignItems: "center", width: "100%" }}>
              <Text style={estiloTitulo}>Tendencia del Servicio</Text>
              <Text style={estiloSubtitulo}>Promedio diario (1 a 5) · un punto por día</Text>
              <GraficoLineal
                puntos={resumen.dias}
                axisColor={EJE}
                gridColor={GRILLA}
                tickColor={TEXTO_GRAFICO}
                dateColor={TEXTO_GRAFICO}
                valueColor={DESTACADO}
                lineColor={DESTACADO}
                dotFill={DESTACADO}
                dotStroke="#500724"
                emptyTextColor={TEXTO_GRAFICO}
                width={anchoGrafico}
              />
            </View>
          )}
        </ChineseFrame>
      </ScrollView>
    </SafeAreaView>
  );
}

export default EstadisticasScreen;
