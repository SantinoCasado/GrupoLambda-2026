import Constants from "expo-constants";

function getBaseUrl(): string {
  // Obtiene la IP local de la PC que sirve Expo (ej: 192.168.1.50)
  const hostUri = Constants.expoConfig?.hostUri;
  const ip = hostUri?.split(":")[0];

  if (ip) {
    return `http://${ip}:3000`;
  }

  return "http://localhost:3000";
}

export const API_URL = getBaseUrl();