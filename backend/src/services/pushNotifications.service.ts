interface PushMessage {
    to: string;
    sound: string;
    title: string;
    body: string;
    data?: Record<string, any>;
}

const ES_TOKEN_EXPO = /^ExponentPushToken\[[A-Za-z0-9_-]+\]$/;
const ES_TOKEN_EXPO_LEGACY = /^ExpoPushToken\[[A-Za-z0-9_-]+\]$/;

export const esTokenExpoValido = (token?: string | null): boolean =>
    !!token && (ES_TOKEN_EXPO.test(token) || ES_TOKEN_EXPO_LEGACY.test(token));

export const enviarPushNotification = async (
    tokenDispositivo: string,
    titulo: string,
    cuerpo: string,
    datosExtra?: Record<string, any>
): Promise<boolean> => {
    if (!tokenDispositivo) {
        console.warn('⚠️ Token de dispositivo ausente');
        return false;
    }

    if (tokenDispositivo.includes('expo-go')) {
        console.warn('⚠️ Se rechaza un token generado en Expo Go');
        return false;
    }

    if (!esTokenExpoValido(tokenDispositivo)) {
        console.warn(`⚠️ Formato de token inválido, no se envía: ${JSON.stringify(tokenDispositivo)}`);
        return false;
    }

    const mensaje: PushMessage = {
        to: tokenDispositivo,
        sound: 'default',
        title: titulo,
        body: cuerpo,
    };

    if (datosExtra) {
        mensaje.data = datosExtra;
    }

    try {
        const respuesta = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(mensaje),
        });

        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            console.error('❌ La API de Expo Push rechazó la notificación:', respuesta.status);
            return false;
        }

        const ticket = Array.isArray(resultado?.data) ? resultado.data[0] : undefined;
        if (!ticket || ticket.status === 'error') {
            console.error('❌ Expo Push no aceptó la notificación:', ticket?.message ?? 'respuesta sin ticket');
            return false;
        }

        console.log(`📲 Expo aceptó el envío (ticket ${ticket.id}). La entrega al dispositivo todavía no está confirmada.`);
        return true;
    } catch (error) {
        console.error('❌ Error al conectar con la API de Expo Push:', error);
        return false;
    }
};