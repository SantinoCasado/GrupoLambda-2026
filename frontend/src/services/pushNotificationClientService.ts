import { obtenerTokenPush, guardarTokenEnBackend } from "./pushNotificationsService";

/**
 * Registra el token push de este dispositivo contra el usuario autenticado.
 *
 * El envío de notificaciones lo resuelve exclusivamente el backend
 * (ver backend/src/services/pushNotifications.service.ts), que es quien conoce
 * al remitente real y los destinatarios correctos. Desde el cliente solo se
 * obtiene y persiste el token propio.
 */
export const registrarPushToken = async (_userId: string): Promise<string | null> => {
  try {
    const token = await obtenerTokenPush();
    if (!token) return null;

    const guardado = await guardarTokenEnBackend(token);
    return guardado ? token : null;
  } catch (error: any) {
    console.warn("⚠️ Error registrando el token push:", error?.message);
    return null;
  }
};
