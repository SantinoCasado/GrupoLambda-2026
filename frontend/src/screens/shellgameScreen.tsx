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

interface Props {
  onVolver: () => void;
}

type Fase = "reglas" | "previo" | "mezclando" | "elegir" | "revelando";

const VASO = require("../../assets/images/games/cup.png");
const BOLA = require("../../assets/images/games/ball.png");

const CANTIDAD_VASOS = 3;
/** Cantidad de intercambios de la ronda: define la dificultad del mezclado. */
const INTERCAMBIOS = 5;
const MS_INTERCAMBIO = 170;
const MS_PREVIO = 1300;
const MS_LEVANTE = 240;
const MS_ACIERTO = 900;
const MS_FALLO = 1400;
const MS_ESPERA = 250;
const GAP = 12;
/** Holgura para que la inclinación del vaso no se corte en los bordes. */
/** Holgura para que la inclinación del vaso no se corte en los bordes. */
const MARGEN = 12;
/** Holgura bajo la línea de apoyo, donde el vaso inclinado se sale un poco. */
const BASE = 8;
const TILT = -8;

const anchoPantalla = Dimensions.get("window").width;
/** El ancho del tablero descuenta el padding del ScrollView y los márgenes. */
const ANCHO_VASO = Math.floor(
  Math.min(100, (anchoPantalla - 40 - 2 * GAP - 2 * MARGEN) / CANTIDAD_VASOS)
);
const ALTO_VASO = Math.round((ANCHO_VASO * 219) / 160);
const PASO = ANCHO_VASO + GAP;
const RADIO_BOLA = Math.round(ANCHO_VASO * 0.45);
/** Cuánto sube el vaso: lo justo para dejar la bolita a la vista. */
const LEVANTE = RADIO_BOLA + 6;
const ANCHO_TABLERO =
  ANCHO_VASO * CANTIDAD_VASOS + GAP * (CANTIDAD_VASOS - 1) + MARGEN * 2;
const ALTO_TABLERO = ALTO_VASO + LEVANTE + BASE + MARGEN;

/** Desplazamiento horizontal de un vaso según el slot que ocupa. */
const xDeSlot = (slot: number) => MARGEN + slot * PASO;

/** Centra la bolita bajo el vaso del slot indicado. */
const xBolaDe = (slot: number) => xDeSlot(slot) + (ANCHO_VASO - RADIO_BOLA) / 2;

const esperar = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Anima un valor y resuelve al terminar, para poder encadenar pasos. */
const animar = (
  valor: Animated.Value,
  toValue: number,
  duration: number,
  easing: (v: number) => number = Easing.inOut(Easing.quad)
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
  previo: "Mirá dónde está la bolita",
  mezclando: "Mezclando…",
  elegir: "Ahora tocá un vaso",
  revelando: "Un momento…",
};

