import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { supabase } from "../config/supabase";
import { API_URL } from "../config/api";

export interface ClienteAnonimoSesion {
  id: string; // ID en waiting_list
  user_id: string; // ID en users
  client_name: string;
  client_photo: string;
  status: string; // 'waiting'
}

/* Sube la foto tomada a Supabase Storage con base64-arraybuffer */
export async function subirFotoAnonimo(uri: string): Promise<string> {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const fileName = `anonimo_${Date.now()}.jpg`;

    const { error } = await supabase.storage
      .from("fotos_usuarios")
      .upload(fileName, decode(base64), {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (error) {
      console.warn("⚠️ Falló subida a Storage:", error.message);
      return uri;
    }

    const { data: publicUrlData } = supabase.storage
      .from("fotos_usuarios")
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  } catch (error: any) {
    console.warn("⚠️ Error procesando imagen de anónimo:", error.message);
    return uri;
  }
}

/* Llama al endpoint de Express POST /api/clientes/anonymous */
export async function registrarClienteAnonimo(
  nombre: string,
  fotoUri: string
): Promise<{ exito: boolean; cliente?: ClienteAnonimoSesion; error?: string }> {
  try {
    // 1. Subir selfie a Storage y obtener URL
    const photoUrl = await subirFotoAnonimo(fotoUri);

    // 2. Pegar al endpoint de Express
    const response = await fetch(`${API_URL}/api/clientes/anonymous`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_name: nombre.trim(),
        client_photo: photoUrl,
      }),
    });

    const json = await response.json();

    if (!response.ok) {
      throw new Error(json.error || json.detalle || "Error al registrar cliente anónimo");
    }

    // El backend devuelve { user: {...}, waiting_entry: {...} }
    const waitingEntry = json.data?.waiting_entry || json.waiting_entry || json.data;
    const userData = json.data?.user || json.user;

    const waitingId = waitingEntry?.id || json.data?.id;
    const userId = userData?.id || waitingEntry?.user_id;

    return {
      exito: true,
      cliente: {
        id: waitingId,
        user_id: userId,
        client_name: nombre.trim(),
        client_photo: photoUrl,
        status: waitingEntry?.status || "waiting",
      },
    };
  } catch (err: any) {
    console.error("❌ Falló registro anónimo en Express:", err.message);
    return {
      exito: false,
      error: err.message,
    };
  }
}

/* Borra al usuario de 'users' al salir (CASCADE limpia waiting_list) y borra la foto */
export async function eliminarClienteAnonimo(
  userId: string,
  photoUrl?: string
): Promise<void> {
  try {
    // 1. Borrar de users -> PostgreSQL activa ON DELETE CASCADE sobre waiting_list
    const { error: dbError } = await supabase
      .from("users")
      .delete()
      .eq("id", userId);

    if (dbError) {
      console.warn("⚠️ Error al eliminar usuario de users:", dbError.message);
    }

    // 2. Eliminar la foto en fotos_usuarios
    if (photoUrl && photoUrl.includes("/fotos_usuarios/")) {
      const fileName = photoUrl.split("/fotos_usuarios/").pop();
      if (fileName) {
        await supabase.storage
          .from("fotos_usuarios")
          .remove([decodeURIComponent(fileName)]);
      }
    }
  } catch (error: any) {
    console.warn("⚠️ Error general al limpiar cliente anónimo:", error.message);
  }
}