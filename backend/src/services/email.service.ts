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
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
            <div style="text-align: center; margin-bottom: 20px;">
                <img src="cid:logo_app" alt="Logo Restaurante" style="width: 120px; height: auto;" />
            </div>
            <h2 style="color: ${esAprobado ? '#780116' : '#D8572A'};">Hola ${nombre},</h2>
            <p>Te escribimos para informarte que el estado de tu cuenta ha sido actualizado a: <strong>${esAprobado ? 'Aprobado' : 'Rechazado'}</strong>.</p>
            ${esAprobado 
                ? '<p>Ya podés iniciar sesión en la aplicación para escanear tu mesa y disfrutar de la mejor comida china.</p>' 
                : '<p>No hemos podido verificar tu identidad con la foto proporcionada. Acercate al local o intentá registrarte nuevamente.</p>'
            }
            <br>
            <p style="font-size: 12px; color: #718096; border-top: 1px solid #e2e8f0; padding-top: 10px;">Atentamente,<br>El equipo de Grupo Lambda</p>
        </div>
    `;

    try {
        const info = await transporter.sendMail({
            from: `"Restaurante App" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: asunto,
            html: contenidoHtml,
            attachments: [
                {
                    filename: 'logo.png',
                    path: path.join(process.cwd(), '../assets/logo.png'), 
                    cid: 'logo_app' // Tiene que coincidir exactamente con el "src" del <img>
                }
            ]
        });
        return info;
    } catch (error) {
        console.error('Error enviando mail con Nodemailer:', error);
    }
};