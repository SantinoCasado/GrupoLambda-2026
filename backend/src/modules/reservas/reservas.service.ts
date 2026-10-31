import { supabase } from '../../config/supabase';
import { enviarPushNotification } from '../../services/pushNotifications.service';
import { enviarReservaConfirmada, enviarReservaRechazada } from '../../services/email.service';
import { CrearReservaDTO } from './schema/reservas.schema';

// Estados (reservations_status_check): pending -> approved | rejected ;
// approved -> completed (check-in) | cancelled (vencida a los 45 min, con el motivo en rejection_reason)

// Tiempo máximo de espera desde la hora reservada (punto 26)
export const MINUTOS_TOLERANCIA = 45;
// Desde cuánto antes de la hora reservada el cliente puede escanear el QR de la mesa
export const MINUTOS_ANTICIPACION_CHECKIN = 15;
// Desde cuánto antes de la hora reservada la mesa queda bloqueada para otros clientes
export const MINUTOS_BLOQUEO_PREVIO = 60;
// Separación mínima entre dos reservas confirmadas de la misma mesa
const MINUTOS_SEPARACION_RESERVAS = 120;

const MINUTO = 60 * 1000;

const SELECT_RESERVA = `
    *,
    client:users!client_id(first_name, last_name, photo_url, email),
    table:restaurant_tables(table_number, capacity, table_type)
`;

const formatearHora = (fecha: string | Date): string =>
    new Date(fecha).toLocaleString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        dateStyle: 'short',
        timeStyle: 'short',
    });

const notificarAdministradores = async (titulo: string, cuerpo: string, datos: Record<string, any>) => {
    try {
        const { data: administradores } = await supabase
            .from('users')
            .select('push_token')
            .in('role', ['owner', 'supervisor'])
            .not('push_token', 'is', null);

        await Promise.all(
            (administradores || []).map((admin: any) =>
                enviarPushNotification(admin.push_token, titulo, cuerpo, datos)
            )
        );
    } catch (error: any) {
        console.error('⚠️ Error al notificar a dueños y supervisores:', error.message);
    }
};

// Vence reservas sin check-in pasada la tolerancia y bloquea las mesas cuyas reservas están por empezar.
// Se ejecuta cada minuto desde index.ts y antes de cada consulta de reservas.
export const procesarReservasService = async () => {
    const ahora = Date.now();
    const limiteTolerancia = new Date(ahora - MINUTOS_TOLERANCIA * MINUTO).toISOString();

    // 1. Confirmadas que superaron los 45 minutos sin que el cliente llegue -> se libera la mesa
    const { data: vencidas, error: errorVencidas } = await supabase
        .from('reservations')
        .update({
            status: 'cancelled',
            rejection_reason: `Vencida: el cliente no llegó dentro de los ${MINUTOS_TOLERANCIA} minutos de tolerancia.`
        })
        .eq('status', 'approved')
        .lt('reservation_date', limiteTolerancia)
        .select('id, table_id');

    if (errorVencidas) {
        console.error('⚠️ Error al vencer reservas:', errorVencidas.message);
    }

    for (const reserva of vencidas || []) {
        if (!reserva.table_id) continue;
        await supabase
            .from('restaurant_tables')
            .update({ availability: 'free' })
            .eq('id', reserva.table_id)
            .eq('availability', 'reserved');
    }

    // 2. Pendientes cuyo horario ya pasó sin que nadie las apruebe
    await supabase
        .from('reservations')
        .update({
            status: 'cancelled',
            rejection_reason: 'Vencida: no fue aprobada antes del horario solicitado.'
        })
        .eq('status', 'pending')
        .lt('reservation_date', new Date(ahora).toISOString());

    // 3. Confirmadas que entran en la ventana de bloqueo -> la mesa pasa a 'reserved'
    const inicioBloqueo = new Date(ahora + MINUTOS_BLOQUEO_PREVIO * MINUTO).toISOString();
    const { data: proximas } = await supabase
        .from('reservations')
        .select('table_id')
        .eq('status', 'approved')
        .lte('reservation_date', inicioBloqueo)
        .gte('reservation_date', limiteTolerancia);

    for (const reserva of proximas || []) {
        if (!reserva.table_id) continue;
        // Solo si está libre: si sigue ocupada por clientes anteriores se bloquea cuando la liberen
        await supabase
            .from('restaurant_tables')
            .update({ availability: 'reserved' })
            .eq('id', reserva.table_id)
            .eq('availability', 'free');
    }
};

// Punto 26: indica si una mesa tiene una reserva confirmada dentro de la ventana de bloqueo
export const obtenerReservaQueBloqueaMesa = async (tableId: string) => {
    const ahora = Date.now();
    const { data } = await supabase
        .from('reservations')
        .select('id, client_id, reservation_date')
        .eq('table_id', tableId)
        .eq('status', 'approved')
        .lte('reservation_date', new Date(ahora + MINUTOS_BLOQUEO_PREVIO * MINUTO).toISOString())
        .gte('reservation_date', new Date(ahora - MINUTOS_TOLERANCIA * MINUTO).toISOString())
        .limit(1)
        .maybeSingle();

    return data;
};

