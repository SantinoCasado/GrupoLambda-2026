import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, PanResponder, LayoutChangeEvent, Animated } from "react-native";
import * as Haptics from "expo-haptics";

const THUMB = 28;
const TRACK_H = 8;
// Cuánto hay que mover el dedo antes de considerar que es un arrastre
// y no un simple toque (así un tap no cambia la calificación).
const UMBRAL_ARRASTRE = 3;

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
 * El pulgar sigue al dedo de forma continua y el valor se ajusta por pasos.
 * Solo cambia con un arrastre: tocar la pista o los números no selecciona nada.
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
  const utilWidth = Math.max(0, trackWidth - THUMB);

  // Posición animada del pulgar en píxeles (0 .. utilWidth).
  const pos = useRef(new Animated.Value(0)).current;
  const posActualRef = useRef(0);
  const posInicialRef = useRef(0);
  const inicioXRef = useRef(0);
  const arrastrandoRef = useRef(false);
  const movidoRef = useRef(false);
  const inicializadoRef = useRef(false);

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

  // Sincroniza el pulgar con el valor cuando cambia desde afuera.
  useEffect(() => {
    if (arrastrandoRef.current) return;

    const destino = ((valorActual - min) / rango) * utilWidth;

    if (!inicializadoRef.current) {
      if (utilWidth <= 0) return;
      inicializadoRef.current = true;
      posActualRef.current = destino;
      pos.setValue(destino);
      return;
    }

    posActualRef.current = destino;
    Animated.timing(pos, {
      toValue: destino,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [valorActual, min, max, rango, utilWidth, pos]);

  const panResponder = useMemo(() => {
    const valorDesdePos = (px: number) => {
      const { min: mn, max: mx, width } = datosRef.current;
      if (width <= 0) return datosRef.current.value;

      const util = Math.max(1, width - THUMB);
      const proporcion = Math.min(1, Math.max(0, px / util));
      return mn + Math.round(proporcion * (mx - mn));
    };

    const emitirSiCambia = (px: number) => {
      const nuevo = valorDesdePos(px);
      if (nuevo !== datosRef.current.value) {
        datosRef.current.value = nuevo;
        datosRef.current.onChange(nuevo);
        Haptics.selectionAsync().catch(() => {});
      }
    };

    const acomodarPulgar = () => {
      arrastrandoRef.current = false;

      const { min: mn, max: mx, width } = datosRef.current;
      const util = Math.max(0, width - THUMB);
      const destino =
        util > 0 ? ((datosRef.current.value - mn) / Math.max(1, mx - mn)) * util : 0;

      posActualRef.current = destino;
      Animated.spring(pos, {
        toValue: destino,
        speed: 20,
        bounciness: 4,
        useNativeDriver: false,
      }).start();

      datosRef.current.onSlidingEnd?.();
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        arrastrandoRef.current = true;
        movidoRef.current = false;
        inicioXRef.current = evt.nativeEvent.locationX;
        posInicialRef.current = posActualRef.current;
        pos.stopAnimation((valorPos: number) => {
          posActualRef.current = valorPos;
          posInicialRef.current = valorPos;
        });
        datosRef.current.onSlidingStart?.();
      },
      onPanResponderMove: (_evt, gesture) => {
        if (!movidoRef.current) {
          if (Math.abs(gesture.dx) < UMBRAL_ARRASTRE) return;
          movidoRef.current = true;
        }

        const util = Math.max(0, datosRef.current.width - THUMB);
        const nueva = Math.min(util, Math.max(0, posInicialRef.current + gesture.dx));

        posActualRef.current = nueva;
        pos.setValue(nueva);
        emitirSiCambia(nueva);
      },
      onPanResponderRelease: acomodarPulgar,
      onPanResponderTerminate: acomodarPulgar,
    });
  }, [pos]);

  const alMedir = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    datosRef.current.width = width;
    setTrackWidth(width);
  };

  const pasos = Array.from({ length: rango + 1 }, (_, i) => min + i);

  const relleno = pos.interpolate({
    inputRange: [0, Math.max(1, utilWidth)],
    outputRange: [THUMB / 2, utilWidth + THUMB / 2],
    extrapolate: "clamp",
  });

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
        <View
          pointerEvents="none"
          className="w-full rounded-full bg-stone-200"
          style={{ height: TRACK_H }}
        />
        <Animated.View
          pointerEvents="none"
          className="absolute left-0 rounded-full bg-vino"
          style={{ height: TRACK_H, width: relleno }}
        />
        <Animated.View
          pointerEvents="none"
          className="absolute left-0 items-center justify-center rounded-full border-2 border-mostaza bg-vino"
          style={{ width: THUMB, height: THUMB, transform: [{ translateX: pos }] }}
        >
          <Text allowFontScaling={false} className="text-[11px] font-bold text-mostaza">
            {valorActual}
          </Text>
        </Animated.View>
      </View>

      {/* Escala de referencia (no seleccionable: hay que deslizar) */}
      <View className="relative mt-1" style={{ height: 20 }}>
        {pasos.map((paso) => {
          const r = (paso - min) / rango;
          const activo = paso === valorActual;
          return (
            <View
              key={paso}
              className="absolute items-center justify-center"
              style={{ left: r * utilWidth, width: THUMB, height: 20 }}
            >
              <Text
                allowFontScaling={false}
                className={`text-[10px] ${activo ? "font-bold text-vino" : "text-stone-400"}`}
              >
                {paso}
              </Text>
            </View>
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
