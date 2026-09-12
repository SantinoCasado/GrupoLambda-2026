import { supabase } from '../../config/supabase';
import { CrearProductoDTO } from './schema/productos.schema';

export const insertarProductoDB = async (datos: CrearProductoDTO) => {
    const { data, error } = await supabase
        .from('products') // Apuntamos a la tabla unificada de productos
        .insert([
            {
                name: datos.name,
                description: datos.description,
                prep_time: datos.prep_time,
                price: datos.price,
                photos: datos.photos, // Recibe el array de URLs que armamos con Multer
                category: datos.category,
                status: 'active' // Estado por defecto según la base de datos
            }
        ])
        .select();

    if (error) {
        throw new Error(`Fallo al registrar el producto en la Base de Datos: ${error.message}`);
    }

    return data[0]; 
};

export const cambiarEstadoProductoDB = async (id: string, status: 'active' | 'inactive') => {
    const { data, error } = await supabase
        .from('products')
        .update({ status })
        .eq('id', id)
        .select();

    if (error) {
        throw new Error(`Error al actualizar el estado del producto: ${error.message}`);
    }

    if (!data || data.length === 0) {
        return null; // El producto no existe
    }

    return data[0];
};

// Listar productos (Sirve para el CU-06 de aprobaciones)
export const obtenerProductosService = async (categoriasPermitidas?: string[]) => {
    // Inicia la query trayendo solo los productos que NO están dados de baja
    let query = supabase
        .from('products')
        .select('*')
        .neq('status', 'inactive'); 

    // Si hay un array de categorías, filtramos por esas
    if (categoriasPermitidas && categoriasPermitidas.length > 0) {
        query = query.in('category', categoriasPermitidas);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(`Error al obtener los productos: ${error.message}`);
    }

    return data;
};