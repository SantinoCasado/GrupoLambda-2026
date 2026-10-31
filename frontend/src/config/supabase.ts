// src/config/supabase.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const clienteUnico: SupabaseClient = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key",
  {
    auth: {
      // Flujo PKCE: el redirect de Google trae un `code` en el query string
      // (no tokens en el hash), y lo canjeamos con exchangeCodeForSession().
      flowType: "pkce",
      // En React Native no hay URL de navegador que inspeccionar al iniciar.
      detectSessionInUrl: false,
      // Se usa el storage en memoria por defecto: el code_verifier de PKCE vive
      // en memoria durante la sesión. Si querés que sobreviva a que el SO mate la
      // app con el navegador abierto, pasá AsyncStorage acá (requiere rebuild nativo).
    },
  }
);

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    console.warn("⚠️ [Supabase] Faltan las variables EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY");
    return null;
  }

  return clienteUnico;
}

// Instancia lista para importar directamente: import { supabase } from '../config/supabase';
export const supabase = clienteUnico;