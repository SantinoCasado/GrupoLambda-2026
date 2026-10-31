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
                /* Importamos Shojumaru, Cinzel y Poppins desde Google Fonts */
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&family=Shojumaru&family=Cinzel:wght@700&display=swap');
                
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
                    /* Verde si se aprueba, rojo institucional si se rechaza */
                    border: 2px solid ${esAprobado ? '#2E7D32' : '#780116'};
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
                    /* Aprobado: Cinzel en verde | Rechazado: Shojumaru (oriental) en rojo */
                    font-family: ${esAprobado ? "'Cinzel', Georgia, serif" : "'Shojumaru', cursive, serif"};
                    color: ${esAprobado ? '#2E7D32' : '#C62828'};
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

// ==========================================================================
// RESERVAS (puntos 24, 25 y 26)
// ==========================================================================

// Fecha legible en horario de Argentina, ej: "sábado, 7 de noviembre de 2026, 9:30 p. m."
const formatearFechaReserva = (fecha: string | Date): string =>
    new Date(fecha).toLocaleString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        dateStyle: 'full',
        timeStyle: 'short',
    });

// Mismo diseño institucional que el correo de aprobación/rechazo (puntos 7 y 8):
// aprobado con Cinzel en verde, rechazado con Shojumaru en rojo
const plantillaInstitucional = (titulo: string, tipo: 'aprobado' | 'rechazado', cuerpoHtml: string): string => `
    <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&family=Shojumaru&family=Cinzel:wght@700&display=swap');

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
                    /* Verde si se aprueba, rojo institucional si se rechaza */
                    border: 2px solid ${tipo === 'aprobado' ? '#2E7D32' : '#780116'};
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
                    font-family: ${tipo === 'aprobado' ? "'Cinzel', Georgia, serif" : "'Shojumaru', cursive, serif"};
                    color: ${tipo === 'aprobado' ? '#2E7D32' : '#C62828'};
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
                .detalle {
                    background-color: #FFF8EA;
                    border-left: 4px solid #DB7C26;
                    border-radius: 8px;
                    padding: 12px 18px;
                    margin: 20px 0;
                }
                .detalle p {
                    margin: 4px 0;
                    color: #2d3748;
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
                <h2>${titulo}</h2>
                ${cuerpoHtml}
                <div class="footer">
                    Atentamente,<br><strong>El equipo de Restaurante Chino / Grupo Lambda</strong>
                </div>
            </div>
        </body>
        </html>
    `;

const enviarCorreoBrevo = async (
    emailDestino: string,
    nombre: string,
    asunto: string,
    contenidoHtml: string
): Promise<boolean> => {
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
                to: [{ email: emailDestino, name: nombre }],
                subject: asunto,
                htmlContent: contenidoHtml
            })
        });

        if (!respuesta.ok) {
            const errorBody = await respuesta.json();
            throw new Error(`Fallo Brevo: ${JSON.stringify(errorBody)}`);
        }

        console.log(`✉️ Correo "${asunto}" enviado a: ${emailDestino}`);
        return true;
    } catch (error: any) {
        console.error(`❌ Error enviando el correo "${asunto}":`, error.message);
        return false;
    }
};

export const enviarReservaConfirmada = async (
    emailDestino: string,
    nombre: string,
    fechaReserva: string,
    numeroMesa: number,
    comensales: number
) => {
    const cuerpo = `
        <p>¡Tu reserva en Jardín Imperial fue <strong>confirmada</strong>! Te esperamos.</p>
        <div class="detalle">
            <p><strong>Fecha y hora:</strong> ${formatearFechaReserva(fechaReserva)}</p>
            <p><strong>Mesa:</strong> N° ${numeroMesa}</p>
            <p><strong>Comensales:</strong> ${comensales}</p>
        </div>
        <p>Al llegar, escaneá directamente el código QR de tu mesa: no hace falta anotarse en la lista de espera.</p>
        <p>Recordá que la mesa se mantiene reservada hasta 45 minutos después del horario indicado. Pasado ese tiempo, la reserva se cancela automáticamente.</p>
    `;

    return enviarCorreoBrevo(
        emailDestino,
        nombre,
        '¡Tu reserva fue confirmada! 🏮',
        plantillaInstitucional(`¡Hola, ${nombre}!`, 'aprobado', cuerpo)
    );
};

export const enviarReservaRechazada = async (
    emailDestino: string,
    nombre: string,
    fechaReserva: string,
    motivo: string
) => {
    const cuerpo = `
        <p>Lamentablemente, no pudimos confirmar tu reserva en Jardín Imperial.</p>
        <div class="detalle">
            <p><strong>Fecha y hora solicitada:</strong> ${formatearFechaReserva(fechaReserva)}</p>
            <p><strong>Motivo:</strong> ${motivo}</p>
        </div>
        <p>Podés solicitar una nueva reserva para otro día u horario desde la aplicación, o acercarte a nuestro local.</p>
    `;

    return enviarCorreoBrevo(
        emailDestino,
        nombre,
        'Actualización sobre tu reserva',
        plantillaInstitucional(`¡Hola, ${nombre}!`, 'rechazado', cuerpo)
    );
};