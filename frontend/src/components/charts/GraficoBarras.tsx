import React from "react";
import Svg, { G, Line, Path, Text as SvgText } from "react-native-svg";

export interface BarraDato {
  label: string;
  value: number;
  color: string;
}

interface Props {
  data: BarraDato[];
  axisColor?: string;
  gridColor?: string;
  tickColor?: string;
  categoryColor?: string;
  valueColor?: string; // si no se pasa, el número usa el color de cada barra
  emptyText?: string;
  emptyTextColor?: string;
  width?: number;
  height?: number;
}

const ALTURA_BASE = 180;

// Rect con esquinas superiores redondeadas y base recta sobre el eje
const barPath = (x: number, y: number, w: number, h: number, r: number) => {
  const radio = Math.min(r, w / 2, h);
  return [
    `M ${x} ${y + h}`,
    `L ${x} ${y + radio}`,
    `Q ${x} ${y} ${x + radio} ${y}`,
    `L ${x + w - radio} ${y}`,
    `Q ${x + w} ${y} ${x + w} ${y + radio}`,
    `L ${x + w} ${y + h}`,
    "Z",
  ].join(" ");
};

export function GraficoBarras({
  data,
  axisColor = "#d1d5db",
  gridColor = "#d7dbe291",
  tickColor = "#78716c",
  categoryColor = "#44403c",
  valueColor,
  emptyText = "Sin datos",
  emptyTextColor = "#78716c",
  width = 300,
  height = 240,
}: Props) {
  // Todo el dibujo (fuentes, alturas, grosores) escala con el alto
  const e = height / ALTURA_BASE;

  const AXIS_X = 40;
  const AXIS_TOP = Math.round(10 * e);
  const AXIS_BOTTOM = height - Math.round(40 * e);
  const PLOT_LEFT = 50;
  const PLOT_RIGHT = width - 20;
  const ALTURA_MAX = AXIS_BOTTOM - AXIS_TOP - Math.round(15 * e);
  const ALTURA_MINIMA = Math.max(8, Math.round(8 * e));
  const GROSOR_EJE = Math.max(2, Math.round(2 * e));
  const FUENTE_VALOR = Math.round(11 * e);
  const FUENTE_CATEGORIA = Math.round(10 * e);
  const FUENTE_TICK = Math.round(10 * e);

  // Escala vertical: 1 en la base, 5 en el tope
  const clampRating = (v: number) => Math.min(5, Math.max(1, v));
  const valoracionY = (v: number) =>
    AXIS_BOTTOM - ((clampRating(v) - 1) / 4) * ALTURA_MAX;

  if (data.length === 0) {
    return (
      <Svg height={Math.round(80 * e)} width={width}>
        <SvgText
          x={width / 2}
          y={Math.round(40 * e)}
          fontSize={Math.round(10 * e)}
          fill={emptyTextColor}
          textAnchor="middle"
        >
          {emptyText}
        </SvgText>
      </Svg>
    );
  }

  const slot = (PLOT_RIGHT - PLOT_LEFT) / data.length;
  const barWidth = Math.min(Math.round(40 * e), slot * 0.6);

  return (
    <Svg height={height} width={width}>
      {/* Grilla de la escala 1 a 5 */}
      {[2, 3, 4, 5].map((v) => (
        <Line
          key={`grid-${v}`}
          x1={AXIS_X}
          y1={valoracionY(v)}
          x2={PLOT_RIGHT}
          y2={valoracionY(v)}
          stroke={gridColor}
          strokeWidth={2}
          strokeDasharray="4,4"
        />
      ))}
      {[1, 2, 3, 4, 5].map((v) => (
        <SvgText
          key={`tick-${v}`}
          x={AXIS_X - Math.round(6 * e)}
          y={valoracionY(v) + Math.round(3 * e)}
          fontSize={FUENTE_TICK}
          fill={tickColor}
          textAnchor="end"
        >
          {v}
        </SvgText>
      ))}

      <Line x1={AXIS_X} y1={AXIS_TOP} x2={AXIS_X} y2={AXIS_BOTTOM} stroke={axisColor} strokeWidth={GROSOR_EJE} />
      <Line x1={AXIS_X} y1={AXIS_BOTTOM} x2={PLOT_RIGHT} y2={AXIS_BOTTOM} stroke={axisColor} strokeWidth={GROSOR_EJE} />

      {data.map((bar, i) => {
        const barHeight = Math.max(ALTURA_MINIMA, ((clampRating(bar.value) - 1) / 4) * ALTURA_MAX);
        const x = PLOT_LEFT + (i + 0.5) * slot - barWidth / 2;
        const y = AXIS_BOTTOM - barHeight;
        const center = x + barWidth / 2;

        return (
          <G key={`${bar.label}-${i}`}>
            <Path d={barPath(x, y, barWidth, barHeight, Math.round(4 * e))} fill={bar.color} />
            <SvgText
              x={center}
              y={Math.max(FUENTE_VALOR, y - Math.round(10 * e))}
              fontSize={FUENTE_VALOR}
              fontWeight="bold"
              fill={valueColor ?? bar.color}
              textAnchor="middle"
            >
              {bar.value.toFixed(1)}
            </SvgText>
            <SvgText
              x={center}
              y={AXIS_BOTTOM + Math.round(16 * e)}
              fontSize={FUENTE_CATEGORIA}
              fill={categoryColor}
              textAnchor="middle"
            >
              {bar.label}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

export default GraficoBarras;
