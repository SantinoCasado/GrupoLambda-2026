// src/components/CompanySpinner.tsx
import React, { useEffect, useRef } from "react";
import { View, Text, Animated, Easing, Image, Modal } from "react-native";

interface CompanySpinnerProps {
  mensaje?: string;
  visible?: boolean;
}

export function CompanySpinner({
  mensaje = "Procesando información...",
  visible = true,
}: CompanySpinnerProps) {
  const escalaAnimada = useRef(new Animated.Value(1)).current;
  const animacionRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!visible) return;

    const animacion = Animated.loop(
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
    );

    animacionRef.current = animacion;
    animacion.start();

    return () => {
      animacion.stop();
      animacionRef.current = null;
      escalaAnimada.stopAnimation();
      escalaAnimada.setValue(1);
    };
  }, [escalaAnimada, visible]);

  // Va después de los hooks. En Android cada Modal crea una ventana nativa
  // aunque visible={false}, así que no se monta si no hay nada que mostrar.
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View className="flex-1 items-center justify-center bg-black/50 px-8">
        <View className="items-center justify-center rounded-2xl border border-vino bg-[#FBE9DF] p-6">
          <Animated.View
            style={{ transform: [{ scale: escalaAnimada }] }}
            className="mb-3 h-24 w-24 items-center justify-center p-2"
          >
            <Image
              source={require("../../assets/logo.png")}
              className="h-full w-full"
              resizeMode="contain"
            />
          </Animated.View>
          <Text className="text-center text-sm font-bold tracking-wide text-vino">
            {mensaje}
          </Text>
        </View>
      </View>
    </Modal>
  );
}