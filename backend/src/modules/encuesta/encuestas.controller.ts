import { Request, Response } from 'express';
import { guardarEncuestaService, obtenerEstadisticasService } from './encuestas.service';

export const enviarEncuesta = async (req: Request, res: Response): Promise<Response | void> => {
    const { order_id, calidad, amabilidad, limpieza, comentario } = req.body;

    if (!order_id) {
        return res.status(400).json({ error: 'Falta el ID del pedido (order_id) para registrar la estadía.' });
    }

    try {
        const encuesta = await guardarEncuestaService({ order_id, calidad, amabilidad, limpieza, comentario });
        return res.status(201).json({
            success: true,
            message: '¡Gracias por tu opinión!',
            data: encuesta
        });
    } catch (error: any) {
        // Acá atrapa el error si intenta votar dos veces
        return res.status(400).json({ error: error.message });
    }
};

export const obtenerGraficos = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const estadisticas = await obtenerEstadisticasService();
        return res.status(200).json({
            success: true,
            data: estadisticas
        });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};