export type PerfilUsuario =
  | "dueño"
  | "supervisor"
  | "metre"
  | "mozo"
  | "cocinero"
  | "cantinero"
  | "cliente_registrado"
  | "cliente_anonimo";

export interface UsuarioSeed {
  id: string;
  perfil: PerfilUsuario;
  tituloVisual: string;
  email: string;
  clave: string;
  nombres: string;
  apellidos: string;
  documento: string;
  foto: string;
  icono: string;
}

export const USUARIOS_PRECARGADOS: UsuarioSeed[] = [
  {
    id: "usr_dueno",
    perfil: "dueño",
    tituloVisual: "Dueño",
    email: "dueno@restaurante.com",
    clave: "123456",
    nombres: "Carlos",
    apellidos: "Rodríguez",
    documento: "20301112224",
    foto: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400",
    icono: "👑",
  },
  {
    id: "usr_supervisor",
    perfil: "supervisor",
    tituloVisual: "Supervisor",
    email: "supervisor@restaurante.com",
    clave: "123456",
    nombres: "Mariana",
    apellidos: "López",
    documento: "27332221114",
    foto: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400",
    icono: "📋",
  },
  {
    id: "usr_metre",
    perfil: "metre",
    tituloVisual: "Metre",
    email: "metre@restaurante.com",
    clave: "123456",
    nombres: "Esteban",
    apellidos: "Gómez",
    documento: "20354443332",
    foto: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400",
    icono: "🛎️",
  },
  {
    id: "usr_mozo",
    perfil: "mozo",
    tituloVisual: "Mozo",
    email: "mozo@restaurante.com",
    clave: "123456",
    nombres: "Facundo",
    apellidos: "Martínez",
    documento: "20395556661",
    foto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
    icono: "🍽️",
  },
  {
    id: "usr_cocinero",
    perfil: "cocinero",
    tituloVisual: "Cocinero",
    email: "cocinero@restaurante.com",
    clave: "123456",
    nombres: "Gonzalo",
    apellidos: "Fernández",
    documento: "20367778889",
    foto: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400",
    icono: "👨‍🍳",
  },
  {
    id: "usr_cantinero",
    perfil: "cantinero",
    tituloVisual: "Cantinero",
    email: "cantinero@restaurante.com",
    clave: "123456",
    nombres: "Lucía",
    apellidos: "Paz",
    documento: "27389990001",
    foto: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400",
    icono: "🍸",
  },
  {
    id: "usr_cliente_reg",
    perfil: "cliente_registrado",
    tituloVisual: "Cliente Registrado",
    email: "cliente@restaurante.com",
    clave: "123456",
    nombres: "Javier",
    apellidos: "Morales",
    documento: "40123987",
    foto: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400",
    icono: "👤",
  },
  {
    id: "usr_cliente_anon",
    perfil: "cliente_anonimo",
    tituloVisual: "Cliente Anónimo",
    email: "anonimo@restaurante.com",
    clave: "123456",
    nombres: "Invitado",
    apellidos: "Anónimo",
    documento: "00000000",
    foto: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400",
    icono: "🕶️",
  },
];