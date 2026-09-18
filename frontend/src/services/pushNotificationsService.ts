// src/services/pushNotificationsService.ts
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { API_BASE_URL } from "./apiConfig";
import { headersConToken } from "./tokenService";

const PROJECT_ID = Constants.expoConfig?.extra?.eas?.projectId;

// Obtiene el Expo Push Token del dispositivo físico, solicitando permisos si hace falta
export async function obtenerTokenPush(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn("⏭️ [Push] Los tokens Expo solo se generan en dispositivos físicos.");
    return null;
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
  if (!token.startsWith("ExponentPushToken")) return false;

  try {
    const headers = await headersConToken({ "Content-Type": "application/json" });
    const respuesta = await fetch(`${API_BASE_URL}/clientes/push-token`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ pushToken: token }),
    });

    if (!respuesta.ok) {
      console.warn(
        `⚠️ [Push] El backend no guardó el token (HTTP ${respuesta.status}). Endpoint aún no disponible?`
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
export async function sincronizarPushAlIniciarSesion(): Promise<void> {
  try {
    const token = await obtenerTokenPush();
    if (token) {
      await guardarTokenEnBackend(token);
    }
  } catch (error: any) {
    console.warn("⚠️ [Push] Error en la sincronización de notificaciones:", error?.message);
  }
}