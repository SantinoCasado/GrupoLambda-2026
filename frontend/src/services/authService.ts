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
import { USUARIOS_PRECARGADOS, UsuarioSeed, PerfilUsuario } from "../data/usuariosPrecargados";
import { getSupabaseClient, isSupabaseConfigured } from "../config/supabase";

// Mapea el rol en inglés (tabla 'users') al perfil en español del frontend
const ROLE_TO_PERFIL: Record<string, PerfilUsuario> = {
  owner: "dueño",
  supervisor: "supervisor",
  cook: "cocinero",
  bartender: "cantinero",
  waiter: "mozo",
  maitre: "metre",
  delivery: "mozo",
  cliente: "cliente_registrado",
  cliente_registrado: "cliente_registrado",
  cliente_anonimo: "cliente_anonimo",
};

// Intenta autenticar contra Supabase Auth directamente (sin endpoint propio del backend)
async function loginConSupabase(email: string, clave: string): Promise<UsuarioSeed> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password: clave.trim(),
  });

  if (error || !data.user) {
    throw new Error(error?.message || "Credenciales inválidas.");
  }

  // Obtener el perfil desde la tabla pública 'users'
  const { data: perfil, error: perfilError } = await supabase
    .from("users")
    .select("*")
    .eq("id", data.user.id)
    .maybeSingle();

  if (perfilError || !perfil) {
    throw new Error("No se encontró el perfil del usuario en la base de datos.");
  }

  const rol = (perfil.role || "").toLowerCase();
  const perfilUsuario: PerfilUsuario = ROLE_TO_PERFIL[rol] || "cliente_registrado";
  const esSinFoto = perfilUsuario === "dueño" || perfilUsuario === "supervisor";

  return {
    id: perfil.id || data.user.id,
    email: perfil.email || email,
    clave: clave,
    perfil: perfilUsuario,
    tituloVisual: perfilUsuario.charAt(0).toUpperCase() + perfilUsuario.slice(1),
    nombres: perfil.first_name || perfil.nombre || "Usuario",
    apellidos: perfil.last_name || perfil.apellido || "",
    documento: perfil.dni || "00000000",
    foto: esSinFoto ? "" : perfil.photo_url || "",
    icono: "👤",
  };
}

// Login local contra los usuarios precargados (fallback para demos sin Supabase configurado)
async function loginLocal(email: string, clave: string): Promise<UsuarioSeed> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const usuario = USUARIOS_PRECARGADOS.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.clave === clave
  );

  if (!usuario) {
    throw new Error("Credenciales inválidas. Verifique correo y contraseña.");
  }

  return usuario;
}

export async function login(email: string, clave: string): Promise<UsuarioSeed> {
  // 1. Si Supabase está configurado, intentamos autenticar por Auth primero.
  if (isSupabaseConfigured) {
    try {
      return await loginConSupabase(email, clave);
    } catch (error: any) {
      console.warn("Login Supabase falló, usando fallback local:", error.message);
    }
  }

  // 2. Fallback local para usuarios precargados (demostración / sin backend).
  return loginLocal(email, clave);
}