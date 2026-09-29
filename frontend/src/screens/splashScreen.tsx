import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Animated,
  Easing,
  Image,
  StyleSheet,
  StatusBar,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("screen");

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

      {/* Capa de fondo que cubre el 100% de la pantalla */}
      <View
        style={[
          styles.fondoPantallaCompleta,
          { backgroundColor: "#FFF6EC" },
        ]}
      />
      <Image
        source={require("../../assets/images/background-test-3.png")}
        style={styles.fondoPantallaCompleta}
        resizeMode="cover"
      />

      {/* Desvanece todo el contenido */}
      <Animated.View
        style={{
          flex: 1,
          opacity: fadeAnim,
          backgroundColor: "transparent",
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 16,
          paddingHorizontal: 24,
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View className="h-1" />

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
            source={require("../../assets/images/logo-name.png")}
            className="mt-4 h-14 w-60"
            resizeMode="contain"
          />

          <Text
            style={{ fontFamily: "LaOriental" }}
            className="text-base text-vino tracking-widest uppercase mt-1.5 font-bold"
          >
            Sabor Tradicional
          </Text>
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
                  backgroundColor: "rgba(255, 246, 236, 0.85)",
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
                  <Text style={{ fontSize: 16, marginRight: 12 }}>👤</Text>
                  <Text className="text-sm font-black text-vino">
                    {nombre}
                  </Text>
                </View>
                <Text className="text-xs text-mostaza font-bold">UTN-FRA</Text>
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
    backgroundColor: "#FFF6EC",
  },
  fondoPantallaCompleta: {
    position: "absolute",
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
});