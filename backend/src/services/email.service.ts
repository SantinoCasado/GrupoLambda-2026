import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const enviarNotificacionAprobacion = async (email: string, nombre: string, status: 'approved' | 'rejected') => {
    const asunto = status === 'approved' 
        ? '¡Tu cuenta ha sido aprobada! 🎉' 
        : 'Actualización sobre tu solicitud de cuenta';

    const contenidoHtml = status === 'approved'
        ? `<h2>Hola ${nombre}, ¡Bienvenido!</h2><p>Tu cuenta ha sido aprobada por la administración. Ya puedes ingresar a la app, ver el menú y realizar pedidos.</p>`
        : `<h2>Hola ${nombre}</h2><p>Lamentamos informarte que tu solicitud de cuenta no ha sido aprobada en esta ocasión por la administración.</p>`;

    const { data, error } = await resend.emails.send({
        from: 'Restaurante <no-reply@tudominio.com>', // Reemplazá tudominio.com por el tuyo verificado
        to: email,
        subject: asunto,
        html: contenidoHtml
    });

    if (error) {
        console.error(`Fallo al enviar el correo a ${email}:`, error);
    }
    
    return data;
};