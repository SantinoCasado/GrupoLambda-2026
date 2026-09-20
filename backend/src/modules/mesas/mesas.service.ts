import { supabase } from '../../config/supabase'; 
import { DatosAsignacion } from './interfaces/datosAsignacion';

export const insertarMesaService = async (
    table_number: number, 
    capacity: number, 
    table_type: string, 
    photo_url: string, 
    qr_data: string
) => {
    const { data, error } = await supabase
        .from('restaurant_tables')
        .insert([
            {
                table_number,
                capacity,
                table_type,
                photo_url,
                qr_data,
                availability: 'free' // Estado inicial logico
            }
        ])
        .select();

    if (error) {
        // Manejam el error de clave unica si intentan crear una mesa que ya existe
        if (error.code === '23505') {
            throw new Error(`Ya existe la mesa número ${table_number} en el sistema.`);
        }
        throw new Error(`Error en la base de datos: ${error.message}`);
    }

    return data[0];
};

export const cambiarEstadoMesaService = async (id: string, availability: string) => {
    const { data, error } = await supabase
        .from('restaurant_tables')
        .update({ availability })
        .eq('id', id)
        .select();

    if (error) {
        throw new Error(`Error al actualizar el estado de la mesa: ${error.message}`);
    }

    if (!data || data.length === 0) {
        return null; // La mesa no existe
    }

    return data[0];
};

export const obtenerMesasService = async () => {
    const { data, error } = await supabase
        .from('restaurant_tables')
        .select('*')
        .order('table_number', { ascending: true });

    if (error) {
        throw new Error(`Error al obtener el listado de mesas: ${error.message}`);
    }

    return data;
};

export const asignarMesaService = async (datos: DatosAsignacion) => {
    // 1. Actualizamos el registro en waiting_list a 'assigned'
    const { data: waitingRecord, error: updateWaitingError } = await supabase
        .from('waiting_list')
        .update({ 
            status: 'assigned', 
            assigned_table_id: datos.table_id 
        })
        .eq('id', datos.waiting_id)
        .select('*, users(push_token)') // Traemos el token del cliente relacionado
        .single();

    if (updateWaitingError) {
        throw new Error(`Error al asignar mesa en lista de espera: ${updateWaitingError.message}`);
    }

    // 2. Opcional pero recomendado: Actualizamos la tabla de mesas para marcarla como ocupada
    // (Ajustá 'estado' u 'ocupada' según los nombres de columnas que tengas en restaurant_tables)
    const { error: updateTableError } = await supabase
        .from('restaurant_tables')
        .update({ status: 'ocupada' }) 
        .eq('id', datos.table_id);

    if (updateTableError) {
        console.warn('⚠️ No se pudo actualizar el estado de la mesa:', updateTableError.message);
    }

    return waitingRecord;
};