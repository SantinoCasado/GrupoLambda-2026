import Constants from "expo-constants";

// Obtiene la IP del debugger de Expo de forma automática
const hostUri = Constants.expoConfig?.hostUri;
const localIp = hostUri ? hostUri.split(":")[0] : "localhost";

export const API_BASE_URL = `http://${localIp}:3000/api`;