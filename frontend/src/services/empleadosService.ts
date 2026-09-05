// src/services/empleadosService.ts
import { API_BASE_URL } from "./apiConfig";

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

const ROLE_MAPPING: Record<string, 'owner' | 'supervisor' | 'cook' | 'bartender' | 'waiter' | 'maitre' | 'delivery'> = {
  dueño: "owner",
  duenio: "owner",
  supervisor: "supervisor",
  cocinero: "cook",
  cantinero: "bartender",
  mozo: "waiter",
  metre: "maitre",
  delivery: "delivery",
};

export async function registrarEmpleado(
  payload: EmpleadoFormValues,
  rolCreador: string = "owner"
) {
  // Limpia los datos para cumplir estrictamente con Zod del backend
  const dniLimpio = payload.dni.replace(/\D/g, "");
  const cuilLimpio = payload.cuil.replace(/\D/g, "");

  const bodyParaBackend = {
    email: payload.email.trim().toLowerCase(),
    password: payload.password,
    first_name: payload.nombres.trim(),
    last_name: payload.apellidos.trim(),
    dni: dniLimpio,
    cuil: cuilLimpio,
    role: ROLE_MAPPING[payload.perfil.toLowerCase()] || "cook",
    rol_creador: rolCreador,
  };

  const response = await fetch(`${API_BASE_URL}/usuarios/empleados`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(bodyParaBackend),
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