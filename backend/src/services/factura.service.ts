import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { supabase } from '../config/supabase';

const NOMBRE_RESTAURANTE = 'Jardín Imperial';
const DIRECCION_RESTAURANTE =
    'Av. Bartolomé Mitre 750, B1870 AAU, Provincia de Buenos Aires';

export interface ClienteFactura {
    first_name?: string | null;
    last_name?: string | null;
    dni?: string | null;
    email?: string | null;
    role?: string | null;
    push_token?: string | null;
}

export interface DetallePreciosFactura {
    precioBase: number;
    descuento: number;
    propina: number;
    precioFinal: number;
    porcentajePropina: number;
    porcentajeDescuento?: number;
}

export interface ItemFactura {
    quantity: number | string;
    unit_price: number | string;
    product?: { name?: string | null } | null;
}

export interface FacturaGenerada {
    url: string;
    buffer: Buffer;
    fileName: string;
}

const formatoMoneda = (monto: number) =>
    new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(monto);

const formatoFecha = (fecha: Date) =>
    new Intl.DateTimeFormat('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        dateStyle: 'short',
        timeStyle: 'short',
    }).format(fecha);

/** Número corto y legible derivado del ID del pedido (sin migración de DB). */
const numeroComprobante = (pedidoId: string) =>
    pedidoId.replace(/-/g, '').slice(0, 8).toUpperCase();

/**
 * Preferimos el logo horizontal del frontend (mejor proporción para el PDF).
 * Si el backend se despliega sin la carpeta del frontend, usamos el logo
 * público del bucket `assets`, que ya se utiliza en los emails.
 */
const obtenerLogoBuffer = async (): Promise<Buffer> => {
    const candidatos = [
        path.join(__dirname, '../../../frontend/assets/images/logo-name.png'),
        path.join(process.cwd(), '../frontend/assets/images/logo-name.png'),
        path.join(process.cwd(), 'frontend/assets/images/logo-name.png'),
    ];

    const logoLocal = candidatos.find((ruta) => fs.existsSync(ruta));
    if (logoLocal) {
        return fs.readFileSync(logoLocal);
    }

    const baseUrl = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
    if (!baseUrl) {
        throw new Error('Falta SUPABASE_URL para descargar el logo del comprobante.');
    }

    const logoUrl = `${baseUrl}/storage/v1/object/public/assets/logo.png`;
    const respuesta = await fetch(logoUrl);

    if (!respuesta.ok) {
        throw new Error(
            `No se pudo descargar el logo del comprobante (HTTP ${respuesta.status}).`
        );
    }

    return Buffer.from(await respuesta.arrayBuffer());
};

