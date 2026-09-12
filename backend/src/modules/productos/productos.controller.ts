import { Request, Response } from 'express';
import { crearProductoSchema } from './schema/productos.schema';
import { subirImagenSupabase} from '../../services/storage.service';
import { insertarProductoDB, cambiarEstadoProductoDB, obtenerProductosService } from './productos.service';
import { supabase } from '../../config/supabase'; 

export const crearProducto = async (req: Request, res: Response): Promise<Response> => {
    // Validacion inicial de archivos
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
        return res.status(400).json({ error: 'La foto del producto es obligatoria' });
    }

    try {
        const usuarioLogueado = (req as any).user;
        const { category } = req.body;

        // ------------------------ REGLAS DE NEGOCIO (Permisos) --------------------
        // Solo Owner o Cook pueden crear Platos o Postres
        if ((category === 'dish' || category === 'dessert') && !['owner', 'cook'].includes(usuarioLogueado.role)) {
            return res.status(403).json({ 
                error: 'Permiso denegado. Solo un Cocinero (cook) puede gestionar platos y postres.' 
            });
        }

        // Solo Owner o Bartender pueden crear Bebidas
        if (category === 'drink' && !['owner', 'bartender'].includes(usuarioLogueado.role)) {
            return res.status(403).json({ 
                error: 'Permiso denegado. Solo un Cantinero (bartender) puede gestionar bebidas.' 
            });
        }
        // --------------------------------------------------------------------------

        // Sube todas las imagenes en paralelo al bucket de productos
        const photosArray = await Promise.all(
            files.map(file => subirImagenSupabase(file, 'fotos_productos'))
        );

        // Prepara los datos para Zod uniendo el body con el array de fotos
        const datosParaValidar = {
            ...req.body,
            photos: photosArray
        };
        
        // Validacion estricta con Zod
        const validacion = crearProductoSchema.safeParse(datosParaValidar);
        
        if (!validacion.success) {
            return res.status(400).json({ 
                error: 'Datos inválidos o incompletos',
                detalle: validacion.error.format() 
            });
        }

        // Guardado en base de datos (Supabase)
        const nuevoProducto = await insertarProductoDB(validacion.data);
        
        return res.status(201).json({
            mensaje: `Producto (${validacion.data.category}) creado con éxito.`,
            data: nuevoProducto
        });

    } catch (error: any) {
        return res.status(500).json({ error: 'Fallo al crear el producto', detalle: error.message });
    }
};

export const bajaLogicaProducto = async (req: Request, res: Response): Promise<Response> => {
    try {
        const id = req.params.id as string;
        const usuarioLogueado = (req as any).user;

        // Busca el producto primero para saber qué categoría es y validar el permiso
        const { data: productoExistente, error: fetchError } = await supabase
            .from('products')
            .select('category')
            .eq('id', id)
            .single();

        if (fetchError || !productoExistente) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        const { category } = productoExistente;

        // Validacion de Roles (Misma regla que en la creacion)
        if ((category === 'dish' || category === 'dessert') && !['owner', 'cook'].includes(usuarioLogueado.role)) {
            return res.status(403).json({ 
                error: 'Permiso denegado. Solo un Cocinero (cook) o Dueño pueden dar de baja este producto.' 
            });
        }

        if (category === 'drink' && !['owner', 'bartender'].includes(usuarioLogueado.role)) {
            return res.status(403).json({ 
                error: 'Permiso denegado. Solo un Cantinero (bartender) o Dueño pueden dar de baja esta bebida.' 
            });
        }

        // Ejecuta la baja logica pasandolo a 'inactive'
        const productoActualizado = await cambiarEstadoProductoDB(id, 'inactive');

        return res.status(200).json({
            mensaje: 'Producto dado de baja con éxito (baja lógica)',
            data: productoActualizado
        });

    } catch (error: any) {
        return res.status(500).json({ error: 'Fallo al dar de baja el producto', detalle: error.message });
    }
};

export const obtenerProductos = async (req: Request, res: Response): Promise<Response> => {
    try {
        const usuarioLogueado = (req as any).user;
        const reqCategory = req.query.category as string;
        
        let categoriasFiltro: string[] = [];

        // Reglas estrictas por rol
        if (usuarioLogueado.role === 'cook') {
            // El cocinero SOLO ve platos y postres, sin importar quE pida
            categoriasFiltro = ['dish', 'dessert'];
        
        } else if (usuarioLogueado.role === 'bartender') {
            // El cantinero SOLO ve bebidas
            categoriasFiltro = ['drink'];
        
        } else {
            // Roles con acceso total (owner, supervisor, maitre, waiter, clientes)
            // Si pidieron un filtro específico en la URL, se lo aplicamos
            if (reqCategory) {
                const categoriasValidas = ['dish', 'drink', 'dessert'];
                if (!categoriasValidas.includes(reqCategory)) {
                    return res.status(400).json({ error: 'Categoría inválida en la URL.' });
                }
                categoriasFiltro = [reqCategory];
            }
            // Si no mandaron filtro (reqCategory es undefined), categoriasFiltro queda vacío 
            // y el servicio traerá todo el menú.
        }

        // Ejecuta la búsqueda con las reglas aplicadas
        const productos = await obtenerProductosService(categoriasFiltro.length > 0 ? categoriasFiltro : undefined);

        return res.status(200).json({ data: productos });

    } catch (error: any) {
        return res.status(500).json({ error: 'Fallo al obtener los productos', detalle: error.message });
    }
};