import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carga las variables del archivo .env
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Faltan las credenciales de Supabase en el archivo .env');
}

// Inicializa el cliente con permisos de administrador (Service Role)
export const supabase = createClient(supabaseUrl, supabaseServiceKey);