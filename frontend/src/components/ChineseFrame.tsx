import React, { useState } from "react";
import { View, LayoutChangeEvent } from "react-native";
import Svg, { G, Path } from "react-native-svg";

const TERRACOTA = "#c32f27";
const MOSTAZA = "#f7b538";
const SW = 2;
const CORNER = 34;
const GUTTER = 10;
const INSET = 6;

interface ChineseCornerProps {
  color: string;
  size: number;
  x: number;
  y: number;
  rotation: 0 | 90 | 180 | 270;
}

const ChineseCorner = ({ color, size, x, y, rotation }: ChineseCornerProps) => {
  const s = size;
  const o = s * 0.28;
  const i = o + s * 0.14;

  const d = `
    M ${o} ${SW}
    L ${o} ${s - o}
    L ${o * 0.6} ${s - o}
    L ${o * 0.6} ${i}
    L ${s - o} ${i}
    L ${s - o} ${o * 0.6}
    L ${i} ${o * 0.6}
    L ${i} ${o}
    L ${SW} ${o}
  `;

  return (
    <G transform={`translate(${x}, ${y}) rotate(${rotation} ${s / 2} ${s / 2})`}>
      <Path d={d} stroke={color} strokeWidth={SW} fill="none" strokeLinecap="round" />
    </G>
  );
};

interface ChineseFrameProps {
  children: React.ReactNode;
  className?: string;
  color?: string;
}

export const ChineseFrame = ({ children, className = "", color = MOSTAZA }: ChineseFrameProps) => {
  const [size, setSize] = useState({ width: 0, height: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  const w = size.width;
  const h = size.height;
  const o = CORNER * 0.28;
  const i = o + CORNER * 0.14;

  const rails = `
    M ${CORNER + INSET} ${o} H ${w - CORNER - INSET}
    M ${CORNER + INSET} ${i} H ${w - CORNER - INSET}
    M ${CORNER + INSET} ${h - i} H ${w - CORNER - INSET}
    M ${CORNER + INSET} ${h - o} H ${w - CORNER - INSET}
    M ${o} ${CORNER + INSET} V ${h - CORNER - INSET}
    M ${i} ${CORNER + INSET} V ${h - CORNER - INSET}
    M ${w - i} ${CORNER + INSET} V ${h - CORNER - INSET}
    M ${w - o} ${CORNER + INSET} V ${h - CORNER - INSET}
  `;

  return (
    <View className={`relative ${className}`} onLayout={onLayout}>
      {w > 0 && h > 0 && (
        <Svg
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          style={{ position: "absolute", top: 0, left: 0 }}
          pointerEvents="none"
        >
          <Path d={rails} stroke={color} strokeWidth={SW} fill="none" strokeLinecap="round" />
          <ChineseCorner color={color} size={CORNER} x={INSET} y={INSET} rotation={0} />
          <ChineseCorner color={color} size={CORNER} x={w - CORNER - INSET} y={INSET} rotation={90} />
          <ChineseCorner color={color} size={CORNER} x={w - CORNER - INSET} y={h - CORNER - INSET} rotation={180} />
          <ChineseCorner color={color} size={CORNER} x={INSET} y={h - CORNER - INSET} rotation={270} />
        </Svg>
      )}
      <View style={{ padding: GUTTER }}>{children}</View>
    </View>
  );
};
