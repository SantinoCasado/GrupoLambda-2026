import { USUARIOS_PRECARGADOS, UsuarioSeed } from "../data/usuariosPrecargados";

export async function loginMock(email: string, clave: string): Promise<UsuarioSeed> {
  await new Promise((resolve) => setTimeout(resolve, 900));

  const usuarioEncontrado = USUARIOS_PRECARGADOS.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.clave === clave
  );

  if (!usuarioEncontrado) {
    throw new Error("Credenciales inválidas. Verifique correo y clave.");
  }

  return usuarioEncontrado;
}