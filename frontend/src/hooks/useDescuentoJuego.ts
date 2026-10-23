import { useCallback, useEffect, useRef, useState } from "react";
import { obtenerJugadasPedido, registrarJugadaPedido, juegoGanador } from "../services/juegosService";

/**
 * Estado del descuento de juegos para un pedido:
 * - `cargando`: todavía no se consultó el backend.
 * - `disponible`: nadie ganó el descuento de este pedido; este juego puede otorgarlo.
 * - `ganado`: este juego ya lo ganó (el jugador lo ve asegurado).
 * - `bloqueado`: el descuento ya lo ganó OTRO juego, o el jugador no puede ganarlo
 *   (invitado anónimo o pedido inexistente). La píldora va deshabilitada.
 */
export type EstadoDescuentoJuego = "cargando" | "disponible" | "ganado" | "bloqueado";

export function useDescuentoJuego(params: {
  pedidoId?: string | null;
  clienteId?: string;
  /** false para invitados anónimos: pueden jugar pero nunca ganan descuento. */
  puedeGanar: boolean;
  gameName: string;
}) {
  const { pedidoId, clienteId, puedeGanar, gameName } = params;
  const hayPedido = Boolean(pedidoId);
  const puedeParticipar = puedeGanar && hayPedido;

  const [estado, setEstado] = useState<EstadoDescuentoJuego>(
    puedeParticipar ? "cargando" : "bloqueado"
  );
  const registrandoRef = useRef(false);

  useEffect(() => {
    let activo = true;

    if (!puedeParticipar) {
      setEstado("bloqueado");
      return () => {
        activo = false;
      };
    }

    setEstado("cargando");
    obtenerJugadasPedido(pedidoId as string).then((jugadas) => {
      if (!activo) return;
      const ganador = juegoGanador(jugadas);
      if (!ganador) setEstado("disponible");
      else setEstado(ganador === gameName ? "ganado" : "bloqueado");
    });

    return () => {
      activo = false;
    };
  }, [pedidoId, puedeParticipar, gameName]);

  /**
   * Persiste una victoria al primer intento. Devuelve `true` solo si el backend
   * aplicó el descuento (es decir, no lo había ganado otro juego antes).
   */
  const registrarVictoria = useCallback(
    async (porcentaje: number): Promise<boolean> => {
      if (!puedeParticipar || !clienteId || registrandoRef.current) return false;
      registrandoRef.current = true;

      try {
        const resultado = await registrarJugadaPedido({
          order_id: pedidoId as string,
          client_id: clienteId,
          game_name: gameName,
          discount_percentage: porcentaje,
          won_on_first_try: true,
        });

        const aplicado = Number(resultado?.descuento_aplicado || 0) > 0;
        setEstado(aplicado ? "ganado" : "bloqueado");
        return aplicado;
      } finally {
        registrandoRef.current = false;
      }
    },
    [puedeParticipar, clienteId, pedidoId, gameName]
  );

  return {
    estado,
    registrarVictoria,
    ganado: estado === "ganado",
    bloqueado: estado === "bloqueado",
    disponible: estado === "disponible",
  };
}
