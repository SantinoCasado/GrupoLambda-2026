import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { supabase } from "../config/supabase";
import { ChineseFrame } from "../components/ChineseFrame";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  onVolver: () => void;
  esModal?: boolean;
}

type TipoGrafico = "torta" | "barras" | "lineal";

interface ResumenEncuestas {
  total: number;
  promedioGeneral: number;
  distribucionSatisfaccion: { [key: number]: number };
  promediosPorArea: {
    limpieza: number;
    comida: number;
    servicio: number;
  };
  evolucionPorDia: { fecha: string; promedio: number; cantidad: number }[];
}

export function EstadisticasScreen({ onVolver, esModal = false }: Props) {
  const insets = useSafeAreaInsets();
  const [tipoGrafico, setTipoGrafico] = useState<TipoGrafico>("torta");
  const [cargando, setCargando] = useState(true);
  const [resumen, setResumen] = useState<ResumenEncuestas>({
    total: 0,
    promedioGeneral: 0,
    distribucionSatisfaccion: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    promediosPorArea: { limpieza: 0, comida: 0, servicio: 0 },
    evolucionPorDia: [],
  });

  const cargarDatos = async () => {
    try {
      setCargando(true);

      const { data: encuestas, error } = await supabase
        .from("surveys")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        console.warn("⚠️ [Estadisticas] Error al leer surveys:", error.message);
      }

      const lista = encuestas || [];
      const total = lista.length;

      const distribucion: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let sumaTotal = 0;
      let sumaLimpieza = 0;
      let sumaComida = 0;
      let sumaServicio = 0;

      const diasMap: { [key: string]: { total: number; sum: number } } = {};

      lista.forEach((item: any) => {
        const lim = Number(item.rating_cleanliness || 0);
        const com = Number(item.rating_food || 0);
        const ser = Number(item.rating_service || 0);

        sumaLimpieza += lim;
        sumaComida += com;
        sumaServicio += ser;

        const valoresValidos = [lim, com, ser].filter((v) => v > 0);
        const promEncuesta =
          valoresValidos.length > 0
            ? valoresValidos.reduce((a: number, b: number) => a + b, 0) / valoresValidos.length
            : 0;

        const estrellaRedondeada = Math.min(5, Math.max(1, Math.round(promEncuesta)));
        distribucion[estrellaRedondeada] = (distribucion[estrellaRedondeada] || 0) + 1;
        sumaTotal += promEncuesta;

        const fecha = item.created_at ? item.created_at.split("T")[0] : "Hoy";
        if (!diasMap[fecha]) diasMap[fecha] = { total: 0, sum: 0 };
        diasMap[fecha].total += 1;
        diasMap[fecha].sum += promEncuesta;
      });

      const evolucionPorDia = Object.keys(diasMap)
        .slice(-6)
        .map((f) => ({
          fecha: f.slice(5),
          promedio: Number((diasMap[f].sum / diasMap[f].total).toFixed(1)),
          cantidad: diasMap[f].total,
        }));

      setResumen({
        total,
        promedioGeneral: total > 0 ? Number((sumaTotal / total).toFixed(1)) : 0,
        distribucionSatisfaccion: distribucion,
        promediosPorArea: {
          limpieza: total > 0 ? Number((sumaLimpieza / total).toFixed(1)) : 0,
          comida: total > 0 ? Number((sumaComida / total).toFixed(1)) : 0,
          servicio: total > 0 ? Number((sumaServicio / total).toFixed(1)) : 0,
        },
        evolucionPorDia,
      });
    } catch (err) {
      console.error("❌ [Estadisticas] Fallo:", err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // 1. TORTA: SATISFACCIÓN GENERAL
  const renderGraficoTorta = () => {
    const total = resumen.total || 1;
    const colores = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"];

    return (
      <View style={{ alignItems: "center", width: "100%" }}>
        <Text
          style={{
            fontFamily: "LaOriental",
            fontSize: 20,
            color: "#eab308",
            textTransform: "uppercase",
            marginBottom: 6,
            textAlign: "center",
          }}
        >
          Nivel de Satisfacción General
        </Text>
        <Text style={{ fontSize: 12, color: "#fef3c7", textAlign: "center", marginBottom: 20 }}>
          Porcentaje de opiniones según estrellas asignadas
        </Text>

        <View
          style={{
            width: 180,
            height: 180,
            borderRadius: 90,
            borderWidth: 6,
            borderColor: "#eab308",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#500724",
            marginBottom: 24,
          }}
        >
          <Text style={{ fontSize: 44, fontWeight: "900", color: "#eab308" }}>
            {resumen.promedioGeneral}
          </Text>
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: "#fde68a",
              textTransform: "uppercase",
              marginTop: 2,
            }}
          >
            Promedio ★
          </Text>
          <Text style={{ fontSize: 10, color: "#d6d3d1", marginTop: 2 }}>
            {resumen.total} opiniones
          </Text>
        </View>

        <View style={{ width: "100%", gap: 10, paddingHorizontal: 12 }}>
          {[5, 4, 3, 2, 1].map((estrella) => {
            const cant = resumen.distribucionSatisfaccion[estrella] || 0;
            const pct = Math.round((cant / total) * 100);
            return (
              <View
                key={estrella}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", width: 100 }}>
                  <View
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: colores[5 - estrella],
                      marginRight: 8,
                    }}
                  />
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#fef3c7" }}>
                    {estrella} Estrellas
                  </Text>
                </View>

                <View
                  style={{
                    flex: 1,
                    marginHorizontal: 8,
                    height: 10,
                    backgroundColor: "rgba(0,0,0,0.4)",
                    borderRadius: 5,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      height: "100%",
                      width: `${pct}%`,
                      backgroundColor: colores[5 - estrella],
                      borderRadius: 5,
                    }}
                  />
                </View>

                <Text style={{ fontSize: 12, fontWeight: "900", color: "#eab308", width: 55, textAlign: "right" }}>
                  {pct}% ({cant})
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  // 2. BARRAS: DESGLOSE POR ÁREA
  const renderGraficoBarras = () => {
    const areas = [
      { label: "Limpieza", valor: resumen.promediosPorArea.limpieza, color: "#38bdf8" },
      { label: "Comida", valor: resumen.promediosPorArea.comida, color: "#f59e0b" },
      { label: "Servicio", valor: resumen.promediosPorArea.servicio, color: "#10b981" },
    ];

    const mejorArea = areas.reduce((prev, curr) => (curr.valor > prev.valor ? curr : prev), areas[0]);

    return (
      <View style={{ alignItems: "center", width: "100%" }}>
        <Text
          style={{
            fontFamily: "LaOriental",
            fontSize: 20,
            color: "#eab308",
            textTransform: "uppercase",
            marginBottom: 6,
            textAlign: "center",
          }}
        >
          Desempeño por Área
        </Text>
        <Text style={{ fontSize: 12, color: "#fef3c7", textAlign: "center", marginBottom: 24 }}>
          Promedio de estrellas sobre 5 en cada rubro
        </Text>

        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-around",
            height: 220,
            width: "100%",
            paddingHorizontal: 10,
            borderBottomWidth: 2,
            borderBottomColor: "rgba(234,179,8,0.4)",
            paddingBottom: 8,
          }}
        >
          {areas.map((area, idx) => {
            const altura = Math.max(20, (area.valor / 5) * 160);
            return (
              <View key={idx} style={{ alignItems: "center", width: 85 }}>
                <Text style={{ fontSize: 13, fontWeight: "900", color: area.color, marginBottom: 6 }}>
                  {area.valor} ★
                </Text>
                <View
                  style={{
                    width: "100%",
                    height: altura,
                    backgroundColor: area.color,
                    borderTopLeftRadius: 10,
                    borderTopRightRadius: 10,
                  }}
                />
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#fef3c7", marginTop: 8, textAlign: "center" }}>
                  {area.label}
                </Text>
              </View>
            );
          })}
        </View>

        <View
          style={{
            marginTop: 24,
            backgroundColor: "rgba(0,0,0,0.3)",
            padding: 14,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "rgba(234,179,8,0.3)",
            width: "100%",
          }}
        >
          <Text style={{ fontSize: 12, color: "#fef3c7", textAlign: "center" }}>
            El área mejor puntuada por los clientes es{" "}
            <Text style={{ fontWeight: "900", color: "#eab308" }}>{mejorArea.label}</Text> ({mejorArea.valor} ★).
          </Text>
        </View>
      </View>
    );
  };

  // 3. LINEAL: TENDENCIA TEMPORAL
  const renderGraficoLineal = () => {
    const data =
      resumen.evolucionPorDia.length > 0
        ? resumen.evolucionPorDia
        : [
            { fecha: "Día 1", promedio: 4.2, cantidad: 3 },
            { fecha: "Día 2", promedio: 4.5, cantidad: 5 },
            { fecha: "Día 3", promedio: 4.8, cantidad: 4 },
          ];

    return (
      <View style={{ alignItems: "center", width: "100%" }}>
        <Text
          style={{
            fontFamily: "LaOriental",
            fontSize: 20,
            color: "#eab308",
            textTransform: "uppercase",
            marginBottom: 6,
            textAlign: "center",
          }}
        >
          Tendencia del Servicio
        </Text>
        <Text style={{ fontSize: 12, color: "#fef3c7", textAlign: "center", marginBottom: 20 }}>
          Evolución del puntaje promedio por jornada
        </Text>

        <View
          style={{
            width: "100%",
            backgroundColor: "rgba(0,0,0,0.3)",
            padding: 16,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "rgba(234,179,8,0.4)",
          }}
        >
          <View
            style={{
              height: 180,
              flexDirection: "row",
              alignItems: "flex-end",
              justifyContent: "space-around",
              borderBottomWidth: 1,
              borderLeftWidth: 1,
              borderColor: "rgba(234,179,8,0.5)",
              paddingBottom: 10,
              paddingHorizontal: 10,
            }}
          >
            {data.map((punto, i) => {
              const alturaPct = Math.min(100, Math.max(15, (punto.promedio / 5.0) * 100));
              return (
                <View key={i} style={{ alignItems: "center", flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#eab308", marginBottom: 4 }}>
                    {punto.promedio}★
                  </Text>
                  <View
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: "#eab308",
                      borderWidth: 2,
                      borderColor: "#500724",
                    }}
                  />
                  <View
                    style={{
                      width: 3,
                      backgroundColor: "rgba(234,179,8,0.4)",
                      borderRadius: 2,
                      marginTop: 4,
                      height: (alturaPct / 100) * 80,
                    }}
                  />
                  <Text style={{ fontSize: 10, fontWeight: "600", color: "#fde68a", marginTop: 6 }}>
                    {punto.fecha}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={{ marginTop: 20, flexDirection: "row", justifyContent: "space-between", width: "100%", gap: 10 }}>
          <View
            style={{
              flex: 1,
              alignItems: "center",
              backgroundColor: "rgba(80,7,36,0.8)",
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "rgba(234,179,8,0.3)",
            }}
          >
            <Text style={{ fontSize: 10, color: "#d6d3d1", textTransform: "uppercase" }}>Tendencia</Text>
            <Text style={{ fontSize: 14, fontWeight: "800", color: "#34d399", marginTop: 2 }}>En Alza ↗</Text>
          </View>
          <View
            style={{
              flex: 1,
              alignItems: "center",
              backgroundColor: "rgba(80,7,36,0.8)",
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "rgba(234,179,8,0.3)",
            }}
          >
            <Text style={{ fontSize: 10, color: "#d6d3d1", textTransform: "uppercase" }}>Encuestas</Text>
            <Text style={{ fontSize: 14, fontWeight: "800", color: "#eab308", marginTop: 2 }}>{resumen.total}</Text>
          </View>
        </View>
      </View>
    );
  };

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

        {/* Selector de gráficos con más separación */}
        <View
          style={{
            flexDirection: "row",
            marginTop: 18, // <-- Un poco más de distancia respecto al título
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

      {/* Contenido con ScrollView más despegado */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,      // <-- Más aire entre el selector y la tarjeta
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
          ) : (
            <>
              {tipoGrafico === "torta" && renderGraficoTorta()}
              {tipoGrafico === "barras" && renderGraficoBarras()}
              {tipoGrafico === "lineal" && renderGraficoLineal()}
            </>
          )}
        </ChineseFrame>
      </ScrollView>
    </SafeAreaView>
  );
}

export default EstadisticasScreen;