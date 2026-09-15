import Constants from "expo-constants";

// Obtiene la IP del bundler de Expo de forma dinámica
const hostUri =
  Constants.expoConfig?.hostUri ??
  Constants.manifest2?.extra?.expoGo?.debuggerHost ??
  (Constants as any).manifest?.debuggerHost;

const localIp = hostUri ? hostUri.split(":")[0] : "localhost";

export const API_BASE_URL = `http://${localIp}:3000/api`;