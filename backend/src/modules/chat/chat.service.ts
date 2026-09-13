import { supabase } from '../../config/supabase';
import { EnviarMensajeDTO } from './schema/chat.schema';

export const enviarMensajeService = async (datos: EnviarMensajeDTO) => {
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

  return data;
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