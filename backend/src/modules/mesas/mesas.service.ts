import { supabase } from '../../config/supabase'; 
import { DatosAsignacion } from './interfaces/datosAsignacion';
import { obtenerReservaQueBloqueaMesa } from '../reservas/reservas.service';

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
    const { data: waitingRecord, error: waitingError } = await supabase
        .from('waiting_list')
        .select('id, user_id, status, assigned_table_id')
        .eq('id', datos.waiting_id)
        .maybeSingle();

    if (waitingError) {
        throw new Error(`Error al consultar la lista de espera: ${waitingError.message}`);
    }

    if (!waitingRecord) {
        throw new Error('El cliente no se encuentra en la lista de espera');
    }

    if (waitingRecord.status !== 'waiting' || waitingRecord.assigned_table_id) {
        throw new Error('El cliente ya fue asignado o la asignación ya no está disponible');
    }

    const { data: table, error: tableError } = await supabase
        .from('restaurant_tables')
        .select('id, table_number, availability')
        .eq('id', datos.table_id)
        .maybeSingle();

    if (tableError) {
        throw new Error(`Error al consultar la mesa: ${tableError.message}`);
    }

    if (!table) {
        throw new Error('La mesa seleccionada no existe');
    }

    // Punto 26: una mesa con reserva confirmada no se le puede asignar a otro cliente
    const reservaVigente = await obtenerReservaQueBloqueaMesa(datos.table_id);

    if (reservaVigente) {
        const hora = new Date(reservaVigente.reservation_date).toLocaleTimeString('es-AR', {
            timeZone: 'America/Argentina/Buenos_Aires',
            hour: '2-digit',
            minute: '2-digit',
        });

        if (reservaVigente.client_id === waitingRecord.user_id) {
            throw new Error(`El cliente tiene reservada la mesa #${table.table_number} para las ${hora}. Puede ingresar escaneando el QR de la mesa.`);
        }

        throw new Error(`La mesa #${table.table_number} está reservada para las ${hora}.`);
    }

    if (table.availability !== 'free') {
        throw new Error(`La mesa #${table.table_number} ya no está disponible`);
    }

    const { data: recipient, error: recipientError } = await supabase
        .from('users')
        .select('id, role, push_token')
        .eq('id', waitingRecord.user_id)
        .in('role', ['registered_client', 'anonymous_client'])
        .maybeSingle();

    if (recipientError) {
        throw new Error(`Error al consultar el cliente asignado: ${recipientError.message}`);
    }

    if (!recipient) {
        throw new Error('El usuario de la lista de espera no es un cliente válido');
    }

    const { data: updatedWaiting, error: updateWaitingError } = await supabase
        .from('waiting_list')
        .update({
            status: 'assigned',
            assigned_table_id: datos.table_id,
        })
        .eq('id', datos.waiting_id)
        .eq('status', 'waiting')
        .select('id, user_id, status, assigned_table_id')
        .maybeSingle();

    if (updateWaitingError) {
        throw new Error(`Error al asignar mesa en lista de espera: ${updateWaitingError.message}`);
    }

    if (!updatedWaiting) {
        throw new Error('La asignación cambió antes de completarse');
    }

    const { data: updatedTable, error: updateTableError } = await supabase
        .from('restaurant_tables')
        .update({ availability: 'occupied' })
        .eq('id', datos.table_id)
        .eq('availability', 'free')
        .select('id, table_number, availability')
        .maybeSingle();

    if (updateTableError || !updatedTable) {
        const { error: rollbackError } = await supabase
            .from('waiting_list')
            .update({
                status: 'waiting',
                assigned_table_id: null,
            })
            .eq('id', datos.waiting_id)
            .eq('assigned_table_id', datos.table_id)
            .eq('status', 'assigned');

        if (rollbackError) {
            console.error('Error al revertir la asignación:', rollbackError.message);
        }

        throw new Error(updateTableError?.message || `La mesa #${table.table_number} ya no está disponible`);
    }

    return {
        waiting: updatedWaiting,
        table: updatedTable,
        recipient,
    };
};