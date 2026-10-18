import { supabase } from "../config/supabase";

export interface NuevaEncuesta {
  order_id: string;
  user_id?: string;
  user_role: string;
  rating_cleanliness: number;
  rating_food: number;
  rating_service: number;
  feedback_text: string;
  photos: string[];
}

export interface EncuestaData {
  id?: string;
  order_id: string;
  user_id?: string;
  user_role: string;
  rating_cleanliness: number;
  rating_food: number;
  rating_service: number;
  feedback_text: string;
  photos: string[];
  created_at?: string;
}

/** Verifica si este pedido ya tiene una encuesta registrada */
export async function verificarEncuestaCompletada(orderId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("surveys")
    .select("order_id")
    .eq("order_id", orderId)
    .maybeSingle();

  if (error) {
    console.warn("Error al verificar encuesta previa:", error.message);
    return false;
  }
  return data !== null;
}

/** Registra la nueva encuesta en la tabla surveys asegurando user_id y user_role */
export async function guardarEncuestaApi(encuesta: NuevaEncuesta) {
  let userId = encuesta.user_id;

  if (!userId) {
    const { data: authData } = await supabase.auth.getUser();
    userId = authData?.user?.id;
  }

  // Mapeamos a 'client' o 'employee' según la restricción
  const rolValido = encuesta.user_role?.includes("empleado") || 
                    ["cocinero", "cantinero", "mozo", "metre"].includes(encuesta.user_role)
                    ? "employee"
                    : "client";

  const payload = {
    ...encuesta,
    user_id: userId,
    user_role: rolValido,
  };

  const { data, error } = await supabase.from("surveys").insert([payload]).select().single();
  if (error) throw error;
  return data;
}

/** Obtiene todas las encuestas registradas para calcular estadísticas */
export async function obtenerEstadisticasEncuestasApi(): Promise<EncuestaData[]> {
  const { data, error } = await supabase
    .from("surveys")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}