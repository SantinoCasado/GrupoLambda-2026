interface PushMessage {
    to: string;
    sound: string;
    title: string;
    body: string;
    data?: Record<string, any>;
}

export const enviarPushNotification = async (
    tokenDispositivo: string, 
    titulo: string, 
    cuerpo: string,
    datosExtra?: Record<string, any>
) => {
    // Verificamos que el token pertenezca al formato estándar de Expo
    if (!tokenDispositivo || !tokenDispositivo.startsWith('ExponentPushToken')) {
        console.warn('⚠️ Token de dispositivo inválido o ausente:', tokenDispositivo);
        return;
    }

    const mensaje: PushMessage = {
        to: tokenDispositivo,
        sound: 'default',
        title: titulo,
        body: cuerpo,
    };

    // Solo adjuntamos data si realmente viene con contenido para evitar choques de tipos
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
        console.log('📲 Notificación Push enviada mediante Expo:', resultado);
        return resultado;
    } catch (error) {
        console.error('❌ Error al conectar con la API de Expo Push:', error);
    }
};