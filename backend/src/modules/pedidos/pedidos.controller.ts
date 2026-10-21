import { Request, Response } from 'express';
import { 
  guardarPedido, 
  obtenerEstadoPedido, 
  confirmarPedidoPorMozo, 
  obtenerPedidosPendientesBar, 
  obtenerPedidosPendientesCocina, 
  modificarPedidoRechazado, 
  marcarItemComoListoService, 
  confirmarRecepcionClienteService, 
  entregarPedidoMozoService,
  cobrarPedidoService,
  solicitarCuentaService,
  obtenerResumenPreciosService
} from './pedidos.service';
import { crearPedidoSchema, confirmarPedidoSchema } from './schema/pedidos.schema';
import { AuthRequest } from '../../middleware/auth.middleware'
import { supabase } from '../../config/supabase';

export const crearPedido = async (req: Request, res: Response) => {
  const validacion = crearPedidoSchema.safeParse(req.body);
  if (!validacion.success) {
    return res.status(400).json({
      error: 'Datos inválidos para crear el pedido',
      detalles: validacion.error.format(),
    });
  }

  const { id_cliente, numero_mesa, productos, order_type } = validacion.data;

  try {
    const resultado = await guardarPedido(id_cliente, numero_mesa, productos, order_type);

    return res.status(201).json({
      mensaje: `Pedido para la mesa ${numero_mesa} recibido. Esperando aprobación del mozo.`,
      status: 'OK',
      data: resultado,
    });
  } catch (error: any) {
    console.error('[PedidosController Error]:', error);
    return res.status(500).json({
      error: 'Fallo al procesar el pedido en el servidor.',
      detalle: error.message,
    });
  }
};

export const verEstadoPedido = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'El ID del pedido es requerido' });
  }

  try {
    const pedido = await obtenerEstadoPedido(id);
    return res.status(200).json({ status: 'OK', data: pedido });
  } catch (error: any) {
    return res.status(404).json({
      error: 'Pedido no encontrado.',
      detalle: error.message,
    });
  }
};

export const confirmarPedido = async (req: Request, res: Response) => {
  const { id } = req.params;

  const validacion = confirmarPedidoSchema.safeParse(req.body);
  if (!validacion.success) {
    return res.status(400).json({
      error: 'Datos inválidos para confirmar el pedido.',
      detalles: validacion.error.format(),
    });
  }

  const { waiter_id, estado, rejection_reason } = validacion.data;

  try {
    const resultado = await confirmarPedidoPorMozo(id as string, waiter_id, estado, rejection_reason);
    return res.status(200).json({
      mensaje: `Pedido ${id} actualizado con éxito a '${estado}'`,
      status: 'OK',
      data: resultado,
    });
  } catch (error: any) {
    return res.status(400).json({
      error: 'No se pudo confirmar el pedido.',
      detalle: error.message,
    });
  }
};

// Punto 13: Cliente modifica pedido rechazado
export const modificarPedido = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { productos } = req.body;

    if (!productos || !Array.isArray(productos) || productos.length === 0) {
      return res.status(400).json({
        error: 'Debe incluir al menos un producto para modificar el pedido',
      });
    }

    const resultado = await modificarPedidoRechazado(
      id as string,
      productos,
      req.user!.id
    );

    return res.status(200).json({
      status: 'OK',
      mensaje: 'Pedido modificado y reenviado a aprobación',
      data: resultado,
    });
  } catch (error: any) {
    const esPermiso = error.message?.includes('permiso');
    const noExiste = error.message?.includes('no existe');
    const estadoInvalido = error.message?.includes('rechazados/cancelados');

    const status = esPermiso ? 403 : noExiste || estadoInvalido ? 409 : 500;

    return res.status(status).json({
      error: esPermiso
        ? 'No tenés permiso para modificar este pedido'
        : 'Error al modificar el pedido',
      detalle: error.message,
    });
  }
};

// Punto 16: Listar pedidos pendientes para Cocina
export const listarPedidosCocina = async (_req: Request, res: Response) => {
  try {
    const pedidos = await obtenerPedidosPendientesCocina();
    return res.status(200).json({
      status: 'OK',
      data: pedidos,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Fallo al obtener pedidos de cocina.',
      detalle: error.message,
    });
  }
};

