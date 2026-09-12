// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "../config/supabase";
import { obtenerTokenValido } from "../services/tokenService";

interface AuthContextValue {
  sesion: Session | null;
  cargandoSesion: boolean;
  tokenValido: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabaseClient();
  const [sesion, setSesion] = useState<Session | null>(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setCargandoSesion(false);
      return;
    }

    let activo = true;

    supabase.auth.getSession().then(({ data }) => {
      if (activo) {
        setSesion(data.session);
        setCargandoSesion(false);
      }
    });

    // Mantiene la sesión al día (login, expiración, cierre) y renueva el token en el fondo
    const { data: suscripcion } = supabase.auth.onAuthStateChange((evento, sesionActual) => {
      if (!activo) return;
      setSesion(evento === "SIGNED_OUT" ? null : sesionActual);
    });

    return () => {
      activo = false;
      suscripcion.subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <AuthContext.Provider
      value={{ sesion, cargandoSesion, tokenValido: () => obtenerTokenValido() }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error("useAuth debe usarse dentro de un <AuthProvider>.");
  }
  return contexto;
}