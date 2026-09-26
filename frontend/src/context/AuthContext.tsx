// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { AppState } from "react-native";
import { Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "../config/supabase";
import { obtenerTokenValido } from "../services/tokenService";
import { guardarTokenEnBackend, sincronizarPushAlIniciarSesion } from "../services/pushNotificationsService";
import { obtenerModuloNotificaciones } from "../services/notificationsGateway";

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

  useEffect(() => {
    if (!sesion?.user?.id) {
      usuarioSincronizado.current = null;
      return;
    }

    const userId = sesion.user.id;
    let sincronizando = false;
    let activo = true;

    const sincronizar = async () => {
      if (!activo || sincronizando || usuarioSincronizado.current === userId) return;

      sincronizando = true;
      usuarioSincronizado.current = userId;
      const sincronizado = await sincronizarPushAlIniciarSesion();
      if (!activo) return;
      if (!sincronizado) {
        usuarioSincronizado.current = null;
      }
      sincronizando = false;
    };

    void sincronizar();
    const suscripcion = AppState.addEventListener("change", (estado) => {
      if (estado === "active") void sincronizar();
    });

    return () => {
      activo = false;
      suscripcion.remove();
    };
  }, [sesion]);

  useEffect(() => {
    if (!sesion?.user?.id) return;

    const Notifications = obtenerModuloNotificaciones();
    if (!Notifications?.addPushTokenListener) return;

    const suscripcion = Notifications.addPushTokenListener((token) => {
      const valor = typeof token === "string" ? token : token?.data;
      if (typeof valor === "string") {
        void guardarTokenEnBackend(valor);
      }
    });

    return () => suscripcion.remove();
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