import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  Modal,
  Animated,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Vibration,
  Easing,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { ChineseFrame } from "../components/ChineseFrame";
import { ConfirmModal } from "../components/ConfirmModal";

interface Props {
  onVolver: () => void;
}

type Fase = "reglas" | "jugando" | "moviendo" | "terminado";

const TOTAL = 9;
/** Movimientos óptimos con los que se gana el 15%. */
const PAR = 20;
/** Cantidad de movimientos legales del mezclado. Impar: nunca puede quedar resuelto. */
const PASOS_MEZCLA = 31;
const MS_MOVIMIENTO = 150;
const GAP = 8;

/** Estado ordenado: el 0 es el hueco y siempre queda en la última celda. */
const RESUELTO = [1, 2, 3, 4, 5, 6, 7, 8, 0];

const anchoPantalla = Dimensions.get("window").width;
/** El ancho descuenta el padding del ScrollView y las separaciones. */
const CELDA = Math.floor(
  Math.min(108, (anchoPantalla - 40 - GAP * (3 - 1)) / 3)
);
const PASO = CELDA + GAP;
const LADO_TABLERO = CELDA * 3 + GAP * 2;

/** Celdas vecinas ortogonales de una celda. */
const adyacentes = (celda: number) =>
  [celda - 3, celda - 1, celda + 1, celda + 3].filter(
    (i) =>
      i >= 0 &&
      i < TOTAL &&
      Math.abs(Math.floor(i / 3) - Math.floor(celda / 3)) +
        Math.abs((i % 3) - (celda % 3)) ===
        1
  );

const sonVecinos = (a: number, b: number) => adyacentes(a).includes(b);

/** Parte del estado ordenado y camina legal: todo tablero así es resoluble. */
const mezclar = (pasos: number) => {
  const tablero = [...RESUELTO];
  let hueco = TOTAL - 1;
  for (let i = 0; i < pasos; i++) {
    const opciones = adyacentes(hueco);
    const destino = opciones[Math.floor(Math.random() * opciones.length)];
    [tablero[hueco], tablero[destino]] = [tablero[destino], tablero[hueco]];
    hueco = destino;
  }
  return tablero;
};

const estaResuelto = (tablero: number[]) =>
  tablero.every((id, celda) => id === RESUELTO[celda]);

/** Esquina superior izquierda de una celda dentro del tablero. */
const posDe = (celda: number) => ({
  x: (celda % 3) * PASO,
  y: Math.floor(celda / 3) * PASO,
});

/** Anima un valor y resuelve al terminar, para poder encadenar pasos. */
const animar = (
  valor: Animated.Value,
  toValue: number,
  duration: number,
  easing: (v: number) => number = Easing.out(Easing.quad)
) =>
  new Promise<void>((resolve) => {
    Animated.timing(valor, { toValue, duration, easing, useNativeDriver: true }).start(() =>
      resolve()
    );
  });

const crearValores = (cantidad: number, valor: number) =>
  Array.from({ length: cantidad }, () => new Animated.Value(valor));

const INSIGNIAS = {
  ganada: { fondo: "bg-[#10b981]", texto: "text-white" },
  disponible: { fondo: "bg-mostaza", texto: "text-vino" },
  perdida: { fondo: "bg-stone-100", texto: "text-stone-500" },
};

const MENSAJES: Record<Fase, string> = {
  reglas: "Tocá comenzar para jugar",
  jugando: "Tocá la ficha junto al hueco",
  moviendo: "Un momento…",
  terminado: "¡Ordenado!",
};