export function ShellGameScreen({ onVolver }: Props) {
  const [fase, setFase] = useState<Fase>("reglas");
  // Ronda actual: la sube "Jugar de nuevo".
  const [ronda, setRonda] = useState(1);
  // Toques de la ronda: cada acierto o fallo suma uno.
  const [intentos, setIntentos] = useState(1);
  const [terminado, setTerminado] = useState(false);
  // El acierto en el primer intento es de la ronda; el premio es de la sesión.
  const [aciertoEnPrimerIntento, setAciertoEnPrimerIntento] = useState(false);
  const [premioGanado, setPremioGanado] = useState(false);

  /** Corta las cadenas de animación si la pantalla se desmonta. */
  const montadoRef = useRef(true);
  /** `faseRef` evita leer un estado viejo dentro de los pasos asíncronos. */
  const faseRef = useRef<Fase>("reglas");
  /** `ordenRef[slot] = id del vaso`: base del mezclado, no provoca renders. */
  const ordenRef = useRef<number[]>([0, 1, 2]);
  const bolitaVasoRef = useRef<number>(0);

  const [xVasos] = useState(() =>
    Array.from({ length: CANTIDAD_VASOS }, (_, i) => new Animated.Value(xDeSlot(i)))
  );
  const [yVasos] = useState(() => crearValores(CANTIDAD_VASOS, 0));
  const [rotVasos] = useState(() => crearValores(CANTIDAD_VASOS, 0));
  const [xBola] = useState(() => new Animated.Value(0));
  const [opBola] = useState(() => new Animated.Value(0));
  const [escBola] = useState(() => new Animated.Value(0.6));

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

  /** Baja todos los vasos y oculta la bolita. */
  const tapar = useCallback(async () => {
    await Promise.all([
      ...yVasos.map((v) => animar(v, 0, MS_LEVANTE)),
      ...rotVasos.map((v) => animar(v, 0, MS_LEVANTE)),
      animar(opBola, 0, 200),
    ]);
    escBola.setValue(0.6);
  }, [opBola, escBola, yVasos, rotVasos]);

  /** Levanta los vasos indicados y muestra la bolita. */
  const levantar = useCallback(
    async (ids: number[]) => {
      await Promise.all([
        ...ids.map((i) => animar(yVasos[i], -LEVANTE, MS_LEVANTE, Easing.out(Easing.back(1.3)))),
        ...ids.map((i) => animar(rotVasos[i], TILT, MS_LEVANTE)),
        animar(escBola, 1, 300, Easing.out(Easing.back(2))),
      ]);
      await animar(opBola, 1, 200);
    },
    [yVasos, rotVasos, escBola, opBola]
  );

  /** Intercambia dos slots al azar varias veces. */
  const mezclar = useCallback(async () => {
    for (let i = 0; i < INTERCAMBIOS; i++) {
      const a = Math.floor(Math.random() * CANTIDAD_VASOS);
      let b = Math.floor(Math.random() * CANTIDAD_VASOS);
      if (b === a) b = (a + 1) % CANTIDAD_VASOS;
      const va = ordenRef.current[a];
      const vb = ordenRef.current[b];
      await Promise.all([
        animar(xVasos[va], xDeSlot(b), MS_INTERCAMBIO),
        animar(xVasos[vb], xDeSlot(a), MS_INTERCAMBIO),
      ]);
      ordenRef.current[a] = vb;
      ordenRef.current[b] = va;
      if (!montadoRef.current) return;
    }
  }, [xVasos]);

  /** Reparte la bolita, la muestra un instante y recién ahí mezcla. */
  const iniciarRonda = useCallback(async () => {
    ordenRef.current = [0, 1, 2];
    bolitaVasoRef.current = Math.floor(Math.random() * CANTIDAD_VASOS);
    xVasos.forEach((v, i) => v.setValue(xDeSlot(i)));
    yVasos.forEach((v) => v.setValue(0));
    rotVasos.forEach((v) => v.setValue(0));
    opBola.setValue(0);
    escBola.setValue(0.6);
    setTerminado(false);

    // 1. Muestra dónde arranca la bolita.
    cambiarFase("previo");
    xBola.setValue(xBolaDe(ordenRef.current.indexOf(bolitaVasoRef.current)));
    await levantar([bolitaVasoRef.current]);
    if (!montadoRef.current) return;
    await esperar(MS_PREVIO);
    if (!montadoRef.current) return;

    // 2. Tapa la bolita y mezcla los vasos.
    await tapar();
    if (!montadoRef.current) return;
    cambiarFase("mezclando");
    await mezclar();
    if (!montadoRef.current) return;
    xBola.setValue(xBolaDe(ordenRef.current.indexOf(bolitaVasoRef.current)));
    await esperar(MS_ESPERA);
    if (!montadoRef.current) return;
    cambiarFase("elegir");
  }, [
    xVasos,
    yVasos,
    rotVasos,
    xBola,
    opBola,
    escBola,
    cambiarFase,
    levantar,
    tapar,
    mezclar,
  ]);

  /** El 25% sigue disponible: primer intento de la primera ronda. */
  const intentoDisponible = ronda === 1 && intentos === 1;

  const elegirVaso = async (vaso: number) => {
    // El toque se valida contra el ref: dos toques seguidos no pasan.
    if (faseRef.current !== "elegir") return;
    cambiarFase("revelando");
    Vibration.vibrate([0, 40]);

    const acierto = vaso === bolitaVasoRef.current;
    // El 25% se gana solo con el primer intento de la primera ronda.
    const premioEnJuego = intentoDisponible;
    // El intento solo sube al fallar: en un acierto queda el que se usó.
    if (!acierto) setIntentos((i) => i + 1);

    if (acierto) {
      setAciertoEnPrimerIntento(premioEnJuego);
      if (premioEnJuego) setPremioGanado(true);
      Vibration.vibrate([0, 80, 60, 150]);
      await levantar([vaso]);
      if (!montadoRef.current) return;
      await esperar(MS_ACIERTO);
    } else {
      // Al fallar se levantan los dos: el elegido vacío y el de la bolita.
      Vibration.vibrate([0, 100, 50, 100]);
      await levantar([vaso, bolitaVasoRef.current]);
      if (!montadoRef.current) return;
      await esperar(MS_FALLO);
    }
    if (!montadoRef.current) return;
    await tapar();
    if (!montadoRef.current) return;

    if (acierto) setTerminado(true);
    else cambiarFase("elegir");
  };

  const reiniciar = () => {
    setRonda((r) => r + 1);
    setIntentos(1);
    setAciertoEnPrimerIntento(false);
    iniciarRonda();
  };

  /** Estado de la insignia "-25%": ganada > disponible (primer intento) > perdida. */
  const insignia = premioGanado
    ? INSIGNIAS.ganada
    : intentoDisponible
    ? INSIGNIAS.disponible
    : INSIGNIAS.perdida;

  return (
    <View className="flex-1">
      <StatusBar style="light" />

      {/* Instrucciones: se muestran al entrar a la pantalla */}
      <Modal
        visible={fase === "reglas"}
        transparent
        animationType="fade"
        onRequestClose={iniciarRonda}
      >
        <View className="flex-1 items-center justify-center bg-black/60 px-6">
          <ChineseFrame className="w-full max-w-sm bg-vino shadow-2xl p-3">
            <View className="items-center rounded-xl bg-mostaza/15 px-4 py-6">
              <Image source={VASO} className="mb-4 h-20 w-20" resizeMode="contain" />
              <Text
                style={{ fontFamily: "LaOriental" }}
                className="mb-3 text-center text-xl uppercase tracking-wide text-mostaza"
              >
                Cómo jugar
              </Text>
              <Text className="mb-6 text-center text-sm font-medium leading-5 text-amber-100">
                Mirá bajo qué vaso está la bolita. Después los vasos se mezclan y tocá uno para
                ver qué hay debajo. Si la encontrás en el primer intento, ganás un 25% de
                descuento en tu pedido.
              </Text>

              <TouchableOpacity
                onPress={iniciarRonda}
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

      {/* Resultado de la ronda: ofrece repetir o volver a Juegos */}
      <Modal visible={terminado} transparent animationType="fade" onRequestClose={onVolver}>
        <View className="flex-1 items-center justify-center bg-black/60 px-6">
          <ChineseFrame className="w-full max-w-sm bg-vino shadow-2xl p-3">
            <View className="items-center rounded-xl bg-mostaza/15 px-4 py-6">
              <Image source={VASO} className="mb-4 h-20 w-20" resizeMode="contain" />
              <Text
                style={{ fontFamily: "LaOriental" }}
                className="mb-3 text-center text-xl uppercase tracking-wide text-mostaza"
              >
                {aciertoEnPrimerIntento ? "¡Felicidades!" : "¡La encontraste!"}
              </Text>
              <Text className="mb-6 text-center text-sm font-medium leading-5 text-amber-100">
                {aciertoEnPrimerIntento
                  ? "¡Ganaste un 25% de descuento en tu pedido!"
                  : "El 25% de descuento era para el primer intento de la partida. Seguí jugando por diversión."}
              </Text>

              <View className="w-full flex-row gap-3">
                <TouchableOpacity
                  onPress={reiniciar}
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
                  className="flex-1 items-center justify-center align-center rounded-2xl border border-vino bg-mostaza/20 py-3.5 active:opacity-80"
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
                ¿Y la bolita?
              </Text>
              <Text className="mt-1 text-xs font-semibold text-amber-100">
                {premioGanado
                  ? "¡Descuento asegurado! Ahora jugá por diversión."
                  : intentoDisponible
                  ? "Encuentra la bola en el primer intento y gana un 25% de descuento"
                  : "Ya usaste tu primer intento. Seguí jugando por diversión."}
              </Text>

              <View
                className={`absolute right-5 top-4 rounded-full px-2.5 py-1 ${insignia.fondo}`}
              >
                <Text
                  style={{ fontFamily: "LaOriental" }}
                  className={`justify-center align-center text-xs uppercase ${insignia.texto}`}
                >
                  -25%
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
          <Text className="text-xs font-semibold uppercase text-amber-100">
            {MENSAJES[fase]}
          </Text>
          <Text style={{ fontFamily: "LaOriental" }} className="text-base text-mostaza">
            Intento {intentos}
          </Text>
        </View>

        {/* Tablero: la bolita va detrás de los vasos y asoma al levantarlos. */}
        <View
          style={{
            width: ANCHO_TABLERO,
            height: ALTO_TABLERO,
            alignSelf: "center",
            marginTop: 8,
          }}
        >
          <Animated.Image
            source={BOLA}
            resizeMode="contain"
            style={{
              position: "absolute",
              left: 0,
              bottom: BASE,
              width: RADIO_BOLA,
              height: RADIO_BOLA,
              opacity: opBola,
              transform: [{ translateX: xBola }, { scale: escBola }],
            }}
          />

          {xVasos.map((x, vaso) => (
            <TouchableOpacity
              key={vaso}
              onPress={() => elegirVaso(vaso)}
              disabled={fase !== "elegir"}
              style={{
                position: "absolute",
                left: 0,
                bottom: BASE,
                width: ANCHO_VASO,
                height: ALTO_VASO,
                transform: [{ translateX: x }],
              }}
            >
              <Animated.View
                style={{
                  flex: 1,
                  transform: [{ translateY: yVasos[vaso] }, { rotate: rotVasos[vaso] }],
                }}
              >
                <Image
                  source={VASO}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="contain"
                />
              </Animated.View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}