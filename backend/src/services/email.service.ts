import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// Configurás la conexión a Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD // La contraseña de 16 letras de Google
    }
});

export const enviarNotificacionAprobacion = async (email: string, nombre: string, status: 'approved' | 'rejected') => {
    const esAprobado = status === 'approved';
    const asunto = esAprobado ? '¡Tu cuenta ha sido aprobada! 🎉' : 'Actualización sobre tu cuenta';

    const contenidoHtml = `
    <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                /* Importamos Shojumaru y Poppins desde Google Fonts */
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&family=Shojumaru&display=swap');
                
                body {
                    font-family: 'Poppins', Arial, sans-serif;
                    background-color: #f7fafc;
                    margin: 0;
                    padding: 0;
                }
                .container {
                    background-color: #ffffff;
                    padding: 30px;
                    color: #2d3748;
                    max-width: 600px;
                    margin: 30px auto;
                    border: 2px solid #780116; /* Rojo institucional */
                    border-radius: 12px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
                }
                .header {
                    text-align: center;
                    margin-bottom: 25px;
                    border-bottom: 2px solid #edf2f7;
                    padding-bottom: 20px;
                }
                .logo {
                    width: 130px;
                    height: auto;
                }
                h2 {
                    font-family: 'Shojumaru', cursive, serif; /* Fuente oriental institucional */
                    color: ${esAprobado ? '#780116' : '#D8572A'};
                    font-size: 22px;
                    margin-top: 0;
                    text-align: center;
                    letter-spacing: 1px;
                }
                p {
                    font-size: 15px;
                    line-height: 1.6;
                    color: #4a5568;
                }
                .footer {
                    font-size: 12px;
                    color: #718096;
                    border-top: 1px solid #e2e8f0;
                    padding-top: 15px;
                    margin-top: 25px;
                    text-align: center;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <img src="https://lxrgtjaqczpacjkvxnuw.supabase.co/storage/v1/object/public/assets/logo.png" alt="Logo Restaurante" class="logo" width="150" />
                </div>
                <h2>¡Hola, ${nombre}!</h2>
                <p>Te escribimos para informarte que el estado de tu cuenta ha sido actualizado a: <strong>${esAprobado ? 'Aprobado' : 'Rechazado'}</strong>.</p>
                ${esAprobado
                    ? '<p>Ya podés iniciar sesión en la aplicación para escanear tu mesa y disfrutar de la mejor experiencia y la mejor comida china.</p>'
                    : '<p>Lamentablemente, no hemos podido aprobar tu solicitud en esta ocasión. Te sugerimos intentar registrarte nuevamente verificando tus datos o acercarte a nuestro local.</p>'
                }
                <div class="footer">
                    Atentamente,<br><strong>El equipo de Restaurante Chino / Grupo Lambda</strong>
                </div>
            </div>
        </body>
        </html>
    `;
    try {
        console.log(`✉️ Intentando enviar mail a: "${email}" (longitud: ${email?.length})`);

        const info = await transporter.sendMail({
            from: `"Restaurante Chino" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: asunto,
            html: contenidoHtml
        });

        console.log(`✉️ Respuesta SMTP - messageId: ${info.messageId}, response: ${info.response}`);
        console.log(`✉️ Aceptado por: ${JSON.stringify(info.accepted)}, Rechazado: ${JSON.stringify(info.rejected)}`);

        if (info.rejected && info.rejected.length > 0) {
            console.error(`❌ El destinatario fue rechazado por el servidor: ${JSON.stringify(info.rejected)}`);
            return false;
        }

        return true; // <-- Devuelve true si todo salió bien
    } catch (error) {
        console.error('❌ Error enviando mail con Nodemailer:', error);
        return false; // <-- Devuelve false si falló
    }
};