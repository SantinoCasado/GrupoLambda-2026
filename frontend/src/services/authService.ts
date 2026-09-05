// import { API_BASE_URL } from "./apiConfig";
// import { USUARIOS_PRECARGADOS, UsuarioSeed } from "../data/usuariosPrecargados";

// export async function login(email: string, clave: string): Promise<UsuarioSeed> {
//   const urlDestino = `${API_BASE_URL}/usuarios/login`;

//   try {
//     const response = await fetch(urlDestino, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         email: email.trim().toLowerCase(),
//         password: clave.trim(),
//       }),
//     });

//     const data = await response.json();

//     if (!response.ok) {
//       throw new Error(data.message || data.error || "Credenciales inválidas.");
//     }

//     const userData = data.user || data.data || data.usuario || data;
//     const rol = (userData.role || userData.perfil || "cliente_registrado").toLowerCase();

//     return {
//       id: userData.id || "usr_db",
//       email: userData.email || email,
//       clave: clave,
//       perfil: rol as any,
//       tituloVisual: rol.charAt(0).toUpperCase() + rol.slice(1),
//       nombres: userData.nombre || userData.nombres || "Usuario",
//       apellidos: userData.apellido || userData.apellidos || "",
//       documento: userData.documento || userData.dni || "00000000",
//       foto: userData.foto || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400",
//       icono: "👤",
//     };
//   } catch (error: any) {
//     console.warn("Error en login:", error.message);
//     throw new Error(error.message || "Error al conectar con el servidor.");
//   }
// }
// src/services/authService.ts
import { USUARIOS_PRECARGADOS, UsuarioSeed } from "../data/usuariosPrecargados";

export async function login(email: string, clave: string): Promise<UsuarioSeed> {
  // Simulación rápida mientras el backend suma el endpoint de login
  await new Promise((resolve) => setTimeout(resolve, 500));

  const usuario = USUARIOS_PRECARGADOS.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.clave === clave
  );

  if (!usuario) {
    throw new Error("Credenciales inválidas. Verifique correo y contraseña.");
  }

  return usuario;
}