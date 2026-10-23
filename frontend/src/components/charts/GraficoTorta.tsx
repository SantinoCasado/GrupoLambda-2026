import React from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Path, Text as SvgText } from "react-native-svg";

interface Props {
  valores: number[]; // cantidad de encuestas por 1★, 2★, 3★, 4★, 5★
  colores?: string[];
  legendColor?: string;
  mostrarPorcentaje?: boolean;
  sliceStrokeColor?: string;
  emptyText?: string;
  emptyTextColor?: string;
  size?: number;
}

const COLORES_POR_DEFECTO = ["#ef4444", "#f97316", "#eab308", "#10b981", "#780116"];
const ETIQUETAS = ["1★", "2★", "3★", "4★", "5★"];

export function GraficoTorta({
  valores,
  colores = COLORES_POR_DEFECTO,
  legendColor = "#57534e",
  mostrarPorcentaje = true,
  sliceStrokeColor = "#FFF",
  emptyText = "Sin valoraciones registradas",
  emptyTextColor = "#78716c",
  size = 210,
}: Props) {
  // Todo el dibujo (radio, leyenda, grosores) escala con el tamaño
  const e = size / 180;
  const radio = size / 2 - Math.round(20 * e);
  const grosorTajada = Math.max(2, Math.round(2 * e));
  const tamanoPunto = Math.round(10 * e);
  const fuenteLeyenda = Math.round(12 * e);
  const total = valores.reduce((acc, cant) => acc + cant, 0);

  const textoLeyenda = (cant: number, idx: number) =>
    mostrarPorcentaje
      ? `${ETIQUETAS[idx]}: ${cant} (${total > 0 ? Math.round((cant / total) * 100) : 0}%)`
      : `${ETIQUETAS[idx]}: ${cant}`;

  return (
    <View className="w-full items-center">
      {total === 0 ? (
        <Svg height={size} width={size}>
          <SvgText
            x={size / 2}
            y={size / 2}
            fontSize={Math.round(10 * e)}
            fill={emptyTextColor}
            textAnchor="middle"
          >
            {emptyText}
          </SvgText>
        </Svg>
      ) : (
        <>
          <Svg height={size} width={size} viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`}>
            {(() => {
              const categoriasConDatos = valores
                .map((cant, idx) => ({ cant, idx }))
                .filter((c) => c.cant > 0);

              if (categoriasConDatos.length === 1) {
                const unico = categoriasConDatos[0];
                return (
                  <Circle
                    cx={0}
                    cy={0}
                    r={radio}
                    fill={colores[unico.idx]}
                    stroke={sliceStrokeColor}
                    strokeWidth={grosorTajada}
                  />
                );
              }

              let acumulado = 0;
              return valores.map((cant, idx) => {
                if (cant === 0) return null;
                const angulo = (cant / total) * 360;

                const rad1 = ((acumulado - 90) * Math.PI) / 180;
                const x1 = radio * Math.cos(rad1);
                const y1 = radio * Math.sin(rad1);

                acumulado += angulo;
                const rad2 = ((acumulado - 90) * Math.PI) / 180;
                const x2 = radio * Math.cos(rad2);
                const y2 = radio * Math.sin(rad2);

                const largeArc = angulo > 180 ? 1 : 0;
                const d = `M 0 0 L ${x1} ${y1} A ${radio} ${radio} 0 ${largeArc} 1 ${x2} ${y2} Z`;

                return (
                  <Path
                    key={idx}
                    d={d}
                    fill={colores[idx]}
                    stroke={sliceStrokeColor}
                    strokeWidth={grosorTajada}
                  />
                );
              });
            })()}
          </Svg>

          <View className="flex-row flex-wrap justify-center gap-x-3 gap-y-1">
            {ETIQUETAS.map((txt, i) => (
              <View key={i} className="flex-row items-center gap-1.5">
                <View
                  style={{
                    backgroundColor: colores[i],
                    width: tamanoPunto,
                    height: tamanoPunto,
                    borderRadius: tamanoPunto / 2,
                  }}
                />
                <Text style={{ color: legendColor, fontSize: fuenteLeyenda }}>
                  {textoLeyenda(valores[i] ?? 0, i)}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

export default GraficoTorta;
