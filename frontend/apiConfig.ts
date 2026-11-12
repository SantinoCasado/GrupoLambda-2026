import Constants from "expo-constants";

// Primero el servidor desplegado (Render), si está configurado
const urlProduccion = process.env.EXPO_PUBLIC_API_URL;

// Obtiene la IP del bundler de Expo de forma dinámica
const hostUri =
  Constants.expoConfig?.hostUri ??
  Constants.manifest2?.extra?.expoGo?.debuggerHost ??
  (Constants as any).manifest?.debuggerHost;

const localIp = hostUri ? hostUri.split(":")[0] : "localhost";

export const API_BASE_URL = urlProduccion ?? `http://${localIp}:3000`;