export function PuzzleScreen({ onVolver }: Props) {
  // La partida inicial y sus posiciones se sortean una sola vez, en el primer
  // render, así no hay un primer cuadro con todas las fichas apiladas.
  const [inicio] = useState(() => {
    const base = mezclar(PASOS_MEZCLA);
    const x: Animated.Value[] = [];
    const y: Animated.Value[] = [];
    for (let id = 0; id < TOTAL; id++) {
      const p = posDe(base.indexOf(id));
      x.push(new Animated.Value(p.x));
      y.push(new Animated.Value(p.y));
    }
    return { base, x, y };
  });
  const animX = inicio.x;
  const animY = inicio.y;
  const [escala] = useState(() => crearValores(TOTAL, 1));

  const [fase, setFase] = useState<Fase>("reglas");
  // 1 = primer intento; sube cada vez que se reinicia el tablero.
  const [intentos, setIntentos] = useState(1);
  const [movimientos, setMovimientos] = useState(0);
  const [aciertoEnPar, setAciertoEnPar] = useState(false);
  const [premioGanado, setPremioGanado] = useState(false);
  const [mostrarReinicio, setMostrarReinicio] = useState(false);
  /** Copia visible del tablero: las fichas apagadas se recalculan al mover. */
  const [tablero, setTablero] = useState<number[]>(inicio.base);
  /** Estado inicial de la partida en curso: reiniciar vuelve acá, no al montaje. */
  const [tableroInicial, setTableroInicial] = useState<number[]>(inicio.base);
  /** El 15% se gana una sola vez por pedido, aunque después se juegue de nuevo. */
  const [oportunidadUsada, setOportunidadUsada] = useState(false);

  /** Se leen dentro de la animación, donde el estado todavía no cambió. */
  const tableroRef = useRef<number[]>(inicio.base);
  /** `faseRef` evita leer un estado viejo entre pasos asíncronos. */
  const faseRef = useRef<Fase>("reglas");
  const montadoRef = useRef(true);

  const cambiarFase = useCallback((nueva: Fase) => {
    faseRef.current = nueva;
    setFase(nueva);
  }, []);

  useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
    };
  }, []);

  /** Coloca todas las fichas en su celda, sin animación. */
  const fijar = useCallback(
    (base: number[]) => {
      base.forEach((id, celda) => {
        const p = posDe(celda);
        animX[id].setValue(p.x);
        animY[id].setValue(p.y);
        escala[id].setValue(1);
      });
    },
    [animX, animY, escala]
  );

  /**
   * Arranca una partida. Reiniciar conserva el mismo tablero sorteado, así que
   * `intentos` solo sube ahí: nunca vuelve a 1 y el 15% no vuelve a jugarse.
   */
  const empezar = useCallback(
    (mismaPartida: boolean) => {
      const base = mismaPartida ? tableroInicial : mezclar(PASOS_MEZCLA);
      // "Jugar de nuevo" deja esa partida como la nueva base reiniciable.
      if (!mismaPartida) setTableroInicial(base);
      fijar(base);
      tableroRef.current = base;
      setTablero(base);
      setMovimientos(0);
      setAciertoEnPar(false);
      if (mismaPartida) setIntentos((i) => i + 1);
      cambiarFase("jugando");
    },
    [fijar, cambiarFase, tableroInicial]
  );

  /** Pulso de celebración al resolver, ficha por ficha. */
  const celebrar = useCallback(() => {
    const pulsos = [1, 2, 3, 4, 5, 6, 7, 8].map((id) =>
      Animated.sequence([
        Animated.timing(escala[id], {
          toValue: 1.12,
          duration: 130,
          useNativeDriver: true,
        }),
        Animated.timing(escala[id], {
          toValue: 1,
          duration: 130,
          useNativeDriver: true,
        }),
      ])
    );
    Animated.stagger(55, pulsos).start();
  }, [escala]);

  const tocarFicha = async (id: number) => {
    // El ref ya quedó en "moviendo": un segundo toque no entra.
    if (faseRef.current !== "jugando") return;

    const tablero = tableroRef.current;
    const celdaFicha = tablero.indexOf(id);
    const celdaHueco = tablero.indexOf(0);
    // Las fichas lejanas no se mueven: no hay estado inválido que manejar.
    if (!sonVecinos(celdaFicha, celdaHueco)) return;

    cambiarFase("moviendo");
    Vibration.vibrate([0, 40]);

    const destino = posDe(celdaHueco);
    const nuevoHueco = posDe(celdaFicha);
    await Promise.all([
      animar(animX[id], destino.x, MS_MOVIMIENTO),
      animar(animY[id], destino.y, MS_MOVIMIENTO),
      animar(animX[0], nuevoHueco.x, MS_MOVIMIENTO),
      animar(animY[0], nuevoHueco.y, MS_MOVIMIENTO),
    ]);
    if (!montadoRef.current) return;

    const siguiente = [...tablero];
    siguiente[celdaHueco] = id;
    siguiente[celdaFicha] = 0;
    tableroRef.current = siguiente;
    setTablero(siguiente);
    const pasos = movimientos + 1;
    setMovimientos(pasos);

    if (estaResuelto(siguiente)) {
      Vibration.vibrate([0, 80, 60, 150]);
      celebrar();
      setAciertoEnPar(pasos <= PAR);
      // El valor leído acá es el de antes de esta jugada, así que la primera
      // partida todavía puede ganarse el 15%; terminarla lo gasta para siempre
      // y ni un reinicio ni otro "Jugar de nuevo" lo devuelven.
      const gana = !oportunidadUsada && intentos === 1 && pasos <= PAR;
      setOportunidadUsada(true);
      if (gana) setPremioGanado(true);
      cambiarFase("terminado");
      return;
    }

    cambiarFase("jugando");
  };

  /** El 15% sigue disponible: primer intento y todavía sin gastar la oportunidad. */
  const premioDisponible =
    intentos === 1 && !oportunidadUsada && fase !== "terminado";
  const insignia = premioGanado
    ? INSIGNIAS.ganada
    : premioDisponible
    ? INSIGNIAS.disponible
    : INSIGNIAS.perdida;

  const movibles = adyacentes(tablero.indexOf(0));

  return (
    <View className="flex-1">
      <StatusBar style="light" />

      {/* Instrucciones: se muestran al entrar a la pantalla */}
      <Modal visible={fase === "reglas"} transparent animationType="fade" onRequestClose={() => empezar(false)}>
        <View className="flex-1 items-center justify-center bg-black/60 px-6">
          <ChineseFrame className="w-full max-w-sm bg-vino shadow-2xl p-3">
            <View className="items-center rounded-xl bg-mostaza/15 px-4 py-6">
              <Image
                source={require("../../assets/images/games/puzzle-image.png")}
                className="mb-4 h-20 w-20"
                resizeMode="contain"
              />
              <Text
                style={{ fontFamily: "LaOriental" }}
                className="mb-3 text-center text-xl uppercase tracking-wide text-mostaza"
              >
                Cómo jugar
              </Text>
              <Text className="mb-6 text-center text-sm font-medium leading-5 text-amber-100">
                Deslizá las fichas hasta ordenarlas del 1 al 8. Solo se mueven las que están al
                lado del hueco. Si lo resolvés en {PAR} movimientos o menos al primer intento, ganás
                un 15% de descuento en tu pedido.
              </Text>

              <TouchableOpacity
                onPress={() => empezar(false)}
                className="w-full rounded-2xl bg-mostaza py-3.5 active:bg-amber-600"
              >
                <Text
                  style={{ fontFamily: "LaOriental" }}
                  className="text-center uppercase tracking-wider text-vino"
                >
                  Comenzar
                </Text>
              </TouchableOpacity>
            </View>
          </ChineseFrame>
        </View>
      </Modal>

      {/* Resultado de la partida: ofrece repetir o volver a Juegos */}
      <Modal visible={fase === "terminado"} transparent animationType="fade" onRequestClose={onVolver}>
        <View className="flex-1 items-center justify-center bg-black/60 px-6">
          <ChineseFrame className="w-full max-w-sm bg-vino shadow-2xl p-3">
            <View className="items-center rounded-xl bg-mostaza/15 px-4 py-6">
              <Image
                source={require("../../assets/images/games/tiles-logo.png")}
                className="mb-4 h-20 w-20"
                resizeMode="contain"
              />
              <Text
                style={{ fontFamily: "LaOriental" }}
                className="mb-3 text-center text-xl uppercase tracking-wide text-mostaza"
              >
                {aciertoEnPar && intentos === 1 ? "¡Felicidades!" : "¡Resuelto!"}
              </Text>
              <Text className="mb-6 text-center text-sm font-medium leading-5 text-amber-100">
                {aciertoEnPar && intentos === 1
                  ? `¡Ordenaste las fichas en ${movimientos} movimientos y ganaste un 15% de descuento en tu pedido!`
                  : aciertoEnPar
                  ? `Ordenaste las fichas en ${movimientos} movimientos, pero el 15% se ganaba solo sin reiniciar el tablero.`
                  : `Ordenaste las fichas en ${movimientos} movimientos. El 15% era para resolverlo en ${PAR} o menos al primer intento.`}
              </Text>

              <View className="w-full flex-row gap-3">
                <TouchableOpacity
                  onPress={() => empezar(false)}
                  className="flex-1 items-center rounded-2xl bg-mostaza py-3.5 active:bg-amber-600"
                >
                  <Text
                    style={{ fontFamily: "LaOriental" }}
                    className="text-center uppercase tracking-wider text-vino"
                  >
                    Jugar de nuevo
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={onVolver}
                  className="flex-1 items-center justify-center rounded-2xl border border-vino bg-mostaza/20 py-3.5 active:opacity-80"
                >
                  <Text
                    style={{ fontFamily: "LaOriental" }}
                    className="text-center uppercase tracking-wider text-mostaza"
                  >
                    Volver
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ChineseFrame>
        </View>
      </Modal>

      {/* Aviso antes de reiniciar: reiniciar quema el 15% */}
      <ConfirmModal
        visible={mostrarReinicio}
        titulo="Reiniciar el puzzle?"
        mensaje={
          intentos === 1
            ? "Si reiniciás, perdés el 15% de descuento: solo se gana resolviendo el puzzle al primer intento."
            : "El 15% ya no está disponible. Podés reiniciar el mismo puzzle para seguir practicando."
        }
        textoConfirmar="Sí, reiniciar"
        textoCancelar="Seguir jugando"
        tipo={intentos === 1 ? "peligro" : "confirmar"}
        onConfirm={() => {
          // Si no se cierra, el aviso queda arriba del tablero que recién arrancó.
          setMostrarReinicio(false);
          empezar(true);
        }}
        onCancel={() => setMostrarReinicio(false)}
      />

      {/* Cabecera */}
      <View className="px-5 pt-4">
        <View className="mb-4">
          <Image
            source={require("../../assets/images/logo-name.png")}
            className="h-16 w-auto self-center"
            resizeMode="contain"
          />
          <Image
            source={require("../../assets/images/separator.png")}
            className="my-2 h-5 w-full"
            resizeMode="contain"
          />
          <ChineseFrame className="mt-2 bg-vino">
            <View className="relative items-center rounded-xl bg-mostaza/15 px-4 py-4">
              <Text style={{ fontFamily: "LaOriental" }} className="text-2xl text-mostaza uppercase">
                Rompecabezas
              </Text>
              <Text className="mt-1 text-xs font-semibold text-amber-100">
                {premioGanado
                  ? "¡Descuento asegurado! Ahora jugá por diversión."
                  : premioDisponible
                  ? `Ordená las fichas en ${PAR} movimientos o menos y ganá un 15% de descuento`
                  : intentos > 1
                  ? "Reiniciaste el tablero y el 15% ya no está disponible."
                  : `El 15% se ganaba ordenando en ${PAR} movimientos o menos al primer intento.`}
              </Text>

              <View
                className={`absolute right-5 top-4 rounded-full px-2.5 py-1 ${insignia.fondo}`}
              >
                <Text
                  style={{ fontFamily: "LaOriental" }}
                  className={`text-center text-xs uppercase ${insignia.texto}`}
                >
                  -15%
                </Text>
              </View>
            </View>
          </ChineseFrame>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="my-4 flex-row items-center justify-between rounded-2xl border border-mostaza/40 bg-vino px-4 py-3">
          <Text className="text-xs font-semibold uppercase text-amber-100">{MENSAJES[fase]}</Text>
          <Text style={{ fontFamily: "LaOriental" }} className="text-base text-mostaza">
            {movimientos} / {PAR}
          </Text>
        </View>

        {/* Tablero: el hueco es la ficha 0 y se desliza con las demás. */}
        <View
          style={{ width: LADO_TABLERO, height: LADO_TABLERO, alignSelf: "center", marginTop: 8 }}
        >
          {animX.map((x, id) => (
            <Animated.View
              key={id}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: CELDA,
                height: CELDA,
                transform: [
                  { translateX: x },
                  { translateY: animY[id] },
                  { scale: escala[id] },
                ],
              }}
            >
              {id === 0 ? (
                <View className="flex-1 rounded-2xl border-2 border-dashed border-mostaza/40" />
              ) : (
                <TouchableOpacity
                  onPress={() => tocarFicha(id)}
                  disabled={fase !== "jugando"}
                  activeOpacity={0.75}
                  className={`flex-1 items-center justify-center rounded-2xl border-2 border-vino bg-mostaza ${
                    // Solo se mueven las vecinas al hueco: el resto se ve apagado.
                    movibles.includes(tablero.indexOf(id)) ? "" : "opacity-50"
                  }`}
                >
                  <Text style={{ fontFamily: "LaOriental" }} className="text-4xl text-vino">
                    {id}
                  </Text>
                </TouchableOpacity>
              )}
            </Animated.View>
          ))}
        </View>

        {fase === "jugando" && (
          <TouchableOpacity
            onPress={() => setMostrarReinicio(true)}
            className="mt-8 w-[90%] self-center items-center justify-center rounded-2xl border border-mostaza/60 bg-vino py-3 active:bg-vino/80"
          >
            <Text
              style={{ fontFamily: "LaOriental" }}
              className="text-center uppercase tracking-wider text-mostaza"
            >
              Reiniciar
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}