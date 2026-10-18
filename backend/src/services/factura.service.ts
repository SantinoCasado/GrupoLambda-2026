import PDFDocument from 'pdfkit';
import { supabase } from '../config/supabase';
import path from 'path';

export const generarYSubirFactura = async (
    pedidoId: string, 
    cliente: any, 
    detallePrecios: any
): Promise<string> => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50 });
            const buffers: Buffer[] = [];
            
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', async () => {
                const pdfBuffer = Buffer.concat(buffers);
                
                // Subir a Supabase Storage
                const fileName = `factura_${pedidoId}_${Date.now()}.pdf`;
                const { error: uploadError } = await supabase.storage
                    .from('invoices')
                    .upload(fileName, pdfBuffer, { contentType: 'application/pdf' });

                if (uploadError) throw new Error(uploadError.message);

                // Obtener URL pública
                const { data: publicUrlData } = supabase.storage
                    .from('invoices')
                    .getPublicUrl(fileName);

                resolve(publicUrlData.publicUrl);
            });

            // --- DISEÑO DEL PDF ---
            // Nombre, Logo (Texto alusivo) y Dirección
            try {
                // ruta absoluta al PNG del logo
                const logoPath = path.join(__dirname, '../../../assets/logo.png'); 
                
                // Centrado la imagen calculando la mitad de la página menos la mitad del ancho de la imagen
                doc.image(logoPath, (doc.page.width - 100) / 2, doc.y, { width: 100 });
                doc.moveDown(0.5); // Espacio debajo del logo
            } catch (err) {
                // Si por algún motivo no encuentra el archivo, no rompe el PDF, solo avisa en consola
                console.warn('⚠️ No se encontró el logo en assets, renderizando sin imagen.');
            }
            doc.fontSize(20).text('Jardin Imperial', { align: 'center' });
            doc.fontSize(10).text('Av. no entendo 123, Buenos Aires', { align: 'center' });
            doc.moveDown();

            // Fecha y úmero de Factura
            doc.fontSize(12).text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`);
            // Guardado de las partes en un array y le asigna un valor por defecto (||) a la posición 0
            const partesId = pedidoId.split('-');
            const numeroFactura = (partesId[0] || pedidoId).toUpperCase();
            doc.text(`Factura N°: ${numeroFactura}`);
            doc.moveDown();

            // Datos del Cliente y Número de Pedido
            doc.text(`Cliente: ${cliente.first_name} ${cliente.last_name || ''}`);
            doc.text(`Pedido N°: ${pedidoId}`);
            doc.moveDown();

            // Detalle de lo facturado
            doc.fontSize(14).text('Detalle de Facturación:', { underline: true });
            doc.moveDown(0.5);
            doc.fontSize(12);
            doc.text(`Subtotal Comida: $${detallePrecios.precioBase}`);
            if (detallePrecios.descuento > 0) {
                doc.text(`Descuento (Juegos): -$${detallePrecios.descuento}`);
            }
            doc.text(`Propina: $${detallePrecios.propina}`);
            doc.moveDown();
            doc.font('Helvetica-Bold')
                .fontSize(14)
                .text(`TOTAL FINAL: $${detallePrecios.precioFinal}`);
            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};