import { supabase } from '../../config/supabase';
import { enviarPushNotification } from '../../services/pushNotifications.service';
import { EnviarMensajeDTO } from './schema/chat.schema';

const ROLES_PERSONAL = ['waiter', 'maitre', 'owner', 'supervisor'];
const ROLES_CLIENTE = ['registered_client', 'anonymous_client'];

interface Destinatario {
  id: string;
  push_token: string | null;
}

const obtenerDestinatarios = async (
  senderId: string,
  senderRole: string,
  tableId: string | null
): Promise<Destinatario[]> => {
  if (ROLES_PERSONAL.includes(senderRole)) {
    if (!tableId) return [];

    const { data: asignacion, error: errorAsignacion } = await supabase
      .from('waiting_list')
      .select('user_id')
      .eq('assigned_table_id', tableId)
      .eq('status', 'assigned')
      .neq('user_id', senderId)
      .order('joined_at', { ascending: false })
      .limit(1);

    if (errorAsignacion) {
      console.error('⚠️ Error al buscar el cliente de la mesa:', errorAsignacion.message);
      return [];
    }

    const userId = asignacion?.[0]?.user_id;
    if (!userId) return [];

    const { data: cliente, error: errorCliente } = await supabase
      .from('users')
      .select('id, push_token')
      .eq('id', userId)
      .in('role', ROLES_CLIENTE)
      .maybeSingle();

    if (errorCliente) {
      console.error('⚠️ Error al consultar el cliente destinatario:', errorCliente.message);
      return [];
    }

    return cliente ? [{ id: cliente.id, push_token: cliente.push_token }] : [];
  }

  if (!ROLES_CLIENTE.includes(senderRole)) return [];

  const { data: mozos, error: errorMozos } = await supabase
    .from('users')
    .select('id, push_token')
    .eq('role', 'waiter')
    .neq('id', senderId)
    .not('push_token', 'is', null);

  if (errorMozos) {
    console.error('⚠️ Error al consultar los mozos destinatarios:', errorMozos.message);
    return [];
  }

  return (mozos || []) as Destinatario[];
};

const notificarChat = async (mensaje: any, senderRole: string): Promise<boolean> => {
  const senderId = mensaje?.sender_id;
  const tableId = mensaje?.table_id || null;

  if (!senderId) return false;

  try {
    const destinatarios = await obtenerDestinatarios(senderId, senderRole, tableId);
    if (destinatarios.length === 0) return false;

    const remitente = Array.isArray(mensaje.users) ? mensaje.users[0] : mensaje.users;
    const nombreRemitente =
      [remitente?.first_name, remitente?.last_name].filter(Boolean).join(' ').trim() || 'Alguien';
    const mesa = Array.isArray(mensaje.restaurant_tables)
      ? mensaje.restaurant_tables[0]
      : mensaje.restaurant_tables;
    const numeroMesa = mesa?.table_number ?? null;

    const esPersonal = ROLES_PERSONAL.includes(senderRole);
    const titulo = esPersonal
      ? `🛎️ ${nombreRemitente} respondió tu consulta`
      : `💬 Mesa #${numeroMesa ?? "?"} - Nueva consulta`;

    const datosExtra: Record<string, any> = {
      tipo: 'chat_mesa',
      table_id: tableId,
      table_number: numeroMesa,
      sender_name: nombreRemitente,
      sender_role: senderRole,
    };

    let entregadas = 0;
    const tokensYaNotificados = new Set<string>();

    for (const destinatario of destinatarios) {
      if (!destinatario.push_token) continue;
      if (destinatario.id === senderId) continue;
      if (tokensYaNotificados.has(destinatario.push_token)) continue;
      tokensYaNotificados.add(destinatario.push_token);

      const enviada = await enviarPushNotification(
        destinatario.push_token,
        titulo,
        mensaje.message,
        datosExtra
      );

      if (enviada) entregadas += 1;
    }

    if (entregadas > 0) {
      console.log(
        `📲 Chat: ${entregadas}/${tokensYaNotificados.size} notificación(es) enviada(s) para la mesa ${tableId ?? 'sin mesa'}`
      );
    } else {
      console.log(
        `🔕 Chat: sin notificaciones entregadas para la mesa ${tableId ?? 'sin mesa'} (tokens ausentes o inválidos)`
      );
    }

    return entregadas > 0;
  } catch (error: any) {
    console.error('⚠️ Error al notificar el mensaje de chat:', error?.message);
    return false;
  }
};

export const enviarMensajeService = async (datos: EnviarMensajeDTO, senderRole: string) => {
  const { sender_id, table_id, message, order_id, chat_type = 'table_waiter' } = datos;

  const { data, error } = await supabase
    .from('chats')
    .insert([
      {
        sender_id,
        table_id: table_id || null,
        message: message.trim(),
        order_id: order_id || null,
        chat_type,
      },
    ])
    .select(`
      id,
      sender_id,
      table_id,
      order_id,
      chat_type,
      message,
      created_at,
      users:sender_id (first_name, last_name, role),
      restaurant_tables:table_id (table_number)
    `)
    .single();

  if (error) {
    throw new Error(`Error al enviar mensaje: ${error.message}`);
  }

  const notificacionEnviada = await notificarChat(data, senderRole);

  return { mensaje: data, notificacionEnviada };
};

export const listarMensajesService = async (table_id?: string) => {
  let query = supabase
    .from('chats')
    .select(`
      id,
      sender_id,
      table_id,
      order_id,
      chat_type,
      message,
      created_at,
      users:sender_id (first_name, last_name, role),
      restaurant_tables:table_id (table_number)
    `)
    .order('created_at', { ascending: true });

  if (table_id) {
    query = query.eq('table_id', table_id);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Error al obtener mensajes: ${error.message}`);
  }

  return data;
};