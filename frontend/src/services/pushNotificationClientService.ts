import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";
import { supabase } from "../config/supabase";

// Detección estricta de Expo Go
const esExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  (Constants as any).appOwnership === "expo";

// Importación condicional o segura de expo-notifications
let Notifications: any = null;
try {
  Notifications = require("expo-notifications");
  if (Notifications && !esExpoGo) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
} catch (e) {
  console.log("ℹ️ expo-notifications no disponible en este entorno");
}

/**
 * Dispara una notificación visible (si estamos en standalone) o loguea en Expo Go
 */
export const dispararNotificacionLocal = async (
  titulo: string,
  cuerpo: string,
  datosExtra?: Record<string, any>
) => {
  if (esExpoGo) {
    console.log(`🔔 [NOTIFICACIÓN EXPO GO] ${titulo}: ${cuerpo}`, datosExtra || "");
    return;
  }

  try {
    if (Notifications?.scheduleNotificationAsync) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: titulo,
          body: cuerpo,
          data: datosExtra || {},
          sound: true,
        },
        trigger: null,
      });
    }
  } catch (err: any) {
    console.warn("⚠️ No se pudo disparar notificación:", err.message);
  }
};

/**
 * Registra el token del dispositivo de forma 100% segura contra crasheos de Expo Go
 */
export const registrarPushToken = async (userId: string): Promise<string | null> => {
  // En Expo Go evitamos getExpoPushTokenAsync para no disparar el error fatal de runtime
  if (esExpoGo) {
    const mockToken = `ExponentPushToken[expo-go-${userId.substring(0, 8)}]`;
    console.log("ℹ️ Entorno Expo Go detectado. Asignando token simulado seguro:", mockToken);
    
    try {
      await supabase
        .from("users")
        .update({ push_token: mockToken })
        .eq("id", userId);
    } catch (e: any) {
      console.warn("Error guardando mock token:", e.message);
    }
    return mockToken;
  }

  // Si es Development Build o Standalone (EAS Build):
  try {
    if (!Notifications) return null;

    const { status: statusExistente } = await Notifications.getPermissionsAsync();
    let statusFinal = statusExistente;

    if (statusExistente !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      statusFinal = status;
    }

    if (statusFinal !== "granted") {
      console.log("ℹ️ Permisos de notificación no concedidos.");
      return null;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#800020",
      });
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const pushToken = tokenData.data;

    if (pushToken) {
      await supabase
        .from("users")
        .update({ push_token: pushToken })
        .eq("id", userId);
    }

    return pushToken;
  } catch (err: any) {
    console.warn("⚠️ Error registrando token nativo:", err.message);
    return null;
  }
};

/**
 * Notifica a los mozos
 */
export const notificarMozos = async (
  titulo: string,
  cuerpo: string,
  datosExtra?: Record<string, any>
) => {
  await dispararNotificacionLocal(titulo, cuerpo, datosExtra);

  // Intentar envío HTTP a la API de Expo Push si hay tokens reales en la BD
  try {
    const { data: mozos } = await supabase
      .from("users")
      .select("push_token")
      .eq("role", "mozo")
      .not("push_token", "is", null);

    if (mozos && mozos.length > 0) {
      for (const m of mozos) {
        if (m.push_token && !m.push_token.includes("expo-go")) {
          await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              to: m.push_token,
              sound: "default",
              title: titulo,
              body: cuerpo,
              data: datosExtra || {},
            }),
          });
        }
      }
    }
  } catch (err: any) {
    console.warn("⚠️ Error en envío a mozos:", err.message);
  }
};

/**
 * Notifica a un cliente
 */
export const notificarCliente = async (
  clienteId: string,
  titulo: string,
  cuerpo: string,
  datosExtra?: Record<string, any>
) => {
  await dispararNotificacionLocal(titulo, cuerpo, datosExtra);

  try {
    const { data: cliente } = await supabase
      .from("users")
      .select("push_token")
      .eq("id", clienteId)
      .maybeSingle();

    if (cliente?.push_token && !cliente.push_token.includes("expo-go")) {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: cliente.push_token,
          sound: "default",
          title: titulo,
          body: cuerpo,
          data: datosExtra || {},
        }),
      });
    }
  } catch (err: any) {
    console.warn("⚠️ Error en envío a cliente:", err.message);
  }
};

