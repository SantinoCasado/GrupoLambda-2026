import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TouchableOpacity, PanResponder, LayoutChangeEvent } from "react-native";
import * as Haptics from "expo-haptics";

const THUMB = 28;
const TRACK_H = 8;

interface RatingSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  onSlidingStart?: () => void;
  onSlidingEnd?: () => void;
}

/**
 * Slider de calificación con paradas discretas (por defecto 1 a 5).
 * Implementado con PanResponder para no requerir módulos nativos.
 */
export function RatingSlider({
  value,
  onChange,
  min = 1,
  max = 5,
  onSlidingStart,
  onSlidingEnd,
}: RatingSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);

  const rango = Math.max(1, max - min);
  const valorActual = Math.min(max, Math.max(min, Math.round(value)));
  const ratio = (valorActual - min) / rango;

  // El PanResponder se crea una sola vez, así que guardamos los datos
  // "frescos" en una ref para evitar closures viejos.
  const datosRef = useRef({
    value: valorActual,
    min,
    max,
    width: 0,
    onChange,
    onSlidingStart,
    onSlidingEnd,
  });

  useEffect(() => {
    datosRef.current.value = valorActual;
    datosRef.current.min = min;
    datosRef.current.max = max;
    datosRef.current.onChange = onChange;
    datosRef.current.onSlidingStart = onSlidingStart;
    datosRef.current.onSlidingEnd = onSlidingEnd;
  });

  const inicioRef = useRef(0);

  const panResponder = useMemo(() => {
    const calcular = (x: number) => {
      const { width, min: mn, max: mx, onChange: emitir } = datosRef.current;
      if (width <= 0) return;

      const util = Math.max(1, width - THUMB);
      const proporcion = Math.min(1, Math.max(0, (x - THUMB / 2) / util));
      const nuevo = mn + Math.round(proporcion * (mx - mn));

      if (nuevo !== datosRef.current.value) {
        datosRef.current.value = nuevo;
        emitir(nuevo);
        Haptics.selectionAsync().catch(() => {});
      }
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        datosRef.current.onSlidingStart?.();
        inicioRef.current = evt.nativeEvent.locationX;
        calcular(inicioRef.current);
      },
      onPanResponderMove: (_evt, gesture) => {
        calcular(inicioRef.current + gesture.dx);
      },
      onPanResponderRelease: () => {
        datosRef.current.onSlidingEnd?.();
      },
      onPanResponderTerminate: () => {
        datosRef.current.onSlidingEnd?.();
      },
    });
  }, []);

  const utilWidth = Math.max(0, trackWidth - THUMB);
  const thumbLeft = ratio * utilWidth;
  const relleno = thumbLeft + THUMB / 2;

  const alMedir = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    datosRef.current.width = width;
    setTrackWidth(width);
  };

  const pasos = Array.from({ length: rango + 1 }, (_, i) => min + i);

  const mover = (nuevo: number) => {
    const acotado = Math.min(max, Math.max(min, nuevo));
    if (acotado !== valorActual) {
      onChange(acotado);
      Haptics.selectionAsync().catch(() => {});
    }
  };

  return (
    <View className="my-2">
      {/* Pista + pulgar */}
      <View
        onLayout={alMedir}
        {...panResponder.panHandlers}
        accessibilityRole="adjustable"
        accessibilityLabel="Calificación de comodidad"
        accessibilityValue={{ min, max, now: valorActual, text: `${valorActual} de ${max}` }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === "increment") mover(valorActual + 1);
          if (e.nativeEvent.actionName === "decrement") mover(valorActual - 1);
        }}
        style={{ height: THUMB }}
        className="w-full justify-center"
      >
        <View pointerEvents="none" className="w-full rounded-full bg-stone-200" style={{ height: TRACK_H }} />
        <View
          pointerEvents="none"
          className="absolute left-0 rounded-full bg-calabaza"
          style={{ height: TRACK_H, width: relleno }}
        />
        <View
          pointerEvents="none"
          className="absolute items-center justify-center rounded-full border-2 border-mostaza bg-vino"
          style={{ width: THUMB, height: THUMB, left: thumbLeft }}
        >
          <Text allowFontScaling={false} className="text-[11px] font-bold text-mostaza">
            {valorActual}
          </Text>
        </View>
      </View>

      {/* Paradas 1..5 */}
      <View className="relative mt-1" style={{ height: 20 }}>
        {pasos.map((paso) => {
          const r = (paso - min) / rango;
          const activo = paso === valorActual;
          return (
            <TouchableOpacity
              key={paso}
              onPress={() => mover(paso)}
              accessibilityRole="button"
              accessibilityLabel={`${paso} de ${max}`}
              className="absolute items-center justify-center"
              style={{ left: r * utilWidth, width: THUMB, height: 20 }}
            >
              <Text
                allowFontScaling={false}
                className={`text-[10px] ${activo ? "font-bold text-vino" : "text-stone-400"}`}
              >
                {paso}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View className="flex-row justify-between px-0.5">
        <Text className="text-[10px] text-stone-500">Malo</Text>
        <Text className="text-[10px] text-stone-500">Excelente</Text>
      </View>
    </View>
  );
}
