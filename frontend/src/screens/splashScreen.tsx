import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Animated,
  Easing,
  Image,
  StyleSheet,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ScreenBackground from "../components/ScreenBackground";

interface SplashScreenProps {
  onFinish: () => void;
  duracionMinimaMs?: number;
}

const INTEGRANTES = [
  "Rocío Sanchez",
  "Santino Casado",
  "Sebastián Andreozzi",
  "Valentín Brazanovich",
];

export function SplashScreen({
  onFinish,
  duracionMinimaMs = 1800,
}: SplashScreenProps) {
  const insets = useSafeAreaInsets();
  const giroAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in inicial suave
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    // Giro continuo del logo
    const animacionGiro = Animated.loop(
      Animated.timing(giroAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animacionGiro.start();

    // Salida limpia con fade out
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start(() => {
        animacionGiro.stop();
        onFinish();
      });
    }, duracionMinimaMs);

    return () => {
      clearTimeout(timer);
      animacionGiro.stop();
    };
  }, []);

  const spin = giroAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        translucent
        backgroundColor="transparent"
      />

      {/* Fondo + adornos, dentro del layer animable para que desvanecen juntos */}
      <Animated.View
        style={{
          flex: 1,
          opacity: fadeAnim,
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 16,
          paddingHorizontal: 24,
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <ScreenBackground />

        {/* Esferas ornamentales en las esquinas superiores */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: insets.top - 10,
            left: 10,
            width: 66,
            height: 132,
          }}
        >
          <Image
            source={require("../../assets/images/background-sphere.png")}
            style={{ width: "100%", height: "100%" }}
            resizeMode="contain"
          />
        </View>

        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: insets.top - 10,
            right: 10,
            width: 66,
            height: 132,
            transform: [{ scaleX: -1 }],
          }}
        >
          <Image
            source={require("../../assets/images/background-sphere.png")}
            style={{ width: "100%", height: "100%" }}
            resizeMode="contain"
          />
        </View>

        <View style={{ height: 110 }} />

        {/* Centro: Logo girando 1:1 + Nombre */}
        <View style={{ alignItems: "center" }}>
          <View
            style={{
              width: 145,
              height: 145,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Animated.Image
              source={require("../../assets/logo.png")}
              style={{
                width: 145,
                height: 145,
                transform: [{ rotate: spin }],
              }}
              resizeMode="contain"
            />
          </View>

          <Image
            source={require("../../assets/images/name.png")}
            className="my-7 h-20 w-60"
            resizeMode="contain"
          />
        </View>

        {/* Pie: Integrantes */}
        <View style={{ width: "100%", alignItems: "center" }}>
          <Image
            source={require("../../assets/images/separator.png")}
            className="h-20 w-60 mb-2"
            resizeMode="contain"
          />

          <Text
            style={{ fontFamily: "LaOriental" }}
            className="text-xs uppercase tracking-widest text-vino/80 font-black mb-2"
          >
            Equipo de Desarrollo
          </Text>

          {/* Tarjetas */}
          <View className="w-full gap-y-2">
            {INTEGRANTES.map((nombre) => (
              <View
                key={nombre}
                style={{
                  backgroundColor: "#FFF8EA",
                  borderColor: "rgba(212, 160, 23, 0.6)",
                  borderWidth: 1.5,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                  <Image
                    source={require("../../assets/images/supervisor-c.png")}
                    style={{ width: 24, height: 24, marginRight: 12 }}
                    resizeMode="contain"
                  />
                  <Text className="text-sm font-black text-vino">
                    {nombre}
                  </Text>
                </View>
                <Text className="text-xs text-calabaza font-bold">UTN-FRA</Text>
              </View>
            ))}
          </View>

          <Text className="mt-3 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
            División A131 - 2026
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FCE7CB",
  },
});