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
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { ChineseFrame } from "../components/ChineseFrame";

interface Props {
  onVolver: () => void;
}

interface Carta {
  id: number;
  cara: "1" | "2";
  emparejada: boolean;
}

/** Par del juego: con 2 pares el mínimo absoluto son 2 movimientos. */
const PAR = 2;

const CARAS = [
  require("../../assets/images/games/tile-1.png"),
  require("../../assets/images/games/tile-2.png"),
];

const REVERSO = require("../../assets/images/games/bamboo.png");

const LOGO = require("../../assets/images/games/tiles-logo.png");

/** Invierte la opacidad para superponer el reverso encima de la cara. */
function mostrarOculto(valor: Animated.Value) {
  return valor.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
}

/** Barajado de Fisher-Yates. */
function barajar<T>(lista: T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function generarCartas(): Carta[] {
  return barajar([
    { id: 0, cara: "1", emparejada: false },
    { id: 1, cara: "1", emparejada: false },
    { id: 2, cara: "2", emparejada: false },
    { id: 3, cara: "2", emparejada: false },
  ]);
}

export function MemotestScreen({ onVolver }: Props) {
  const [cartas, setCartas] = useState<Carta[]>(generarCartas);
  const [seleccionadas, setSeleccionadas] = useState<number[]>([]);
  const [movimientos, setMovimientos] = useState(0);
  const [intentos, setIntentos] = useState(1);
  const [terminado, setTerminado] = useState(false);
  const [previsualizando, setPrevisualizando] = useState(true);
  // Las instrucciones se muestran en cada entrada a la pantalla.
  const [mostrarReglas, setMostrarReglas] = useState(true);
  // El premio se gana una sola vez y no se pierde al reintentar.
  const [premioGanado, setPremioGanado] = useState(false);

  // Bloquea el toque mientras el par fallido vuelve a voltearse.
  const bloqueadoRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Una animación de opacidad por carta, creada una sola vez.
  const animaciones = useRef<Animated.Value[]>(
    cartas.map(() => new Animated.Value(0))
  ).current;

  const animTodas = useCallback(
    (visibles: boolean) => {
      animaciones.forEach((a) =>
        Animated.timing(a, {
          toValue: visibles ? 1 : 0,
          duration: 220,
          useNativeDriver: true,
        }).start()
      );
    },
    [animaciones]
  );

  /** Reparte las cartas y las muestra 2 segundos antes de ocultarlas. */
  const iniciarDeal = useCallback(() => {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    setPrevisualizando(true);
    animTodas(true);
    previewTimerRef.current = setTimeout(() => {
      animTodas(false);
      setPrevisualizando(false);
      previewTimerRef.current = null;
    }, 2000);
  }, [animTodas]);

  useEffect(() => {
    // El reparto lo dispara "Comenzar" mientras las reglas están visibles.
    if (mostrarReglas) return;
    iniciarDeal();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, [mostrarReglas, iniciarDeal]);

  const anchoPantalla = Dimensions.get("window").width;
  const lado = Math.floor((anchoPantalla - 40 - 24) / 2);

  const revelarCarta = useCallback(
    (indice: number, visible: boolean) => {
      Animated.timing(animaciones[indice], {
        toValue: visible ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    },
    [animaciones]
  );

  const tapCarta = (indice: number) => {
    if (previsualizando) return;
    if (bloqueadoRef.current || terminado) return;
    if (cartas[indice].emparejada) return;
    if (seleccionadas.includes(indice)) return;

    Vibration.vibrate([0, 40]);
    revelarCarta(indice, true);

    // Primer toque del turno: solo se muestra, no cuenta movimiento.
    if (seleccionadas.length === 0) {
      setSeleccionadas([indice]);
      return;
    }

    const previo = seleccionadas[0];
    setMovimientos((m) => m + 1);
    setSeleccionadas([indice]);
    bloqueadoRef.current = true;

    const hacenPareja = cartas[previo].cara === cartas[indice].cara;

    if (hacenPareja) {
      Vibration.vibrate([0, 80, 60, 150]);
      setCartas((prev) =>
        prev.map((c, i) =>
          i === previo || i === indice ? { ...c, emparejada: true } : c
        )
      );
      setSeleccionadas([]);
      bloqueadoRef.current = false;

      // Si ya no queda nada por encontrar, cierra la partida.
      const restantes = cartas.filter(
        (c, i) => i !== previo && i !== indice && !c.emparejada
      );
      if (restantes.length === 0) setTerminado(true);
      return;
    }

    // Par incorrecto: se muestra un instante y vuelve a ocultarse.
    timeoutRef.current = setTimeout(() => {
      revelarCarta(previo, false);
      revelarCarta(indice, false);
      setSeleccionadas([]);
      bloqueadoRef.current = false;
      Vibration.vibrate([0, 100, 50, 100]);
    }, 800);
  };

  const reiniciar = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    bloqueadoRef.current = false;
    setCartas(generarCartas());
    setSeleccionadas([]);
    setMovimientos(0);
    setIntentos((i) => i + 1);
    setTerminado(false);
    iniciarDeal();
  };

  // El premio se gana una sola vez: queda en verde aunque el jugador reintente.
  // El efecto corre tras el commit, cuando `movimientos` ya incluye el
  // incremento del último par, así que la condición es la misma que `gano`.
  useEffect(() => {
    if (terminado && intentos === 1 && movimientos <= PAR) setPremioGanado(true);
  }, [terminado, intentos, movimientos]);

  // Solo cuenta como victoria al primer intento: al reintentar ya no hay
  // descuento, aunque se alcance el par (`won_on_first_try` del backend).
  const gano = intentos === 1 && movimientos <= PAR;

  /** Estado de la insignia "-10%": ganada > disponible (primer intento) > perdida. */
  const insignias = {
    ganada: { fondo: "bg-[#10b981]", texto: "text-white" },
    disponible: { fondo: "bg-mostaza", texto: "text-vino" },
    perdida: { fondo: "bg-stone-100", texto: "text-stone-500" },
  };
  const insignia = premioGanado
    ? insignias.ganada
    : intentos === 1
    ? insignias.disponible
    : insignias.perdida;

  const paresCompletados = cartas.filter((c) => c.emparejada).length/2;
  const totalPares = cartas.length / 2;

  /** Cierra las instrucciones y reparte las cartas. */
  const comenzar = () => {
    setMostrarReglas(false);
    iniciarDeal();
  };

  return (
    <View className="flex-1">
      <StatusBar style="light" />

      {/* Instrucciones: se muestran solo la primera vez en la sesión */}
      <Modal visible={mostrarReglas} transparent animationType="fade" onRequestClose={comenzar}>
        <View className="flex-1 items-center justify-center bg-black/60 px-6">
          <ChineseFrame className="w-full max-w-sm bg-vino shadow-2xl p-3">
            <View className="items-center rounded-xl bg-mostaza/15 px-4 py-6">
              <Image
                source={LOGO}
                className="mb-4 h-24 w-24"
                resizeMode="contain"
              />
              <Text
                style={{ fontFamily: "LaOriental" }}
                className="mb-3 text-center text-xl uppercase tracking-wide text-mostaza"
              >
                Cómo jugar
              </Text>
              <Text className="mb-6 text-center text-sm font-medium leading-5 text-amber-100">
                Toca las fichas de a 2 por vez para voltearlas. Si coinciden quedan emparejadas; si no,
                vuelven a voltearse. Encontrá todos los pares para ganar.
              </Text>

              <TouchableOpacity
                onPress={comenzar}
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
      <Modal
        visible={terminado}
        transparent
        animationType="fade"
        onRequestClose={onVolver}
      >
        <View className="flex-1 items-center justify-center bg-black/60 px-6">
          <ChineseFrame className="w-full max-w-sm bg-vino shadow-2xl p-3">
            <View className="items-center rounded-xl bg-mostaza/15 px-4 py-6">
              <Image
                source={LOGO}
                className="mb-4 h-24 w-24"
                resizeMode="contain"
              />
              <Text
                style={{ fontFamily: "LaOriental" }}
                className="mb-3 text-center text-xl uppercase tracking-wide text-mostaza"
              >
                {gano ? "¡Felicidades!" : "¡Ganaste!"}
              </Text>
              <Text className="mb-6 text-center text-sm font-medium leading-5 text-amber-100">
                {gano
                  ? `¡Ganó un 10% de descuento en su pedido!`
                  : intentos > 1
                  ? `Encontró todos los pares.`
                  : `Encontró todos los pares.`}
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
        <View className="mt-3 mb-4">
          <Image
            source={require("../../assets/images/logo-name.png")}
            className="h-20 w-auto self-center"
            resizeMode="contain"
          />
          <Image
            source={require("../../assets/images/separator.png")}
            className="my-2 h-7 w-full"
            resizeMode="contain"
          />
          <ChineseFrame className="mt-2 bg-vino">
            <View className="relative items-center rounded-xl bg-mostaza/15 px-4 py-4">
              <Text style={{ fontFamily: "LaOriental" }} className="text-2xl text-mostaza uppercase">
                Memotest
              </Text>
              <Text className="mt-1 text-xs font-semibold text-amber-100">
                {premioGanado
                  ? "¡Descuento asegurado! Ahora jugá por diversión."
                  : intentos === 1
                  ? "Gana en el primer intento y obten un 10% de descuento"
                  : "Desafía tu memoria en este juego de cartas."}
              </Text>

              <View
                className={`absolute right-5 top-4 rounded-full px-2.5 py-1 ${insignia.fondo}`}
              >
                <Text
                  style={{ fontFamily: "LaOriental" }}
                  className={`justify-center align-center text-xs uppercase ${insignia.texto}`}
                >
                  -10%
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
              Pares completados
            </Text>
            <Text style={{ fontFamily: "LaOriental" }} className="text-lg text-mostaza">
              {paresCompletados} / {totalPares}
            </Text>
        </View>

        <View className="flex-row flex-wrap justify-center mt-5" style={{ gap: 20 }}>
          {cartas.map((carta, indice) => {
            const mostrando = animaciones[indice];

            return (
              <TouchableOpacity
                key={carta.id}
                onPress={() => tapCarta(indice)}
                disabled={carta.emparejada}
                style={{ width: lado, height: lado }}
              >
                <Animated.View
                  style={{
                    flex: 1,
                    borderRadius: 16,
                    opacity: mostrando,
                  }}
                >
                  <Image
                    source={CARAS[carta.cara === "1" ? 0 : 1]}
                    className="h-full w-full rounded-2xl"
                    resizeMode="cover"
                  />
                </Animated.View>

                <Animated.View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    opacity: mostrarOculto(mostrando),
                  }}
                >
                  <Image
                    source={REVERSO}
                    className="h-full w-full rounded-2xl"
                    resizeMode="cover"
                  />
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}