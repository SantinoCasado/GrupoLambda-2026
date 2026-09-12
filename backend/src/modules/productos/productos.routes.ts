import { Router } from 'express';
import { crearProducto, bajaLogicaProducto, obtenerProductos } from './productos.controller';
import { verificarAutenticacion } from '../../middleware/auth.middleware'; 
import { upload } from '../../middleware/upload.middleware'; // Con llaves porque es una exportación nombrada

const router = Router();

// Endpoint POST para crear un producto (Plato, Bebida o Postre)
// 'verificarToken' valida que el usuario esté logueado y carga req.user
// 'upload.array('fotos', 5)' permite recibir múltiples archivos (hasta 5) bajo el campo 'fotos' del FormData
router.post(
    '/', 
    verificarAutenticacion, 
    upload.array('fotos', 5), 
    crearProducto
);

// Endpoint PATCH para dar de baja lógica un producto
router.patch(
    '/:id/baja', 
    verificarAutenticacion, 
    bajaLogicaProducto
);

// GET para listar productos (soporta query param ?category=)
router.get('/', verificarAutenticacion, obtenerProductos);

export default router;