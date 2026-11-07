// src/services/empleadosService.ts
import { API_BASE_URL } from "../.././apiConfig";
import { File } from "expo-file-system";
import { fetch } from "expo/fetch";
import { headersConToken } from "./tokenService";

export interface EmpleadoFormValues {
  nombres: string;
  apellidos: string;
  dni: string;
  cuil: string;
  email: string;
  password: string;
  perfil: string;
  fotoUri: string;
}

/* Roles */
const ROLE_MAPPING: Record<string, 'owner' | 'supervisor' | 'cook' | 'bartender' | 'waiter' | 'maitre' | 'delivery'> = {
  dueño: "owner",
  duenio: "owner",
  supervisor: "supervisor",
  cocinero: "cook",
  cantinero: "bartender",
  mozo: "waiter",
  metre: "maitre",
  delivery: "delivery",
  repartidor: "delivery",
};

export async function registrarEmpleado(
  payload: EmpleadoFormValues,
  rolCreador: string = "owner"
) {
  // Limpiamos los datos para cumplir estrictamente con Zod
  const dniLimpio = payload.dni.replace(/\D/g, "");
  const cuilLimpio = payload.cuil.replace(/\D/g, "");

  // Armamos la foto como archivo multipart en el campo "foto" (multer)
  const formData = new FormData();
  formData.append("email", payload.email.trim().toLowerCase());
  formData.append("password", payload.password);
  formData.append("first_name", payload.nombres.trim());
  formData.append("last_name", payload.apellidos.trim());
  formData.append("dni", dniLimpio);
  formData.append("cuil", cuilLimpio);
  formData.append("role", ROLE_MAPPING[payload.perfil.toLowerCase()] || "cook");
  formData.append("rol_creador", rolCreador);
  const fotoFile = new File(payload.fotoUri);
  formData.append("foto", fotoFile, fileNameFromUri(payload.fotoUri));

  const response = await fetch(`${API_BASE_URL}/empleados/empleados`, {
    method: "POST",
    headers: await headersConToken(),
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    if (data.detalle) {
      console.log("Error de Zod en detalle:", JSON.stringify(data.detalle, null, 2));
    }
    throw new Error(data.error || data.message || "Error al registrar empleado.");
  }

  return data;
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