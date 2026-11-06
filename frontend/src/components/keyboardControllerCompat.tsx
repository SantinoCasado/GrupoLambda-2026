import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from "react-native";
import type { ScrollViewProps, ViewProps } from "react-native";
import { isRunningInExpoGo } from "expo";

type ModuloTeclado = typeof import("react-native-keyboard-controller");

/**
 * `react-native-keyboard-controller` incluye un módulo nativo que no existe en
 * Expo Go. La app tiene que poder abrirse en Expo Go (iOS) y a la vez conservar
 * el comportamiento nativo en los development/standalone builds.
 *
 * Por eso el paquete se carga de forma diferida y únicamente fuera de Expo Go:
 * en Expo Go se usan fallbacks de React Native y el `require` nunca se evalúa.
 */
const moduloNativo: ModuloTeclado | null = (() => {
  if (isRunningInExpoGo()) return null;

  try {
    return require("react-native-keyboard-controller") as ModuloTeclado;
  } catch (error: any) {
    console.warn(
      "⚠️ [Teclado] react-native-keyboard-controller no disponible; se usa el fallback de React Native:",
      error?.message
    );
    return null;
  }
})();

interface ProviderProps {
  children: React.ReactNode;
}

export function KeyboardProvider({ children }: ProviderProps) {
  const Provider = moduloNativo?.KeyboardProvider;
  if (!Provider) return <>{children}</>;

  return <Provider>{children}</Provider>;
}

export interface KeyboardChatScrollViewProps extends ScrollViewProps {
  /** Distancia extra entre el fondo del scroll y el borde inferior de la pantalla. */
  offset?: number;
}

export const KeyboardChatScrollView = React.forwardRef<
  React.ComponentRef<typeof ScrollView>,
  KeyboardChatScrollViewProps
>(function KeyboardChatScrollView({ offset, ...props }, ref) {
  const Nativo = moduloNativo?.KeyboardChatScrollView;

  if (Nativo) {
    return <Nativo ref={ref} offset={offset} {...props} />;
  }

  // Expo Go: ScrollView estándar. En iOS, `automaticallyAdjustKeyboardInsets`
  // deja que el sistema ajuste el contenido cuando aparece el teclado.
  return (
    <ScrollView
      ref={ref}
      automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
      {...props}
    />
  );
});

export interface KeyboardStickyViewProps extends ViewProps {
  offset?: {
    closed?: number;
    opened?: number;
  };
  enabled?: boolean;
}

export const KeyboardStickyView = React.forwardRef<
  React.ComponentRef<typeof View>,
  KeyboardStickyViewProps
>(function KeyboardStickyView(
  { offset, enabled, children, style, ...props },
  ref
) {
  const Nativo = moduloNativo?.KeyboardStickyView;

  if (Nativo) {
    return (
      <Nativo
        ref={ref as any}
        offset={offset}
        enabled={enabled}
        style={style}
        {...props}
      >
        {children}
      </Nativo>
    );
  }

  // Expo Go: en iOS empujamos la barra con KeyboardAvoidingView; Android ya
  // redimensiona la pantalla por sí solo (adjustResize), así que basta un View.
  if (Platform.OS === "ios") {
    return (
      <KeyboardAvoidingView
        ref={ref as any}
        behavior="padding"
        style={style}
        {...props}
      >
        {children}
      </KeyboardAvoidingView>
    );
  }

  return (
    <View ref={ref} style={style} {...props}>
      {children}
    </View>
  );
});
