import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const enviarNotificacionAprobacion = async (
    email: string, 
    nombre: string, 
    status: 'approved' | 'rejected'
) => {
    const esAprobado = status === 'approved';
    const asunto = esAprobado ? '¡Tu cuenta ha sido aprobada! 🎉' : 'Actualización sobre el estado de tu cuenta';

    // --- TIPOGRAFÍAS Y COLORES DIFERENCIADOS POR ESTADO ---
    const colorPrincipal = esAprobado ? '#16a34a' : '#c32f27'; // Verde para aprobado / Rojo para rechazado
    const colorBorde = esAprobado ? '#22c55e' : '#c32f27';
    const colorFondoBadge = esAprobado ? '#e8f5e9' : '#ffebee';
    const colorTextoBadge = esAprobado ? '#1b5e20' : '#c62828';

    // Tipografías distintas según la consigna
    // Aprobado: Shojumaru (Título oriental/festivo) + Poppins (Cuerpo moderno)
    // Rechazado: Cinzel (Título formal/sobrio) + Lato (Cuerpo institucional)
    const fuenteTitulo = esAprobado 
        ? "'Shojumaru', 'Georgia', serif" 
        : "'Cinzel', 'Times New Roman', serif";

    const fuenteCuerpo = esAprobado 
        ? "'Poppins', 'Helvetica Neue', Arial, sans-serif" 
        : "'Lato', 'Trebuchet MS', sans-serif";

    const contenidoHtml = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            /* Importación de ambas familias tipográficas */
            @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Lato:ital,wght@0,400;0,700&family=Poppins:wght@400;600&family=Shojumaru&display=swap');
            
            body {
                font-family: ${fuenteCuerpo};
                background-color: #f4f6f8;
                margin: 0;
                padding: 0;
                -webkit-text-size-adjust: 100%;
                -ms-text-size-adjust: 100%;
            }
            .container {
                background-color: #ffffff;
                padding: 35px;
                color: #2d3748;
                max-width: 600px;
                margin: 30px auto;
                border-top: 6px solid ${colorBorde};
                border-left: 1px solid #e2e8f0;
                border-right: 1px solid #e2e8f0;
                border-bottom: 1px solid #e2e8f0;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
            }
            .header {
                text-align: center;
                margin-bottom: 25px;
                border-bottom: 2px solid #edf2f7;
                padding-bottom: 20px;
            }
            .logo {
                width: 140px;
                height: auto;
            }
            h2 {
                font-family: ${fuenteTitulo};
                color: ${colorPrincipal};
                font-size: 24px;
                margin-top: 10px;
                margin-bottom: 15px;
                text-align: center;
                letter-spacing: 1px;
            }
            p {
                font-family: ${fuenteCuerpo};
                font-size: 15px;
                line-height: 1.7;
                color: #4a5568;
                margin-bottom: 15px;
            }
            .badge-estado {
                display: inline-block;
                background-color: ${colorFondoBadge};
                color: ${colorTextoBadge};
                font-weight: 700;
                padding: 6px 16px;
                border-radius: 20px;
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                border: 1px solid ${colorPrincipal};
                font-family: ${fuenteCuerpo};
            }
            .caja-mensaje {
                background-color: #f8fafc;
                border-left: 4px solid ${colorPrincipal};
                padding: 15px 20px;
                margin: 20px 0;
                border-radius: 4px;
            }
            .footer {
                font-family: ${fuenteCuerpo};
                font-size: 12px;
                color: #718096;
                border-top: 1px solid #e2e8f0;
                padding-top: 20px;
                margin-top: 30px;
                text-align: center;
                line-height: 1.5;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="https://lxrgtjaqczpacjkvxnuw.supabase.co/storage/v1/object/public/assets/logo.png" alt="Logo Jardín Imperial" class="logo" width="140" />
            </div>
            
            <h2>¡Hola, ${nombre}!</h2>
            
            <p>Te escribimos para informarte la actualización del estado de tu solicitud de registro:</p>
            
            <div style="text-align: center; margin: 20px 0;">
                <span class="badge-estado">${esAprobado ? '✓ Cuenta Aprobada' : '✕ Cuenta Rechazada'}</span>
            </div>

            <div class="caja-mensaje">
                ${esAprobado
                    ? '<p style="margin: 0;"><strong>¡Ya podés ingresar!</strong> Tu cuenta ha sido habilitada correctamente. Podés iniciar sesión en la aplicación, escanear tu mesa y disfrutar de nuestro menú.</p>'
                    : '<p style="margin: 0;">Lamentablemente no hemos podido aprobar tu registro en esta ocasión. Te sugerimos intentar registrarte nuevamente verificando tus datos personales o consultar directamente en nuestro local.</p>'
                }
            </div>

            <div class="footer">
                Atentamente,<br>
                <strong style="color: #2d3748;">El equipo de Jardín Imperial / Grupo Lambda</strong>
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

        console.log(`✉️ Correo de ${status} enviado por HTTP a: ${email}`);
        return true; 
    } catch (error: any) {
        console.error('❌ Error enviando mail de aprobación/rechazo:', error.message);
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
export const enviarCorreoInformativo = async (
  email: string,
  nombre: string,
  asunto: string,
  contenidoHtml: string
) => {
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
    console.error('❌ Error enviando mail por Brevo:', error.message);
    return false; 
  }
};