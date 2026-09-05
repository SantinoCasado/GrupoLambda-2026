import { Request, Response } from 'express';
// import { guardarPedido } from './pedidos.service';

export const crearPedido = async (req: Request, res: Response) => {
    // Extraemos los datos del JSON que mandan desde la aplicación móvil
    const { id_cliente, numero_mesa, productos } = req.body;

    try {
        // Delegacion el trabajo pesado al Service (guardar en DB, calcular tiempos)
        
        // Devuelve la respuesta simulada al frontend
        res.status(201).json({
            mensaje: `Pedido para la mesa ${numero_mesa} recibido. Esperando aprobación del mozo.`,
            status: 'OK'
        });
    } catch (error) {
        res.status(500).json({ error: 'Fallo al procesar el pedido en el servidor' });
    }
};