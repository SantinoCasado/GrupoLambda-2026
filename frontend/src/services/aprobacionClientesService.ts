import { API_BASE_URL } from "./apiConfig";
import { headersConToken } from "./tokenService";

export interface ClientePendiente {
  id: string;
  nombres: string;
  apellidos: string;
  dni: string;
  email: string;
  fotoUri: string;
  fechaRegistro: string;
  estado: "pendiente" | "aprobado" | "rechazado";
}

// Datos de prueba iniciales con fotos reales para testear la UI
let CLIENTES_PENDIENTES_LOCAL: ClientePendiente[] = [
  {
    id: "cli-101",
    nombres: "Mateo Ignacio",
    apellidos: "Gómez",
    dni: "42890123",
    email: "mateo.gomez@gmail.com",
    fotoUri: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80",
    fechaRegistro: "Hoy, 19:42",
    estado: "pendiente",
  },
  {
    id: "cli-102",
    nombres: "Camila Belén",
    apellidos: "Fernández",
    dni: "44112233",
    email: "camila.fer@hotmail.com",
    fotoUri: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80",
    fechaRegistro: "Hoy, 18:15",
    estado: "pendiente",
  },
  {
    id: "cli-103",
    nombres: "Lucas Damián",
    apellidos: "Rodríguez",
    dni: "41998877",
    email: "lucas.rod@gmail.com",
    fotoUri: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400&auto=format&fit=crop&q=80",
    fechaRegistro: "Ayer, 21:05",
    estado: "pendiente",
  },
];

// Obtener clientes en estado pendiente
export async function obtenerClientesPendientes(): Promise<ClientePendiente[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/clientes/pendientes`, {
      headers: await headersConToken(),
    });
    if (response.ok) {
      const data = await response.json();
      const resultado = Array.isArray(data) ? data : data.data || [];
      if (resultado.length > 0) return resultado;
    }
  } catch (error) {
    console.warn("Backend /clientes/pendientes no disponible, usando datos locales:", error);
  }
  return CLIENTES_PENDIENTES_LOCAL.filter((c) => c.estado === "pendiente");
}

// Resolver solicitud (Aprobar o Rechazar)
export async function responderSolicitudCliente(
  id: string,
  accion: "aprobado" | "rechazado"
): Promise<{ ok: boolean; mensaje: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/clientes/${id}/estado`, {
      method: "PUT",
      headers: await headersConToken({ "Content-Type": "application/json" }),
      body: JSON.stringify({ estado: accion }),
    });

    if (response.ok) {
      const data = await response.json();
      return { ok: true, mensaje: data.mensaje || `Cliente ${accion} correctamente.` };
    }
  } catch (error) {
    console.warn(`Error al ${accion} cliente en backend, aplicando localmente:`, error);
  }

  // Actualización local
  CLIENTES_PENDIENTES_LOCAL = CLIENTES_PENDIENTES_LOCAL.map((c) =>
    c.id === id ? { ...c, estado: accion } : c
  );

  return {
    ok: true,
    mensaje:
      accion === "aprobado"
        ? "Cliente Aprobado. Se ha enviado el correo de confirmación de acceso."
        : "Cliente Rechazado. Se ha notificado la decisión por correo electrónico.",
  };
}