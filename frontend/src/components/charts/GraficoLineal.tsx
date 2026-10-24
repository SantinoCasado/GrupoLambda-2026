import React from "react";
import Svg, { Circle, G, Line, Path, Text as SvgText } from "react-native-svg";

export interface PuntoLinea {
  etiqueta: string; // texto del eje X (por ejemplo DD/MM)
  promedio: number; // sin redondear: 4.3 se dibuja en 4.3
}

interface Props {
  puntos: PuntoLinea[];
  axisColor?: string;
  gridColor?: string;
  tickColor?: string;
  dateColor?: string;
  valueColor?: string;
  lineColor?: string;
  dotFill?: string;
  dotStroke?: string;
  emptyText?: string;
  emptyTextColor?: string;
  width?: number;
  height?: number;
}

export function GraficoLineal({
  puntos,
  axisColor = "#d1d5db",
  gridColor = "#d7dbe291",
  tickColor = "#78716c",
  dateColor = "#78716c",
  valueColor = "#780116",
  lineColor = "#780116",
  dotFill = "#eab308",
  dotStroke = "#780116",
  emptyText = "Sin fechas registradas",
  emptyTextColor = "#78716c",
  width = 300,
  height = 230,
}: Props) {
  // Todo el dibujo (fuentes, grosores, puntos) escala con el alto
  const e = height / 170;

  const AXIS_X = 20;
  const AXIS_TOP = Math.round(15 * e);
  const PLOT_TOP = Math.round(25 * e);
  const PLOT_BOTTOM = height - Math.round(35 * e);
  const PLOT_LEFT = 50;
  const PLOT_RIGHT = width - 20;
  const AXIS_RIGHT = width - 15;
  const DATE_Y = height - Math.round(20 * e);
  const GROSOR_EJE = Math.max(2, Math.round(2 * e));
  const FUENTE_TICK = Math.round(10 * e);
  const FUENTE_VALOR = Math.round(11 * e);
  const FUENTE_FECHA = Math.round(10 * e);
  const RADIO_PUNTO = Math.round(5 * e);

  const clampRating = (v: number) => Math.min(5, Math.max(1, v));
  const valoracionY = (v: number) =>
    PLOT_BOTTOM - ((clampRating(v) - 1) / 4) * (PLOT_BOTTOM - PLOT_TOP);

  return (
    <Svg height={height} width={width}>
      {/* Ejes */}
      <Line x1={AXIS_X} y1={AXIS_TOP} x2={AXIS_X} y2={PLOT_BOTTOM} stroke={axisColor} strokeWidth={GROSOR_EJE} />
      <Line x1={AXIS_X} y1={PLOT_BOTTOM} x2={AXIS_RIGHT} y2={PLOT_BOTTOM} stroke={axisColor} strokeWidth={GROSOR_EJE} />

      {/* Escala vertical: 1 abajo, 5 arriba */}
      {[2, 3, 4, 5].map((v) => (
        <Line
          key={`grid-${v}`}
          x1={AXIS_X}
          y1={valoracionY(v)}
          x2={AXIS_RIGHT}
          y2={valoracionY(v)}
          stroke={gridColor}
          strokeWidth={2}
          strokeDasharray="4,4"
        />
      ))}
      {[1, 2, 3, 4, 5].map((v) => (
        <SvgText
          key={`tick-${v}`}
          x={AXIS_X - Math.round(5 * e)}
          y={valoracionY(v) + Math.round(3 * e)}
          fontSize={FUENTE_TICK}
          fill={tickColor}
          textAnchor="end"
        >
          {v}
        </SvgText>
      ))}

      {puntos.length === 0 ? (
        <SvgText
          x={(PLOT_LEFT + PLOT_RIGHT) / 2}
          y={Math.round(80 * e)}
          fontSize={Math.round(10 * e)}
          fill={emptyTextColor}
          textAnchor="middle"
        >
          {emptyText}
        </SvgText>
      ) : puntos.length === 1 ? (
        (() => {
          const punto = puntos[0];
          const y = valoracionY(punto.promedio);
          const centro = (PLOT_LEFT + PLOT_RIGHT) / 2;

          return (
            <G>
              <Line
                x1={PLOT_LEFT}
                y1={y}
                x2={PLOT_RIGHT}
                y2={y}
                stroke={lineColor}
                strokeWidth={Math.max(3, Math.round(3 * e))}
                strokeDasharray="6,4"
              />
              <Circle
                cx={centro}
                cy={y}
                r={Math.round(7 * e)}
                fill={dotFill}
                stroke={dotStroke}
                strokeWidth={Math.max(3, Math.round(3 * e))}
              />
              <SvgText
                x={centro}
                y={Math.max(Math.round(11 * e), y - Math.round(12 * e))}
                fontSize={Math.round(11 * e)}
                fontWeight="bold"
                fill={valueColor}
                textAnchor="middle"
              >
                ⭐ {punto.promedio.toFixed(1)} / 5
              </SvgText>
              <SvgText x={centro} y={DATE_Y} fontSize={Math.round(9 * e)} fill={dateColor} textAnchor="middle">
                {punto.etiqueta}
              </SvgText>
            </G>
          );
        })()
      ) : (
        (() => {
          const espacio = (PLOT_RIGHT - PLOT_LEFT) / (puntos.length - 1);
          const coordenadas = puntos.map((punto, idx) => ({
            x: PLOT_LEFT + idx * espacio,
            y: valoracionY(punto.promedio),
            val: punto.promedio.toFixed(1),
            etiqueta: punto.etiqueta,
          }));

          const pathLine = coordenadas.reduce(
            (acc, p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
            ""
          );

          return (
            <G>
              <Path d={pathLine} fill="none" stroke={lineColor} strokeWidth={Math.max(3, Math.round(3 * e))} />
              {coordenadas.map((p, i) => (
                <G key={`${p.etiqueta}-${i}`}>
                  <Circle
                    cx={p.x}
                    cy={p.y}
                    r={RADIO_PUNTO}
                    fill={dotFill}
                    stroke={dotStroke}
                    strokeWidth={Math.max(2, Math.round(2 * e))}
                  />
                  <SvgText
                    x={p.x}
                    y={Math.max(FUENTE_VALOR, p.y - Math.round(9 * e))}
                    fontSize={FUENTE_VALOR}
                    fontWeight="bold"
                    fill={valueColor}
                    textAnchor="middle"
                  >
                    {p.val}
                  </SvgText>
                  <SvgText x={p.x} y={DATE_Y} fontSize={FUENTE_FECHA} fill={dateColor} textAnchor="middle">
                    {p.etiqueta}
                  </SvgText>
                </G>
              ))}
            </G>
          );
        })()
      )}
    </Svg>
  );
}

export default GraficoLineal;
