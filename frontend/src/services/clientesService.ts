import { API_BASE_URL } from "../.././apiConfig";
import { File } from "expo-file-system";
import { fetch } from "expo/fetch";
import { headersConToken } from "./tokenService";

export interface ClienteFormErrors {
  nombres?: string;
  apellidos?: string;
  dni?: string;
  email?: string;
  password?: string;
  fotoUri?: string;
}

// Validación del Paso 1 (identificación personal, previo a credenciales y foto)
export function validarPaso1Cliente(data: {
  nombres: string;
  apellidos: string;
  dni: string;
}): Partial<ClienteFormErrors> {
  const errors: Partial<ClienteFormErrors> = {};

  if (!data.nombres.trim()) {
    errors.nombres = "El nombre es obligatorio.";
  } else if (data.nombres.trim().length < 2) {
    errors.nombres = "El nombre debe tener al menos 2 caracteres.";
  }

  if (!data.apellidos.trim()) {
    errors.apellidos = "El apellido es obligatorio.";
  } else if (data.apellidos.trim().length < 2) {
    errors.apellidos = "El apellido debe tener al menos 2 caracteres.";
  }

  const dniLimpio = data.dni.trim();
  if (!dniLimpio) {
    errors.dni = "El número de DNI es obligatorio.";
  } else if (!/^\d{8}$/.test(dniLimpio)) {
    errors.dni = "El DNI debe contener 8 dígitos numéricos.";
  }

  return errors;
}

// Validaciones estrictas de todos los campos
export function validateClienteForm(data: {
  nombres: string;
  apellidos: string;
  dni: string;
  email: string;
  password?: string;
  fotoUri: string | null;
}): ClienteFormErrors {
  const errors: ClienteFormErrors = {};

  // Nombres
  if (!data.nombres.trim()) {
    errors.nombres = "El nombre es obligatorio.";
  } else if (data.nombres.trim().length < 2) {
    errors.nombres = "El nombre debe tener al menos 2 caracteres.";
  }

  // Apellidos
  if (!data.apellidos.trim()) {
    errors.apellidos = "El apellido es obligatorio.";
  } else if (data.apellidos.trim().length < 2) {
    errors.apellidos = "El apellido debe tener al menos 2 caracteres.";
  }

  // DNI (8 dígitos numéricos)
  const dniLimpio = data.dni.trim();
  if (!dniLimpio) {
    errors.dni = "El número de DNI es obligatorio.";
  } else if (!/^\d{8}$/.test(dniLimpio)) {
    errors.dni = "El DNI debe contener 8 dígitos numéricos.";
  }

  // Email
  const emailLimpio = data.email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailLimpio) {
    errors.email = "El correo electrónico es obligatorio.";
  } else if (!emailRegex.test(emailLimpio)) {
    errors.email = "Ingrese un correo electrónico válido.";
  }

  // Contraseña (mínimo 6 caracteres)
  if (!data.password) {
    errors.password = "La contraseña es obligatoria.";
  } else if (data.password.length < 6) {
    errors.password = "La contraseña debe tener al menos 6 caracteres.";
  }

  // Foto tomada con cámara obligatoria
  if (!data.fotoUri) {
    errors.fotoUri = "Debe tomar una fotografía personal con la cámara.";
  }

  return errors;
}

export async function registrarCliente(payload: {
  nombres: string;
  apellidos: string;
  dni: string;
  email: string;
  password: string;
  fotoUri: string;
  pushToken?: string | null;
}) {
  // Armamos la foto como archivo multipart en el campo "foto" (multer)
  const armarFormData = (conPushToken: boolean) => {
    const formData = new FormData();
    formData.append("email", payload.email.trim().toLowerCase());
    formData.append("password", payload.password);
    formData.append("first_name", payload.nombres.trim());
    formData.append("last_name", payload.apellidos.trim());
    formData.append("dni", payload.dni.trim());
    if (conPushToken && payload.pushToken) {
      formData.append("push_token", payload.pushToken);
    }
    const fotoFile = new File(payload.fotoUri);
    formData.append("foto", fotoFile, fileNameFromUri(payload.fotoUri));
    return formData;
  };

  const enviar = async (conPushToken: boolean) => {
    const response = await fetch(`${API_BASE_URL}/clientes/register`, {
      method: "POST",
      headers: await headersConToken(),
      body: armarFormData(conPushToken),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || data.error || "No se pudo registrar el cliente.");
    }
    return data;
  };

  try {
    return await enviar(Boolean(payload.pushToken));
  } catch (error: any) {
    // Si la columna push_token aún no existe en Supabase, reintentamos sin el token
    // para que el registro igualmente prospere y avisamos cómo corregirlo.
    const sugiereColumnaFaltante = /push_token|column/i.test(error.message || "");
    if (payload.pushToken && sugiereColumnaFaltante) {
      console.warn(
        "⚠️ [Push] El backend rechazó push_token (¿columna faltante?). Reintentando el registro sin token.",
        "Corre en Supabase: ALTER TABLE public.users ADD COLUMN IF NOT EXISTS push_token text;"
      );
      try {
        return await enviar(false);
      } catch (errorReintento: any) {
        console.error("❌ Error en el registro de cliente:", errorReintento.message);
        throw errorReintento;
      }
    }

    console.error("❌ Error en el registro de cliente:", error.message);
    throw error;
  }
}

// Deriva un nombre de archivo con extensión correcta desde la URI local
function fileNameFromUri(uri: string): string {
  const original = uri.split("/").pop() || "foto.jpg";
  if (/\.(jpg|jpeg|png|webp)$/i.test(original)) return original;
  return `${original.split(".")[0] || "foto"}.jpg`;
}

function mimeFromUri(uri: string): string {
  const nombre = fileNameFromUri(uri).toLowerCase();
  if (nombre.endsWith(".png")) return "image/png";
  if (nombre.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}