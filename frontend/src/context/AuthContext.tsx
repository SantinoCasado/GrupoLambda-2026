// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "../config/supabase";
import { obtenerTokenValido } from "../services/tokenService";
import { sincronizarPushAlIniciarSesion } from "../services/pushNotificationsService";

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
  const usuarioSincronizado = useRef<string | null>(null);

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

  // Registra el dispositivo para notificaciones push una sola vez por sesión
  useEffect(() => {
    if (!sesion?.user?.id) return;
    if (usuarioSincronizado.current === sesion.user.id) return;

    usuarioSincronizado.current = sesion.user.id;
    sincronizarPushAlIniciarSesion();
  }, [sesion]);

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