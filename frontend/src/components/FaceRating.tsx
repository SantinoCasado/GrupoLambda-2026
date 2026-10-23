import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";

const CARITAS = [
  {
    etiqueta: "Muy mala",
    activa: require("../../assets/images/sad-face-y.png"),
    inactiva: require("../../assets/images/sad-face-v.png"),
  },
  {
    etiqueta: "Mala",
    activa: require("../../assets/images/neutral-face-y.png"),
    inactiva: require("../../assets/images/neutral-face-v.png"),
  },
  {
    etiqueta: "Regular",
    activa: require("../../assets/images/happy-face-y.png"),
    inactiva: require("../../assets/images/happy-face-v.png"),
  },
  {
    etiqueta: "Buena",
    activa: require("../../assets/images/extra-happy-face-y.png"),
    inactiva: require("../../assets/images/extra-happy-face-v.png"),
  },
  {
    etiqueta: "Excelente",
    activa: require("../../assets/images/mega-happy-face-y.png"),
    inactiva: require("../../assets/images/mega-happy-face-v.png"),
  },
];

interface FaceRatingProps {
  value: number;
  onChange: (value: number) => void;
}

/**
 * Selector de caritas (1 = muy mala … 5 = excelente).
 * Devuelve enteros de 1 a 5, igual que el resto de las calificaciones.
 */
export function FaceRating({ value, onChange }: FaceRatingProps) {
  const indiceActual = Math.min(CARITAS.length, Math.max(1, Math.round(value))) - 1;

  return (
    <View className="my-1">
      <View className="flex-row items-center justify-center gap-x-2">
        {CARITAS.map((carita, i) => {
          const seleccionada = i === indiceActual;
          return (
            <TouchableOpacity
              key={carita.etiqueta}
              onPress={() => onChange(i + 1)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: seleccionada }}
              accessibilityLabel={carita.etiqueta}
              className="items-center justify-center p-1"
              style={{ transform: [{ scale: seleccionada ? 1.08 : 1 }] }}
            >
              <Image
                source={seleccionada ? carita.activa : carita.inactiva}
                className="h-10 w-10"
                resizeMode="contain"
              />
            </TouchableOpacity>
          );
        })}
      </View>
      <Text className="mt-1 text-center text-xs text-stone-500">
        {CARITAS[indiceActual].etiqueta}
      </Text>
    </View>
  );
}
