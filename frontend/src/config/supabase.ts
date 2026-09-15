// src/config/supabase.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    console.warn("⚠️ [Supabase] Faltan las variables EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY");
    return null;
  }

  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey);
  }

  return client;
}

// Instancia lista para importar directamente: import { supabase } from '../config/supabase';
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key"
);