// import * as Notifications from "expo-notifications";
// import * as Device from "expo-device";
// import { Platform } from "react-native";
// import { supabase } from "../config/supabase";

// // Configuración de visualización de notificaciones cuando la app está en primer plano
// Notifications.setNotificationHandler({
//   handleNotification: async () => ({
//     shouldShowAlert: true,
//     shouldPlaySound: true,
//     shouldSetBadge: false,
//     shouldShowBanner: true,
//     shouldShowList: true,
//   }),
// });

// /**
//  * Registra el token de Expo Push del dispositivo en la tabla users
//  */
// export const registrarPushToken = async (userId: string) => {
//   if (!Device.isDevice) {
//     console.log("ℹ️ Las notificaciones push requieren un dispositivo físico.");
//     return null;
//   }

//   try {
//     const { status: statusExistente } = await Notifications.getPermissionsAsync();
//     let statusFinal = statusExistente;

//     if (statusExistente !== "granted") {
//       const { status } = await Notifications.requestPermissionsAsync();
//       statusFinal = status;
//     }

//     if (statusFinal !== "granted") {
//       console.warn("⚠️ Permiso de notificaciones push denegado.");
//       return null;
//     }

//     const tokenData = await Notifications.getExpoPushTokenAsync();
//     const pushToken = tokenData.data;

//     if (Platform.OS === "android") {
//       Notifications.setNotificationChannelAsync("default", {
//         name: "default",
//         importance: Notifications.AndroidImportance.MAX,
//         vibrationPattern: [0, 250, 250, 250],
//         lightColor: "#800020",
//       });
//     }

//     // Actualiza el token en la base de datos
//     await supabase
//       .from("users")
//       .update({ push_token: pushToken })
//       .eq("id", userId);

//     return pushToken;
//   } catch (err: any) {
//     console.warn("⚠️ Error registrando token de notificaciones:", err.message);
//     return null;
//   }
// };

// /**
//  * Envío HTTP a la API de Expo Push
//  */
// export const enviarPushDirecto = async (
//   expoToken: string,
//   titulo: string,
//   cuerpo: string,
//   datosExtra?: Record<string, any>
// ) => {
//   if (!expoToken || !expoToken.startsWith("ExponentPushToken")) return;

//   try {
//     await fetch("https://exp.host/--/api/v2/push/send", {
//       method: "POST",
//       headers: {
//         Accept: "application/json",
//         "Accept-encoding": "gzip, deflate",
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         to: expoToken,
//         sound: "default",
//         title: titulo,
//         body: cuerpo,
//         data: datosExtra || {},
//       }),
//     });
//   } catch (err: any) {
//     console.warn("⚠️ Error al despachar push desde frontend:", err.message);
//   }
// };

// /**
//  * Notifica a todos los mozos
//  */
// export const notificarMozos = async (
//   titulo: string,
//   cuerpo: string,
//   datosExtra?: Record<string, any>
// ) => {
//   try {
//     const { data: mozos } = await supabase
//       .from("users")
//       .select("push_token")
//       .eq("role", "mozo")
//       .not("push_token", "is", null);

//     if (!mozos || mozos.length === 0) return;

//     for (const mozo of mozos) {
//       if (mozo.push_token) {
//         await enviarPushDirecto(mozo.push_token, titulo, cuerpo, datosExtra);
//       }
//     }
//   } catch (err: any) {
//     console.warn("⚠️ Error al notificar a los mozos:", err.message);
//   }
// };

// /**
//  * Notifica a un cliente en particular
//  */
// export const notificarCliente = async (
//   clienteId: string,
//   titulo: string,
//   cuerpo: string,
//   datosExtra?: Record<string, any>
// ) => {
//   try {
//     const { data: cliente } = await supabase
//       .from("users")
//       .select("push_token")
//       .eq("id", clienteId)
//       .maybeSingle();

//     if (cliente?.push_token) {
//       await enviarPushDirecto(cliente.push_token, titulo, cuerpo, datosExtra);
//     }
//   } catch (err: any) {
//     console.warn("⚠️ Error al notificar cliente:", err.message);
//   }
// };