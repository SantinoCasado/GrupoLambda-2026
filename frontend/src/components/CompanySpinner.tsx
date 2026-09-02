// src/components/CompanySpinner.tsx
import React, { useEffect, useRef } from "react";
import { View, Text, Animated, Easing, Image } from "react-native";

interface CompanySpinnerProps {
  mensaje?: string;
}

export function CompanySpinner({ mensaje = "Procesando información..." }: CompanySpinnerProps) {
  const escalaAnimada = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(escalaAnimada, {
          toValue: 1.15,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(escalaAnimada, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [escalaAnimada]);

  return (
    <View className="items-center justify-center rounded-2xl border border-amber-600/40 bg-stone-800/95 p-6 shadow-lg">
      <Animated.View
        style={{ transform: [{ scale: escalaAnimada }] }}
        className="mb-3 h-24 w-24 items-center justify-center rounded-2xl border-2 border-amber-500 bg-amber-600/20 p-2"
      >
        <Image
          source={require("../../assets/logo.png")}
          className="h-full w-full"
          resizeMode="contain"
        />
      </Animated.View>
      <Text className="text-center text-sm font-bold tracking-wide text-terracota">
        {mensaje}
      </Text>
    </View>
  );
}