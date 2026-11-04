import React, { useEffect, useRef, useState } from "react";
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
import { ChineseFrame } from "../components/ChineseFrame";

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
  // Fase actual: el logo girando o los créditos del equipo.
  const [fase, setFase] = useState<"logo" | "equipo">("logo");
  // Opacidades para que el cambio de fase no sea un corte seco.
  const logoFade = useRef(new Animated.Value(1)).current;
  const equipoFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in inicial suave
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    // Giro continuo del logo (solo durante la primera fase)
    const animacionGiro = Animated.loop(
      Animated.timing(giroAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animacionGiro.start();

    // Fin de la fase 1: el logo sigue girando mientras se desvanece y recién
    // se detiene cuando termina el fade, justo antes de entrar el equipo.
    const timerLogo = setTimeout(() => {
      Animated.timing(logoFade, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(() => {
        animacionGiro.stop();
        setFase("equipo");
        Animated.timing(equipoFade, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }).start();
      });
    }, duracionMinimaMs);

    // Fin de la fase 2: salida limpia con fade out
    const timerFin = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    }, duracionMinimaMs * 2);

    return () => {
      clearTimeout(timerLogo);
      clearTimeout(timerFin);
      animacionGiro.stop();
    };
  }, []);

  const spin = giroAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Fondo + adornos, dentro del layer animable para que desvanecen juntos */}
      <Animated.View
        style={{
          flex: 1,
          opacity: fadeAnim,
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 16,
          paddingHorizontal: 24,
          justifyContent: "center",
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

        {fase === "logo" ? (
          /* Fase 1: logo girando + nombre (subido un poco) */
          <Animated.View
            style={{
              alignItems: "center",
              opacity: logoFade,
              transform: [{ translateY: -70 }],
            }}
          >
            <View
              style={{
                width: 155,
                height: 155,
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
              className="my-7 h-[150px] w-[350px]"
              resizeMode="contain"
            />
          </Animated.View>
        ) : (
          /* Fase 2: solo los créditos del equipo, sin animación */
          <Animated.View
            style={{ width: "100%", alignItems: "center", opacity: equipoFade }}
          >
            <Image
              source={require("../../assets/images/separator.png")}
              className="h-20 w-60 mb-2"
              resizeMode="contain"
            />

            {/* Ancho fijo + min-height: el marco necesita al menos
                2*CORNER + 2*INSET = 80 px de alto para que las esquinas
                no se superpongan y no debe shrink-wrappear al texto sin cortar. */}
            <View className="mb-10 w-[300px] max-w-full">
              <ChineseFrame
                className="w-full min-h-[108px]  py-5 bg-vino"
              >
                <View className="flex-1 items-center justify-center px-2">
                  <Text
                    style={{ fontFamily: "LaOriental" }}
                    className="text-center text-2xl uppercase tracking-widest text-mostaza font-black"
                  >
                    Equipo de Desarrollo
                  </Text>
                </View>
              </ChineseFrame>
            </View>

            {/* Tarjetas */}
            <View className="w-full gap-y-8">
              {INTEGRANTES.map((nombre) => (
                <View
                  key={nombre}
                  style={{
                    backgroundColor: "#FFF8EA",
                    borderColor: "rgba(212, 160, 23, 0.6)",
                    borderWidth: 1.5,
                    borderRadius: 16,
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                    <Image
                      source={require("../../assets/images/supervisor-c.png")}
                      style={{ width: 30, height: 30, marginRight: 14 }}
                      resizeMode="contain"
                    />
                    <Text className="text-lg font-black text-vino">
                      {nombre}
                    </Text>
                  </View>
                  <Text className="text-sm text-calabaza font-bold">UTN-FRA</Text>
                </View>
              ))}
            </View>

            <Image
              source={require("../../assets/images/separator.png")}
              className="mt-2 h-20 w-60"
              resizeMode="contain"
            />
          </Animated.View>
        )}

      </Animated.View>

      {/* Fase 1: ilustración decorativa centrada abajo.
          Se desvanece junto con el logo al cambiar de fase. */}
      {fase === "logo" && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: -100,
            alignItems: "center",
            opacity: fadeAnim,
          }}
        >
          <Animated.Image
            source={require("../../assets/splashFiller_2_3.png")}
            style={{ width: 400, height: 400, opacity: logoFade }}
            resizeMode="contain"
          />
        </Animated.View>
      )}

      {/* Pie fijo: visible en ambas fases */}
      <Animated.View
        pointerEvents="none"
        style={{
          opacity: fadeAnim,
          position: "absolute",
          bottom: insets.bottom + 16,
          left: 0,
          right: 0,
          alignItems: "center",
        }}
      >
        <Text
          className={`text-xl font-bold uppercase tracking-wider ${
            fase === "logo" ? "text-mostaza" : "text-stone-500"
          }`}
        >
          División A131 - 2026
        </Text>
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