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

// Estructura ligera para el acceso rápido (solo email y contraseña).
// El resto del perfil (nombres, apellidos, perfil, dni, foto) se obtiene
// desde la base de datos al iniciar sesión (loginConSupabase).
export interface AccesoRapido {
  id: string;
  tituloVisual: string;
  icono: string;
  email: string;
  clave: string;
}

export const ACCESOS_RAPIDOS: AccesoRapido[] = [
  {
    id: "acceso_dueno",
    tituloVisual: "Dueño",
    icono: "👑",
    email: "santino@lambda.com",
    clave: "password123",
  },
  {
    id: "acceso_supervisor",
    tituloVisual: "Supervisor",
    icono: "📋",
    email: "supervisorTest@lambda.com",
    clave: "supervisor1",
  },
  {
    id: "acceso_metre",
    tituloVisual: "Metre",
    icono: "🛎️",
    email: "metre@restaurante.com",
    clave: "123456",
  },
  {
    id: "acceso_mozo",
    tituloVisual: "Mozo",
    icono: "🍽️",
    email: "jojeda@restaurante.com",
    clave: "123456",
  },
  {
    id: "acceso_cocinero",
    tituloVisual: "Cocinero",
    icono: "👨‍🍳",
    email: "ogarcia@restaurante.com",
    clave: "123456",
  },
  {
    id: "acceso_cantinero",
    tituloVisual: "Cantinero",
    icono: "🍸",
    email: "fmartin@restaurante.com",
    clave: "123456",
  },
  {
    id: "acceso_cliente",
    tituloVisual: "Cliente Registrado",
    icono: "👤",
    email: "expo@go.com",
    clave: "123456",
  },
];

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
    foto: "",
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
    foto: "",
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
    id: "e1175b52-bd2f-4287-aaa8-54fa03c42e3c",
    perfil: "cliente_registrado",
    tituloVisual: "Cliente Registrado",
    email: "expo@go.com",
    clave: "123456",
    nombres: "Expo",
    apellidos: "Go",
    documento: "50505050",
    foto: "https://lxrgtjaqczpacjkvxnuw.supabase.co/storage/v1/object/public/fotos_usuarios/1790041252312-e7fc5a7f-cd92-458d-9b66-f162fea96fcd.jpg",
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