import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const enviarNotificacionAprobacion = async (email: string, nombre: string, status: 'approved' | 'rejected') => {
    const esAprobado = status === 'approved';
    const asunto = esAprobado ? '¡Tu cuenta ha sido aprobada! 🎉' : 'Actualización sobre tu cuenta';

    // ¡Tu diseño HTML intacto!
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
        const respuesta = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': process.env.BREVO_API_KEY as string,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                sender: { 
                    name: "Jardín Imperial", 
                    email: process.env.GMAIL_USER as string
                },
                to: [{ email: email, name: nombre }],
                subject: asunto,
                htmlContent: contenidoHtml
            })
        });

        if (!respuesta.ok) {
            const errorBody = await respuesta.json();
            throw new Error(`Fallo Brevo: ${JSON.stringify(errorBody)}`);
        }

        console.log(`✉️ Correo enviado por HTTP a: ${email}`);
        return true; 
    } catch (error: any) {
        console.error('❌ Error enviando mail:', error.message);
        return false; 
    }
};

export const enviarFacturaPorEmail = async (
    emailDestino: string, 
    nombreCliente: string, 
    urlFactura: string
) => {
    const asunto = '🧾 Tu factura de Jardín Imperial';
    const contenidoHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #780116; text-align: center;">¡Gracias por tu visita, ${nombreCliente}!</h2>
            <p style="color: #333; font-size: 16px;">Esperamos que hayas disfrutado tu comida en Jardín Imperial.</p>
            <p style="color: #333; font-size: 16px;">Adjuntamos el enlace oficial para que puedas descargar el comprobante de tu pago:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${urlFactura}" style="background-color: #D8572A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px;">
                    📥 Descargar Factura PDF
                </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #777; font-size: 12px; text-align: center;">
                Si el botón no funciona, copiá y pegá este enlace en tu navegador:<br>
                <a href="${urlFactura}" style="color: #DB7C26;">${urlFactura}</a>
            </p>
        </div>
    `;

    try {
        const respuesta = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': process.env.BREVO_API_KEY as string,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                sender: { 
                    name: "Jardín Imperial", 
                    email: process.env.GMAIL_USER as string
                },
                to: [{ email: emailDestino, name: nombreCliente }],
                subject: asunto,
                htmlContent: contenidoHtml
            })
        });

        if (!respuesta.ok) {
            const errorBody = await respuesta.json();
            throw new Error(`Fallo Brevo: ${JSON.stringify(errorBody)}`);
        }

        console.log(`✉️ Factura enviada por HTTP (Brevo) a: ${emailDestino}`);
        return true; 
    } catch (error: any) {
        console.error('❌ Error enviando factura por mail:', error.message);
        return false; 
    }
};