// Punto 24: solo clientes registrados (el rol se valida en la ruta) y en un tiempo futuro
export const crearReservaService = async (clienteId: string, datos: CrearReservaDTO) => {
    const fecha = new Date(datos.reservation_date);

    if (fecha.getTime() <= Date.now()) {
        throw new Error('La reserva debe ser en un horario futuro.');
    }

    const { data: mesaMasGrande } = await supabase
        .from('restaurant_tables')
        .select('capacity')
        .order('capacity', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (mesaMasGrande && datos.guests_count > mesaMasGrande.capacity) {
        throw new Error(`No hay mesas para ${datos.guests_count} comensales. El máximo es ${mesaMasGrande.capacity}.`);
    }

    const { data: reserva, error } = await supabase
        .from('reservations')
        .insert([{
            client_id: clienteId,
            reservation_date: fecha.toISOString(),
            guests_count: datos.guests_count,
            status: 'pending'
        }])
        .select(SELECT_RESERVA)
        .single();

    if (error || !reserva) {
        throw new Error(`Error al registrar la reserva: ${error?.message}`);
    }

    // Punto 25: el pedido de reserva llega al listado del dueño y supervisor (push notification)
    const nombre = `${reserva.client?.first_name || ''} ${reserva.client?.last_name || ''}`.trim();
    await notificarAdministradores(
        '📅 Nueva reserva pendiente',
        `${nombre || 'Un cliente'} solicitó una reserva para el ${formatearHora(fecha)} (${datos.guests_count} comensales).`,
        { tipo: 'nueva_reserva', reservationId: reserva.id }
    );

    return reserva;
};

export const listarReservasService = async (estado?: string) => {
    await procesarReservasService();

    let consulta = supabase
        .from('reservations')
        .select(SELECT_RESERVA)
        .order('reservation_date', { ascending: true });

    if (estado) {
        consulta = consulta.eq('status', estado);
    }

    const { data, error } = await consulta;

    if (error) {
        throw new Error(`Error al obtener las reservas: ${error.message}`);
    }

    return data;
};

export const listarMisReservasService = async (clienteId: string) => {
    await procesarReservasService();

    const { data, error } = await supabase
        .from('reservations')
        .select(SELECT_RESERVA)
        .eq('client_id', clienteId)
        .order('reservation_date', { ascending: false });

    if (error) {
        throw new Error(`Error al obtener tus reservas: ${error.message}`);
    }

    return data;
};

const obtenerReservaPendiente = async (reservaId: string) => {
    const { data: reserva, error } = await supabase
        .from('reservations')
        .select(SELECT_RESERVA)
        .eq('id', reservaId)
        .maybeSingle();

    if (error) {
        throw new Error(`Error al consultar la reserva: ${error.message}`);
    }

    if (!reserva) {
        throw new Error('La reserva no existe.');
    }

    if (reserva.status !== 'pending') {
        throw new Error('La reserva ya fue procesada.');
    }

    return reserva;
};

// Elige la mesa más chica con capacidad suficiente y sin otra reserva confirmada cerca de ese horario
const elegirMesaParaReserva = async (fecha: Date, comensales: number) => {
    const { data: mesas, error } = await supabase
        .from('restaurant_tables')
        .select('id, table_number, capacity, availability')
        .gte('capacity', comensales)
        .order('capacity', { ascending: true })
        .order('table_number', { ascending: true });

    if (error) {
        throw new Error(`Error al consultar las mesas: ${error.message}`);
    }

    const { data: reservasCercanas } = await supabase
        .from('reservations')
        .select('table_id')
        .eq('status', 'approved')
        .gte('reservation_date', new Date(fecha.getTime() - MINUTOS_SEPARACION_RESERVAS * MINUTO).toISOString())
        .lte('reservation_date', new Date(fecha.getTime() + MINUTOS_SEPARACION_RESERVAS * MINUTO).toISOString());

    const mesasOcupadas = new Set((reservasCercanas || []).map((r: any) => r.table_id));

    // Si la reserva empieza pronto, la mesa tiene que estar libre en este momento
    const empiezaPronto = fecha.getTime() - Date.now() <= MINUTOS_BLOQUEO_PREVIO * MINUTO;

    return (mesas || []).find((mesa: any) =>
        !mesasOcupadas.has(mesa.id) && (!empiezaPronto || mesa.availability === 'free')
    );
};

// Punto 25: el dueño o supervisor aprueba -> se asigna mesa y se envía el correo de confirmación
export const aprobarReservaService = async (reservaId: string) => {
    const reserva = await obtenerReservaPendiente(reservaId);
    const fecha = new Date(reserva.reservation_date);

    if (fecha.getTime() <= Date.now()) {
        throw new Error('El horario de la reserva ya pasó. No se puede aprobar.');
    }

    const mesa = await elegirMesaParaReserva(fecha, reserva.guests_count);

    if (!mesa) {
        throw new Error(`No hay mesas disponibles para ${reserva.guests_count} comensales en ese horario.`);
    }

    const { data: actualizada, error } = await supabase
        .from('reservations')
        .update({ status: 'approved', table_id: mesa.id })
        .eq('id', reservaId)
        .eq('status', 'pending')
        .select(SELECT_RESERVA)
        .maybeSingle();

    if (error) {
        throw new Error(`Error al aprobar la reserva: ${error.message}`);
    }

    if (!actualizada) {
        throw new Error('La reserva cambió antes de completar la aprobación.');
    }

    // Si ya está dentro de la ventana de bloqueo, la mesa queda reservada en el acto
    await procesarReservasService();

    if (actualizada.client?.email) {
        await enviarReservaConfirmada(
            actualizada.client.email,
            actualizada.client.first_name || 'Cliente',
            actualizada.reservation_date,
            mesa.table_number,
            actualizada.guests_count
        );
    }

    return actualizada;
};

// Punto 25: el dueño o supervisor rechaza indicando el motivo -> correo automático
export const rechazarReservaService = async (reservaId: string, motivo: string) => {
    await obtenerReservaPendiente(reservaId);

    const { data: actualizada, error } = await supabase
        .from('reservations')
        .update({ status: 'rejected', rejection_reason: motivo })
        .eq('id', reservaId)
        .eq('status', 'pending')
        .select(SELECT_RESERVA)
        .maybeSingle();

    if (error) {
        throw new Error(`Error al rechazar la reserva: ${error.message}`);
    }

    if (!actualizada) {
        throw new Error('La reserva cambió antes de completar el rechazo.');
    }

    if (actualizada.client?.email) {
        await enviarReservaRechazada(
            actualizada.client.email,
            actualizada.client.first_name || 'Cliente',
            actualizada.reservation_date,
            motivo
        );
    }

    return actualizada;
};

// Punto 26: dentro del lapso válido, el cliente escanea el QR de su mesa sin pasar por la lista de espera.
// Se crea el registro de waiting_list ya asignado para que el resto del flujo (pedido, cuenta) funcione igual.
export const checkInReservaService = async (clienteId: string, tableId: string) => {
    await procesarReservasService();

    const { data: reservas, error } = await supabase
        .from('reservations')
        .select(SELECT_RESERVA)
        .eq('client_id', clienteId)
        .eq('status', 'approved')
        .order('reservation_date', { ascending: true });

    if (error) {
        throw new Error(`Error al consultar tus reservas: ${error.message}`);
    }

    if (!reservas || reservas.length === 0) {
        throw new Error('No tenés una reserva confirmada. Escaneá el QR de ingreso para anotarte en la lista de espera.');
    }

    const reserva = reservas.find((r: any) => r.table_id === tableId);

    if (!reserva) {
        const numero = reservas[0].table?.table_number;
        throw new Error(`Esta no es tu mesa. Tu reserva es para la mesa N° ${numero}.`);
    }

    const ahora = Date.now();
    const horaReserva = new Date(reserva.reservation_date).getTime();

    if (ahora < horaReserva - MINUTOS_ANTICIPACION_CHECKIN * MINUTO) {
        throw new Error(
            `Tu reserva es para el ${formatearHora(reserva.reservation_date)}. ` +
            `Podés ingresar desde ${MINUTOS_ANTICIPACION_CHECKIN} minutos antes.`
        );
    }

    const { data: asignacionActiva } = await supabase
        .from('waiting_list')
        .select('id')
        .eq('user_id', clienteId)
        .in('status', ['waiting', 'assigned'])
        .limit(1)
        .maybeSingle();

    if (asignacionActiva) {
        throw new Error('Ya estás en la lista de espera o con una mesa asignada.');
    }

    const { data: mesa } = await supabase
        .from('restaurant_tables')
        .select('id, table_number, availability')
        .eq('id', tableId)
        .maybeSingle();

    if (!mesa) {
        throw new Error('La mesa no existe.');
    }

    if (mesa.availability === 'occupied') {
        throw new Error(`La mesa N° ${mesa.table_number} todavía está ocupada. Avisale al metre.`);
    }

    const { data: espera, error: errorEspera } = await supabase
        .from('waiting_list')
        .insert([{
            user_id: clienteId,
            client_name: `${reserva.client?.first_name || ''} ${reserva.client?.last_name || ''}`.trim(),
            client_photo: reserva.client?.photo_url || '',
            status: 'assigned',
            assigned_table_id: tableId
        }])
        .select()
        .single();

    if (errorEspera || !espera) {
        throw new Error(`Error al registrar el ingreso: ${errorEspera?.message}`);
    }

    await supabase
        .from('restaurant_tables')
        .update({ availability: 'occupied' })
        .eq('id', tableId);

    await supabase
        .from('reservations')
        .update({ status: 'completed' })
        .eq('id', reserva.id);

    return {
        reserva: { ...reserva, status: 'completed' },
        mesa: { id: mesa.id, table_number: mesa.table_number },
        espera
    };
};
