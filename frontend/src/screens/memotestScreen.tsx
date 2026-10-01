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

const REVERSO = require("../../assets/images/games/tile-back.png");

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

  // Solo cuenta como victoria al primer intento: al reintentar ya no hay
  // descuento, aunque se alcance el par (`won_on_first_try` del backend).
  const gano = intentos === 1 && movimientos <= PAR;

  const paresCompletados = cartas.filter((c) => c.emparejada).length;
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

      {/* Cabecera */}
      <View className="px-5 pt-4">
        <View className="mb-4">
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
            <View className="items-center rounded-xl bg-mostaza/15 px-4 py-4">
              <Text style={{ fontFamily: "LaOriental" }} className="text-2xl text-mostaza uppercase">
                Memotest
              </Text>
              <Text className="mt-1 text-xs font-semibold text-amber-100">
                {intentos === 1
                  ? "Gana en el primer intento y obten un 10% de descuento"
                  : "Desafía tu memoria en este juego de cartas."}
              </Text>
            </View>
          </ChineseFrame>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-4 flex-row items-center justify-between rounded-2xl border border-mostaza/40 bg-vino px-4 py-3">
          <Text className="text-xs font-semibold uppercase text-amber-100">
              Pares completados
            </Text>
            <Text style={{ fontFamily: "LaOriental" }} className="text-lg text-mostaza">
              {paresCompletados} / {totalPares}
            </Text>
        </View>

        {terminado ? (
          <View className="items-center rounded-2xl border-2 border-mostaza bg-calabaza px-5 py-6">
            <Image
              source={LOGO}
              className="mb-3 h-24 w-24"
              resizeMode="contain"
            />
            <Text style={{ fontFamily: "LaOriental" }} className="text-xl uppercase text-white">
              {gano ? "¡Perfecto!" : "Completado"}
            </Text>
            <Text className="mt-2 text-center text-xs font-semibold text-amber-100">
              {gano
                ? `Encontraste todos los pares en ${
                    movimientos === 1 ? "1 movimiento" : `${movimientos} movimientos`
                  }, al primer intento.`
                : intentos > 1
                ? `Encontraste todos los pares, pero no al primer intento. El par era ${PAR}.`
                : `Encontraste todos los pares, pero en ${movimientos} movimientos. El par era ${PAR}.`}
            </Text>

            <TouchableOpacity
              onPress={reiniciar}
              className="mt-4 rounded-2xl bg-mostaza px-6 py-3 active:bg-terracota"
            >
              <Text style={{ fontFamily: "LaOriental" }} className="text-sm uppercase text-vino">
                Jugar de nuevo
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="flex-row flex-wrap justify-" style={{ gap: 12 }}>
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
        )}
      </ScrollView>
    </View>
  );
}