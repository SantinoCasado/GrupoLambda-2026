import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { supabase } from "../config/supabase";
import { API_URL } from "../config/api";

export interface ClienteAnonimoSesion {
  id: string; // ID temporal / userId
  user_id: string;
  client_name: string;
  client_photo: string;
  status: string;
}

/* Sube la foto usando FileSystem y base64 */
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

/* 1. Registra al anónimo SOLO en auth y en users (NO entra a waiting_list todavía) */
export async function registrarClienteAnonimo(
  nombre: string,
  fotoUri: string
): Promise<{ exito: boolean; cliente?: ClienteAnonimoSesion; error?: string }> {
  try {
    // A. Subir foto
    const photoUrl = await subirFotoAnonimo(fotoUri);

    // B. Sesión anónima de Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
    if (authError || !authData.user) {
      throw new Error(`Error en auth anónimo: ${authError?.message || "Sin usuario"}`);
    }

    const anonUserId = authData.user.id;

    // C. Guardar usuario en tabla users (satisface FK y NOT NULL photo_url)
    const { error: userError } = await supabase.from("users").insert([
      {
        id: anonUserId,
        first_name: nombre.trim(),
        last_name: "Guest",
        photo_url: photoUrl,
        role: "anonymous_client",
        status: "approved",
      },
    ]);

    if (userError) {
      await supabase.auth.signOut();
      throw new Error(`Error al registrar usuario: ${userError.message}`);
    }

    return {
      exito: true,
      cliente: {
        id: anonUserId,
        user_id: anonUserId,
        client_name: nombre.trim(),
        client_photo: photoUrl,
        status: "door", // En la puerta del local
      },
    };
  } catch (err: any) {
    console.error("❌ Falló registro anónimo en front:", err.message);
    return {
      exito: false,
      error: err.message,
    };
  }
}

/* 2. Se ejecuta ÚNICAMENTE al escanear INGRESO_LOCAL en la puerta */
export async function ingresarAListaEsperaLocal(
  userId: string,
  clientName: string,
  clientPhoto: string
): Promise<{ exito: boolean; waitingId?: string; error?: string }> {
  try {
    // Pegamos al backend para que además despache la Push Notification a los Metres
    const response = await fetch(`${API_URL}/api/clientes/lista-espera`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        client_name: clientName,
        client_photo: clientPhoto,
      }),
    });

    if (response.ok) {
      const json = await response.json();
      const waitingRecord = json.data || json.waitingRecord;
      return { exito: true, waitingId: waitingRecord?.id };
    }
  } catch (err: any) {
    console.warn("⚠️ Falló backend lista-espera, fallback directo a Supabase:", err.message);
  }

  // Fallback directo si el endpoint del backend falla
  const { data, error } = await supabase
    .from("waiting_list")
    .insert([
      {
        user_id: userId,
        client_name: clientName,
        client_photo: clientPhoto,
        status: "waiting",
      },
    ])
    .select("id")
    .single();

  if (error) {
    return { exito: false, error: error.message };
  }

  return { exito: true, waitingId: data.id };
}

/* 3. Limpieza al salir */
export async function eliminarClienteAnonimo(
  userId: string,
  photoUrl?: string
): Promise<void> {
  try {
    await supabase.from("users").delete().eq("id", userId);
    await supabase.auth.signOut();

    if (photoUrl && photoUrl.includes("/fotos_usuarios/")) {
      const fileName = photoUrl.split("/fotos_usuarios/").pop();
      if (fileName) {
        await supabase.storage
          .from("fotos_usuarios")
          .remove([decodeURIComponent(fileName)]);
      }
    }
  } catch (error: any) {
    console.warn("⚠️ Error al limpiar cliente anónimo:", error.message);
  }
}