// Punto 17: Listar pedidos pendientes para Bar
export const listarPedidosBar = async (_req: Request, res: Response) => {
  try {
    const pedidos = await obtenerPedidosPendientesBar();
    return res.status(200).json({
      status: 'OK',
      data: pedidos,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Fallo al obtener pedidos de bar.',
      detalle: error.message,
    });
  }
};

// Punto 18 marcar items del pedido como listos
export const marcarItemListo = async (req: AuthRequest, res: Response): Promise<Response | void> => {
    const item_id = req.params.item_id as string;

    if (!item_id) {
        return res.status(400).json({ error: 'Falta el ID del ítem (item_id)' });
    }

    try {
        const resultado = await marcarItemComoListoService(item_id);

        return res.status(200).json({
            success: true,
            ...resultado
        });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};

// Controlador para el Mozo
export const marcarPedidoComoEntregado = async (req: Request, res: Response): Promise<Response | void> => {
    const idPedido = req.params.id as string;

    try {
        const pedido = await entregarPedidoMozoService(idPedido);
        return res.status(200).json({
            success: true,
            message: 'Pedido marcado como entregado en la mesa.',
            data: pedido
        });
    } catch (error: any) {
        return res.status(400).json({ error: error.message });
    }
};

// Controlador para el Cliente
export const confirmarRecepcionPedido = async (req: Request, res: Response): Promise<Response | void> => {
    const idPedido = req.params.id as string;

    try {
        const pedido = await confirmarRecepcionClienteService(idPedido);
        return res.status(200).json({
            success: true,
            message: 'Recepción confirmada. ¡A disfrutar la comida!',
            data: pedido
        });
    } catch (error: any) {
        return res.status(400).json({ error: error.message });
    }
};

export const solicitarCuenta = async (req: Request, res: Response): Promise<Response | void> => {
    const id = req.params.id as string;

    if (!id) {
        return res.status(400).json({ error: 'Falta el ID del pedido.' });
    }

    try {
        const pedidoActualizado = await solicitarCuentaService(id);
        
        return res.status(200).json({
            success: true,
            message: 'Cuenta solicitada correctamente. Un mozo se acercará en breve.',
            data: pedidoActualizado
        });
    } catch (error: any) {
        return res.status(400).json({ error: error.message });
    }
};

export const cobrarPedido = async (req: Request, res: Response): Promise<Response | void> => {
    const { pedido_id, propina } = req.body;

    if (!pedido_id) {
        return res.status(400).json({ error: 'Falta el ID del pedido.' });
    }

    // Obliga a que manden propina (incluso si escanean el QR de 0%)
    if (propina === undefined || propina === null) {
        return res.status(400).json({ error: 'Falta escanear el QR de propina.' });
    }

    try {
        const porcentaje = Number(propina); 
        const ticket = await cobrarPedidoService(pedido_id, porcentaje);

        return res.status(200).json({
            success: true,
            message: 'Cobro exitoso. Mesa liberada.',
            data: ticket
        });
    } catch (error: any) {
        return res.status(400).json({ error: error.message });
    }
};

export const obtenerResumenPrecios = async (req: Request, res: Response) => {
  try {
      const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: 'Falta el ID del pedido.' });
        }

        const resumen = await obtenerResumenPreciosService(id as string);

        return res.status(200).json({
            success: true,
            data: resumen
        });
    } catch (error: any) {
        return res.status(400).json({ error: error.message });
    }
};

// ===========================================
// FUNCION EXCLUSIVA PARA TESTS: BORRAR TODO EL PEDIDO
// ===========================================
export const eliminarPedido = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('orders')
            .delete()
            .eq('id', id)
            .select();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        if (!data || data.length === 0) {
            return res.status(404).json({ message: 'Pedido no encontrado.' });
        }

        return res.status(200).json({ 
            message: `Pedido ${id} eliminado con éxito de la base de datos (Test).`,
            pedido_eliminado: data[0]
        });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};