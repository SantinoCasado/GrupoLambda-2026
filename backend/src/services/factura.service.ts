import PDFDocument from 'pdfkit';
import { supabase } from '../config/supabase';
import path from 'path';

export const generarYSubirFactura = async (
    pedidoId: string, 
    cliente: any, 
    detallePrecios: any,
    items: any[] 
): Promise<string> => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50 });
            const buffers: Buffer[] = [];
            
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', async () => {
                const pdfBuffer = Buffer.concat(buffers);
                const fileName = `factura_${pedidoId}_${Date.now()}.pdf`;
                
                const { error: uploadError } = await supabase.storage
                    .from('invoices')
                    .upload(fileName, pdfBuffer, { contentType: 'application/pdf' });

                // Usar reject en vez de throw adentro del callback
                if (uploadError) return reject(new Error(uploadError.message));

                const { data: publicUrlData } = supabase.storage
                    .from('invoices')
                    .getPublicUrl(fileName);

                resolve(publicUrlData.publicUrl);
            });

            try {
                const logoPath = path.join(__dirname, '../../../assets/logo.png'); 
                doc.image(logoPath, (doc.page.width - 100) / 2, doc.y, { width: 100 });
                doc.moveDown(0.5);
            } catch (err) {
                console.warn('⚠️ No se encontró el logo, renderizando sin imagen.');
            }

            doc.font('Helvetica-Bold').fontSize(20).text('Restaurante Imperial', { align: 'center' });
            doc.font('Helvetica').fontSize(10).text('Av. Siempre Viva 123, Buenos Aires', { align: 'center' });
            doc.moveDown(2);

            const partesId = pedidoId.split('-');
            const numeroFactura = (partesId[0] || pedidoId).toUpperCase();
            
            doc.fontSize(12).text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`);
            doc.text(`Factura N°: ${numeroFactura}`);
            doc.moveDown();

            // el DNI
            doc.text(`Cliente: ${cliente.first_name} ${cliente.last_name || ''} - DNI: ${cliente.dni || 'N/A'}`);
            doc.text(`Pedido N°: ${pedidoId}`);
            doc.moveDown();

            doc.font('Helvetica-Bold').fontSize(14).text('Detalle de Facturación:', { underline: true });
            doc.moveDown(0.5);
            doc.font('Helvetica').fontSize(12);

            // Listar ítems con precio unitario (Punto 21)
            if (items && items.length > 0) {
                items.forEach(item => {
                    const nombrePlato = item.product?.name || 'Producto sin nombre';
                    doc.text(`${item.quantity}x ${nombrePlato} - $${item.unit_price} c/u`); 
                });
                doc.moveDown();
            }

            doc.text(`Subtotal Comida: $${detallePrecios.precioBase}`);
            if (detallePrecios.descuento > 0) {
                doc.text(`Descuento (Juegos): -$${detallePrecios.descuento}`);
            }
            
            // Mostrar porcentaje de propina
            doc.text(`Propina (${detallePrecios.porcentajePropina}%): $${detallePrecios.propina}`);
            doc.moveDown();
            
            doc.font('Helvetica-Bold').fontSize(14).text(`TOTAL FINAL: $${detallePrecios.precioFinal}`);

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};