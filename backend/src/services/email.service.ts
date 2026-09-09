import nodemailer from 'nodemailer';

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
            <h2 style="color: ${esAprobado ? '#2b6cb0' : '#c53030'};">Hola ${nombre},</h2>
            <p>Te escribimos para informarte que el estado de tu cuenta ha sido actualizado a: <strong>${esAprobado ? 'Aprobado' : 'Rechazado'}</strong>.</p>
            ${esAprobado 
                ? '<p>Ya podés iniciar sesión en la plataforma y disfrutar de todas las funcionalidades.</p>' 
                : '<p>Si tenés alguna duda sobre esta decisión, por favor ponete en contacto con nuestro soporte.</p>'
            }
            <br>
            <p style="font-size: 12px; color: #718096; border-top: 1px solid #e2e8f0; padding-top: 10px;">Atentamente,<br>El equipo de desarrollo</p>
        </div>
    `;

    try {
        const info = await transporter.sendMail({
            from: `"Restaurante App" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: asunto,
            html: contenidoHtml
        });
        return info;
    } catch (error) {
        console.error('Error enviando mail con Nodemailer:', error);
    }
};