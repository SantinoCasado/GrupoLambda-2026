import { useEffect, useRef } from "react";
import { DeviceMotion } from "expo-sensors";

/** Inclinación (en grados) necesaria para disparar una acción. */
const UMBRAL_GIRO = 20;
/** Inclinación a la que hay que volver para rearmar el eje. */
const UMBRAL_REARME = 8;
/** Separación mínima entre dos acciones (ms). */
const ESPERA_MINIMA_MS = 450;
/** Tiempo que se promedia al entrar para tomar la postura neutra (ms). */
const CALIBRACION_MS = 600;
/** Frecuencia de lectura del sensor (ms). */
const INTERVALO_SENSOR_MS = 80;
/** Ventana para considerar que los giros son "repetidos" (ms). */
const VENTANA_ALTERNANCIA_MS = 1600;
/** Alternancias horizontales que devuelven al primer producto. */
const ALTERNANCIAS_PARA_REINICIAR = 6;

// Si en el dispositivo los sentidos quedan invertidos, alcanza con cambiar
// estos dos valores (1 o -1).
const SIGNO_HORIZONTAL = 1;
const SIGNO_VERTICAL = 1;

const RAD_A_GRADOS = 180 / Math.PI;

type DireccionHorizontal = "izquierda" | "derecha";

interface Callbacks {
  /** Solo se escucha el sensor mientras sea true. */
  activo: boolean;
  /** Inclinación hacia la izquierda: siguiente foto. */
  onIzquierda: () => void;
  /** Inclinación hacia la derecha: foto anterior. */
  onDerecha: () => void;
  /** Inclinación hacia adelante: siguiente producto. */
  onAdelante: () => void;
  /** Inclinación hacia atrás: producto anterior. */
  onAtras: () => void;
  /** Se hicieron suficientes giros alternados: volver al primer producto. */
  onReiniciar: () => void;
  /** Se detectó cualquier gesto (por ejemplo, para ocultar la ayuda). */
  onMovimiento?: () => void;
}

/**
 * Traduce inclinaciones del dispositivo (giroscopio + acelerómetro vía
 * DeviceMotion) en acciones de navegación.
 *
 * - La postura neutra se calibra al activarse, así no importa cómo sostenga
 *   el teléfono cada usuario.
 * - Cada eje dispara una sola vez y se rearma recién cuando vuelve cerca del
 *   neutro (histéresis), evitando ráfagas de eventos.
 */
export function useNavegacionPorMovimiento(callbacks: Callbacks) {
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    if (!callbacks.activo) return;

    let cancelado = false;
    let suscripcion: ReturnType<typeof DeviceMotion.addListener> | null = null;

    // Postura neutra capturada al activarse.
    let beta0 = 0;
    let gamma0 = 0;
    let sumaBeta = 0;
    let sumaGamma = 0;
    let muestrasCalibracion = 0;
    let calibrando = true;
    const inicioCalibracion = Date.now();

    let armadoHorizontal = true;
    let armadoVertical = true;
    let ultimoDisparo = 0;

    let ultimaDireccion: DireccionHorizontal | null = null;
    let alternancias = 0;
    let ultimoHorizontal = 0;

    const iniciar = async () => {
      const disponible = await DeviceMotion.isAvailableAsync();
      if (!disponible || cancelado) return;

      const permiso = await DeviceMotion.requestPermissionsAsync();
      if (!permiso.granted || cancelado) return;

      DeviceMotion.setUpdateInterval(INTERVALO_SENSOR_MS);

      suscripcion = DeviceMotion.addListener((medicion) => {
        if (cancelado || !medicion.rotation) return;

        const beta = medicion.rotation.beta * RAD_A_GRADOS;
        const gamma = medicion.rotation.gamma * RAD_A_GRADOS;
        const ahora = Date.now();

        if (calibrando) {
          sumaBeta += beta;
          sumaGamma += gamma;
          muestrasCalibracion += 1;

          if (
            muestrasCalibracion >= 3 &&
            ahora - inicioCalibracion >= CALIBRACION_MS
          ) {
            beta0 = sumaBeta / muestrasCalibracion;
            gamma0 = sumaGamma / muestrasCalibracion;
            calibrando = false;
          }
          return;
        }

        const deltaHorizontal = (gamma - gamma0) * SIGNO_HORIZONTAL;
        const deltaVertical = (beta - beta0) * SIGNO_VERTICAL;
        const puedeDisparar = ahora - ultimoDisparo >= ESPERA_MINIMA_MS;

        // Rearme: hay que volver cerca de la postura neutra.
        if (Math.abs(deltaHorizontal) < UMBRAL_REARME) armadoHorizontal = true;
        if (Math.abs(deltaVertical) < UMBRAL_REARME) armadoVertical = true;

        if (
          puedeDisparar &&
          armadoHorizontal &&
          Math.abs(deltaHorizontal) > UMBRAL_GIRO
        ) {
          armadoHorizontal = false;
          ultimoDisparo = ahora;

          const direccion: DireccionHorizontal =
            deltaHorizontal > 0 ? "derecha" : "izquierda";

          // Giros alternados y seguidos: cuentan para volver al principio.
          if (
            ultimaDireccion &&
            ultimaDireccion !== direccion &&
            ahora - ultimoHorizontal <= VENTANA_ALTERNANCIA_MS
          ) {
            alternancias += 1;
          } else {
            alternancias = 1;
          }
          ultimaDireccion = direccion;
          ultimoHorizontal = ahora;

          callbacksRef.current.onMovimiento?.();

          if (alternancias >= ALTERNANCIAS_PARA_REINICIAR) {
            alternancias = 0;
            ultimaDireccion = null;
            callbacksRef.current.onReiniciar();
            return;
          }

          if (direccion === "derecha") {
            callbacksRef.current.onDerecha();
          } else {
            callbacksRef.current.onIzquierda();
          }
          return;
        }

        if (
          puedeDisparar &&
          armadoVertical &&
          Math.abs(deltaVertical) > UMBRAL_GIRO
        ) {
          armadoVertical = false;
          ultimoDisparo = ahora;

          callbacksRef.current.onMovimiento?.();

          if (deltaVertical > 0) {
            callbacksRef.current.onAdelante();
          } else {
            callbacksRef.current.onAtras();
          }
        }
      });
    };

    void iniciar();

    return () => {
      cancelado = true;
      suscripcion?.remove();
      suscripcion = null;
    };
    // Solo interesa si está activo: los callbacks se leen desde el ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callbacks.activo]);
}
