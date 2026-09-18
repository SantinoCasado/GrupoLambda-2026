import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { supabase } from "../config/supabase";

export interface ClienteAnonimoSesion {
  id: string; // ID en waiting_list
  user_id: string; // ID en auth.users y public.users
  client_name: string;
  client_photo: string;
  status: string; // 'waiting'
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

/* Registra al anónimo usando signInAnonymously() nativo de Supabase Auth */
export async function registrarClienteAnonimo(
  nombre: string,
  fotoUri: string
): Promise<{ exito: boolean; cliente?: ClienteAnonimoSesion; error?: string }> {
  try {
    // 1. Iniciar sesión anónima en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInAnonymously();

    if (authError || !authData.user) {
      throw new Error(`Error en auth anónimo: ${authError?.message || "Sin usuario"}`);
    }

    const authUserId = authData.user.id;

    // 2. Subir selfie a Storage
    const photoUrl = await subirFotoAnonimo(fotoUri);

    // 3. Insertar en public.users (satisface users_id_fkey porque existe en auth.users)
    const { error: userError } = await supabase
      .from("users")
      .insert([
        {
          id: authUserId,
          first_name: nombre.trim(),
          last_name: "Guest",
          role: "anonymous_client",
          status: "approved",
          photo_url: photoUrl,
        },
      ]);

    if (userError) {
      // Si falla, cerramos la sesión anónima creada
      await supabase.auth.signOut();
      throw new Error(`Error al registrar en users: ${userError.message}`);
    }

    // 4. Insertar en waiting_list referenciando user_id
    const { data: waitingData, error: waitingError } = await supabase
      .from("waiting_list")
      .insert([
        {
          user_id: authUserId,
          client_name: nombre.trim(),
          client_photo: photoUrl,
          status: "waiting",
        },
      ])
      .select()
      .single();

    if (waitingError) {
      // Limpieza si falla waiting_list
      await supabase.from("users").delete().eq("id", authUserId);
      await supabase.auth.signOut();
      throw new Error(`Error en waiting_list: ${waitingError.message}`);
    }

    return {
      exito: true,
      cliente: {
        id: waitingData.id,
        user_id: authUserId,
        client_name: waitingData.client_name,
        client_photo: waitingData.client_photo,
        status: waitingData.status || "waiting",
      },
    };
  } catch (err: any) {
    console.error("❌ Falló registro anónimo nativo:", err.message);
    return {
      exito: false,
      error: err.message,
    };
  }
}

/* Borrado total al salir */
export async function eliminarClienteAnonimo(
  userId: string,
  photoUrl?: string
): Promise<void> {
  try {
    // 1. Borrar de public.users -> CASCADE limpia waiting_list
    const { error: dbError } = await supabase
      .from("users")
      .delete()
      .eq("id", userId);

    if (dbError) {
      console.warn("⚠️ Error al eliminar usuario de users:", dbError.message);
    }

    // 2. Cerrar la sesión de auth anónima
    await supabase.auth.signOut();

    // 3. Eliminar la foto de Storage
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