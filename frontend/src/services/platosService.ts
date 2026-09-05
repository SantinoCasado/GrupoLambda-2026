import { API_BASE_URL } from "./apiConfig";

export interface PlatoPayload {
  nombre: string;
  descripcion: string;
  tiempoElaboracionMinutos: number;
  precio: number;
  fotos: string[];
}

export async function registrarPlato(payload: PlatoPayload) {
  const response = await fetch(`${API_BASE_URL}/platos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.error || "No se pudo registrar el plato en la carta.");
  }

  return data;
}