const construirPdf = (
    pedidoId: string,
    cliente: ClienteFactura,
    detallePrecios: DetallePreciosFactura,
    items: ItemFactura[],
    logoBuffer: Buffer
): Promise<Buffer> =>
    new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const buffers: Buffer[] = [];

            doc.on('data', (chunk: Buffer) => buffers.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            const anchoContenido = doc.page.width - 100;
            const margenDerecho = doc.page.width - 50;

            // ------------------------------------------------------------
            // Encabezado: logo, nombre y dirección
            // ------------------------------------------------------------
            // `openImage` existe en PDFKit pero no está tipado en @types/pdfkit.
            const logo = (doc as any).openImage(logoBuffer) as {
                width: number;
                height: number;
            };
            const anchoMaxLogo = 150;
            const altoMaxLogo = 60;
            const escalaLogo = Math.min(
                anchoMaxLogo / logo.width,
                altoMaxLogo / logo.height
            );
            const anchoLogo = logo.width * escalaLogo;
            const altoLogo = logo.height * escalaLogo;

            doc.image(logoBuffer, (doc.page.width - anchoLogo) / 2, 34, {
                width: anchoLogo,
                height: altoLogo,
            });
            doc.y = 34 + altoLogo + 12;

            doc.font('Helvetica-Bold')
                .fontSize(20)
                .fillColor('#780116')
                .text(NOMBRE_RESTAURANTE, 50, doc.y, {
                    width: anchoContenido,
                    align: 'center',
                });

            doc.font('Helvetica')
                .fontSize(10)
                .fillColor('#444444')
                .text(DIRECCION_RESTAURANTE, 50, doc.y + 2, {
                    width: anchoContenido,
                    align: 'center',
                });

            doc.moveDown(1);
            doc.moveTo(50, doc.y)
                .lineTo(margenDerecho, doc.y)
                .strokeColor('#D8572A')
                .lineWidth(1)
                .stroke();
            doc.moveDown(1);

            // ------------------------------------------------------------
            // Datos del comprobante
            // ------------------------------------------------------------
            const yComprobante = doc.y;
            doc.font('Helvetica-Bold')
                .fontSize(10)
                .fillColor('#222222')
                .text(`Comprobante N°: ${numeroComprobante(pedidoId)}`, 50, yComprobante);

            doc.font('Helvetica')
                .fontSize(10)
                .fillColor('#333333')
                .text(`Fecha: ${formatoFecha(new Date())}`, 300, yComprobante, {
                    width: margenDerecho - 300,
                    align: 'right',
                });

            doc.y = yComprobante + 18;
            doc.font('Helvetica')
                .fontSize(10)
                .fillColor('#333333')
                .text(`Pedido N°: ${pedidoId}`, 50, doc.y);

            // ------------------------------------------------------------
            // Datos del cliente
            // ------------------------------------------------------------
            const nombreCliente = [cliente.first_name, cliente.last_name]
                .filter(Boolean)
                .join(' ')
                .trim() || 'Cliente';

            doc.moveDown(0.8);
            doc.font('Helvetica-Bold')
                .fontSize(11)
                .fillColor('#780116')
                .text('Datos del cliente', 50, doc.y);
            doc.moveDown(0.25);
            doc.font('Helvetica').fontSize(10).fillColor('#333333');
            doc.text(`Cliente: ${nombreCliente}`, 50, doc.y);
            doc.text(`DNI: ${cliente.dni || 'N/A'}`, 50, doc.y + 1);

            // ------------------------------------------------------------
            // Detalle de ítems
            // ------------------------------------------------------------
            doc.moveDown(1);
            doc.font('Helvetica-Bold')
                .fontSize(11)
                .fillColor('#780116')
                .text('Detalle del pedido', 50, doc.y);
            doc.moveDown(0.4);

            const columnas = {
                cantidad: 50,
                descripcion: 90,
                unitario: 345,
                subtotal: 445,
            };
            const anchos = {
                cantidad: 35,
                descripcion: 245,
                unitario: 95,
                subtotal: 100,
            };

            const dibujarCabeceraItems = () => {
                const y = doc.y;
                doc.font('Helvetica-Bold').fontSize(9).fillColor('#666666');
                doc.text('Cant.', columnas.cantidad, y, { width: anchos.cantidad });
                doc.text('Descripción', columnas.descripcion, y, {
                    width: anchos.descripcion,
                });
                doc.text('P. Unit.', columnas.unitario, y, {
                    width: anchos.unitario,
                    align: 'right',
                });
                doc.text('Subtotal', columnas.subtotal, y, {
                    width: anchos.subtotal,
                    align: 'right',
                });
                doc.y = y + 14;
                doc.moveTo(50, doc.y)
                    .lineTo(margenDerecho, doc.y)
                    .strokeColor('#CCCCCC')
                    .lineWidth(0.5)
                    .stroke();
                doc.y += 5;
            };

            dibujarCabeceraItems();

            if (!items || items.length === 0) {
                doc.font('Helvetica').fontSize(9).fillColor('#555555');
                doc.text('Sin ítems registrados.', columnas.descripcion, doc.y, {
                    width: anchos.descripcion,
                });
                doc.y += 16;
            } else {
                items.forEach((item) => {
                    const cantidad = Number(item.quantity || 0);
                    const precioUnitario = Number(item.unit_price || 0);
                    const totalLinea = cantidad * precioUnitario;
                    const nombreProducto = item.product?.name || 'Producto sin nombre';

                    // Espacio para la fila y para las filas de totales.
                    if (doc.y + 40 > doc.page.height - 90) {
                        doc.addPage();
                        doc.y = 50;
                        dibujarCabeceraItems();
                    }

                    const yFila = doc.y;
                    doc.font('Helvetica').fontSize(9).fillColor('#222222');
                    doc.text(String(cantidad), columnas.cantidad, yFila, {
                        width: anchos.cantidad,
                    });
                    doc.text(nombreProducto, columnas.descripcion, yFila, {
                        width: anchos.descripcion,
                        ellipsis: true,
                        height: 12,
                    });
                    doc.text(formatoMoneda(precioUnitario), columnas.unitario, yFila, {
                        width: anchos.unitario,
                        align: 'right',
                    });
                    doc.text(formatoMoneda(totalLinea), columnas.subtotal, yFila, {
                        width: anchos.subtotal,
                        align: 'right',
                    });

                    doc.y = yFila + 15;
                    doc.moveTo(50, doc.y)
                        .lineTo(margenDerecho, doc.y)
                        .strokeColor('#EEEEEE')
                        .lineWidth(0.5)
                        .stroke();
                    doc.y += 3;
                });
            }

            // ------------------------------------------------------------
            // Totales
            // ------------------------------------------------------------
            if (doc.y + 150 > doc.page.height - 70) {
                doc.addPage();
                doc.y = 50;
            }

            doc.moveDown(0.6);
            const yTotales = doc.y;
            let filaActual = yTotales;

            const escribirFilaTotal = (
                etiqueta: string,
                valor: string,
                color: string = '#333333',
                negrita: boolean = false
            ) => {
                doc.font(negrita ? 'Helvetica-Bold' : 'Helvetica')
                    .fontSize(10)
                    .fillColor(color);
                doc.text(etiqueta, 300, filaActual, {
                    width: 140,
                    align: 'right',
                });
                doc.text(valor, columnas.subtotal, filaActual, {
                    width: anchos.subtotal,
                    align: 'right',
                });
                filaActual += 17;
            };

            escribirFilaTotal('Subtotal', formatoMoneda(detallePrecios.precioBase));

            if (detallePrecios.descuento > 0) {
                const porcentaje = detallePrecios.porcentajeDescuento || 0;
                const etiqueta = porcentaje > 0
                    ? `Descuento juegos (${porcentaje.toFixed(0)}%)`
                    : 'Descuento juegos';
                escribirFilaTotal(
                    etiqueta,
                    `-${formatoMoneda(detallePrecios.descuento)}`,
                    '#2E7D32',
                    true
                );
            }

            const etiquetaPropina = detallePrecios.porcentajePropina > 0
                ? `Propina (${detallePrecios.porcentajePropina}%)`
                : 'Propina';

            escribirFilaTotal(
                etiquetaPropina,
                `+${formatoMoneda(detallePrecios.propina)}`,
                '#B45309'
            );

            // Caja del TOTAL: grande y claramente destacada.
            doc.y = filaActual + 8;
            const yCajaTotal = doc.y;
            doc.rect(50, yCajaTotal, anchoContenido, 48).fill('#FFF3E0');
            doc.fillColor('#780116')
                .font('Helvetica-Bold')
                .fontSize(12)
                .text('TOTAL A ABONAR', 62, yCajaTotal + 17, { width: 180 });
            doc.font('Helvetica-Bold')
                .fontSize(22)
                .fillColor('#780116')
                .text(formatoMoneda(detallePrecios.precioFinal), 300, yCajaTotal + 12, {
                    width: margenDerecho - 312,
                    align: 'right',
                });

            // Pie de página
            doc.font('Helvetica')
                .fontSize(8)
                .fillColor('#777777')
                .text(
                    'Gracias por su visita. Conserve este comprobante.',
                    50,
                    doc.page.height - 70,
                    { width: anchoContenido, align: 'center' }
                );

            doc.end();
        } catch (error) {
            reject(error);
        }
    });

/**
 * Genera el comprobante en PDF, lo sube al bucket público `invoices` y
 * devuelve tanto la URL como el buffer (para adjuntarlo por email).
 */
export const generarYSubirFactura = async (
    pedidoId: string,
    cliente: ClienteFactura,
    detallePrecios: DetallePreciosFactura,
    items: ItemFactura[]
): Promise<FacturaGenerada> => {
    const logoBuffer = await obtenerLogoBuffer();
    const buffer = await construirPdf(
        pedidoId,
        cliente,
        detallePrecios,
        items,
        logoBuffer
    );
    const fileName = `recibo_${numeroComprobante(pedidoId)}_${Date.now()}.pdf`;

    const { error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(fileName, buffer, {
            contentType: 'application/pdf',
            upsert: false,
        });

    if (uploadError) {
        throw new Error(`No se pudo subir el comprobante: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
        .from('invoices')
        .getPublicUrl(fileName);

    if (!publicUrlData?.publicUrl) {
        throw new Error('No se pudo obtener la URL pública del comprobante.');
    }

    return {
        url: publicUrlData.publicUrl,
        buffer,
        fileName,
    };
};
