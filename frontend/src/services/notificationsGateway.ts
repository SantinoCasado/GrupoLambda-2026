// src/services/notificationsGateway.ts
import { Platform } from "react-native";
import { isRunningInExpoGo } from "expo";

type ModuloNotificaciones = typeof import("expo-notifications");

let cache: ModuloNotificaciones | null | undefined;

export function obtenerModuloNotificaciones(): ModuloNotificaciones | null {
  if (cache !== undefined) return cache;

  const bloqueado = isRunningInExpoGo() && Platform.OS === "android";
  if (bloqueado) {
    cache = null;
    console.warn(
      "⚠️ [Push] Notificaciones desactivadas: el push remoto no existe en Expo Go (Android). Usá un dev/standalone build para habilitarlo."
    );
    return null;
  }

  try {
    cache = require("expo-notifications") as ModuloNotificaciones;
  } catch (error: any) {
    cache = null;
    console.warn("⚠️ [Push] No se pudo inicializar expo-notifications:", error?.message);
  }
  return cache;
}