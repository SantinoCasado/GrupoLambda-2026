// src/services/pushNotificationsService.ts
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { API_BASE_URL } from "../../apiConfig";
import { headersConToken, obtenerTokenValido } from "./tokenService";
import { obtenerModuloNotificaciones } from "./notificationsGateway";

const PROJECT_ID = Constants.expoConfig?.extra?.eas?.projectId;

// Obtiene el Expo Push Token del dispositivo físico, solicitando permisos si hace falta
export async function obtenerTokenPush(): Promise<string | null> {
  // En desarrollo se puede inyectar un token real (copiado desde un teléfono) para probar el flujo completo
  if (__DEV__ && process.env.EXPO_PUBLIC_TEST_PUSH_TOKEN) {
    console.log("🧪 [Push] Usando EXPO_PUBLIC_TEST_PUSH_TOKEN (modo desarrollo).");
    return process.env.EXPO_PUBLIC_TEST_PUSH_TOKEN;
  }

  const Notifications = obtenerModuloNotificaciones();
  if (!Notifications) {
    console.warn("⚠️ [Push] Notificaciones no disponibles en este entorno (Expo Go en Android).");
    return null;
  }

  const esSimulador = !Device.isDevice;

  // iOS simulator y web no pueden generar tokens de push remotos
  if (esSimulador && Platform.OS !== "android") {
    console.warn(
      "⏭️ [Push] iOS simulator y web no generan tokens de push remotos. Usá un dispositivo físico o un emulador Android."
    );
    return null;
  }

  // Los emuladores Android con Google Play Services sí pueden obtener un token FCM/Expo
  if (esSimulador && Platform.OS === "android") {
    console.log("🤖 [Push] Emulador Android detectado; se intentará obtener el token de Expo.");
  }

  const { status: estadoActual } = await Notifications.getPermissionsAsync();
  if (estadoActual !== "granted") {
    const { status: estadoSolicitado } = await Notifications.requestPermissionsAsync();
    if (estadoSolicitado !== "granted") {
      console.warn("💬 [Push] Permiso de notificaciones denegado.");
      return null;
    }
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Notificaciones",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#780116",
    });
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId: PROJECT_ID,
    });
    return token;
  } catch (error: any) {
    console.warn("⚠️ [Push] No se pudo obtener el token:", error?.message);
    return null;
  }
}

// Guarda el token en la columna push_token de la tabla users vía el backend
export async function guardarTokenEnBackend(token: string): Promise<boolean> {
  if (token.includes("expo-go")) return false;
  if (!token.startsWith("ExponentPushToken") && !token.startsWith("ExpoPushToken")) return false;

  // En el login local de demo no hay sesión de Supabase → el backend respondería 401
  const tokenSesion = await obtenerTokenValido();
  if (!tokenSesion) {
    console.warn(
      "⚠️ [Push] Sin sesión de Supabase activa (login local de demo), no se guarda el push token."
    );
    return false;
  }

  try {
    const headers = await headersConToken({ "Content-Type": "application/json" });
    const respuesta = await fetch(`${API_BASE_URL}/clientes/push-token`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ push_token: token }),
    });

    if (!respuesta.ok) {
      console.warn(
        `⚠️ [Push] El backend no guardó el token (HTTP ${respuesta.status}). Posible columna 'push_token' faltante en la tabla users: ALTER TABLE public.users ADD COLUMN IF NOT EXISTS push_token text;`
      );
      return false;
    }

    console.log("📲 [Push] Token registrado en el backend.");
    return true;
  } catch (error: any) {
    console.warn("⚠️ [Push] Error al guardar el token en el backend:", error?.message);
    return false;
  }
}

// Flujo completo para cuando el usuario inicia sesión (dueño, supervisor, personal)
export async function sincronizarPushAlIniciarSesion(): Promise<boolean> {
  try {
    const token = await obtenerTokenPush();
    if (!token) return false;
    return await guardarTokenEnBackend(token);
  } catch (error: any) {
    console.warn("⚠️ [Push] Error en la sincronización de notificaciones:", error?.message);
    return false;
  }
}