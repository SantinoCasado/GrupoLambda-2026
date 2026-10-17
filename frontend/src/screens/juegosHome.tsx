import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Vibration,
  ImageSourcePropType,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { ChineseFrame } from "../components/ChineseFrame";
import { NOMBRE_JUEGO, juegoGanador, obtenerJugadasPedido } from "../services/juegosService";

interface Props {
  onVolver: () => void;
  onIrAMemotest: () => void;
  onIrAPuzzle: () => void;
  onIrABolita: () => void;
  pedidoId?: string | null;
  clienteId?: string;
  /** Los invitados anónimos pueden jugar pero nunca ganan descuento. */
  puedeGanarDescuento?: boolean;
}

interface Juego {
  clave: string;
  numero: number;
  titulo: string;
  descuento: string;
  /** Los juegos sin icono muestran su número en un círculo. */
  icono?: ImageSourcePropType;
}

const JUEGOS: Juego[] = [
  {
    clave: "memotest",
    numero: 1,
    titulo: "Memotest",
    descuento: "10",
    icono: require("../../assets/images/tiles-y.png"),
  },
  {
    clave: "puzzle",
    numero: 2,
    titulo: "Armá el puzzle",
    descuento: "15",
    icono: require("../../assets/images/puzzle-y.png"),
  },
  {
    clave: "bolita",
    numero: 3,
    titulo: "¿Y la bolita?",
    descuento: "20",
    icono: require("../../assets/images/ball-y.png"),
  },
];

/** Traduce la clave del listado al nombre de juego usado en `game_discounts`. */
const nombreDeJuego = (clave: string) =>
  clave === "bolita"
    ? NOMBRE_JUEGO.bolita
    : clave === "puzzle"
    ? NOMBRE_JUEGO.puzzle
    : NOMBRE_JUEGO.memotest;

export function JuegosHomeScreen({
  onVolver,
  onIrAMemotest,
  onIrAPuzzle,
  onIrABolita,
  pedidoId,
  puedeGanarDescuento = true,
}: Props) {
  // Nombre del juego que ya ganó el descuento de este pedido (o null).
  const [juegoGanadorNombre, setJuegoGanadorNombre] = useState<string | null>(null);
  const [descuentoDeshabilitado, setDescuentoDeshabilitado] = useState(
    !(puedeGanarDescuento && pedidoId)
  );

  useEffect(() => {
    let activo = true;

    if (!puedeGanarDescuento || !pedidoId) {
      setDescuentoDeshabilitado(true);
      setJuegoGanadorNombre(null);
      return () => {
        activo = false;
      };
    }

    setDescuentoDeshabilitado(false);
    obtenerJugadasPedido(pedidoId).then((jugadas) => {
      if (!activo) return;
      setJuegoGanadorNombre(juegoGanador(jugadas));
    });

    return () => {
      activo = false;
    };
  }, [pedidoId, puedeGanarDescuento]);

  return (
    <View className="flex-1">
      <StatusBar style="light" />

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
            <View className="items-center rounded-xl bg-mostaza/15 px-4 py-4">
              <Text style={{ fontFamily: "LaOriental" }} className="text-2xl text-mostaza uppercase">
                Juegos
              </Text>
              <Text className="mt-1 text-xs font-semibold text-amber-100">
                Juega para ganar descuentos
              </Text>
            </View>
          </ChineseFrame>
        </View>

        <View className="mb-5 flex-row items-center justify-between">
          <Text className="text-xs font-bold text-vino uppercase">Para pasar el tiempo</Text>
          </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {JUEGOS.map((juego) => {
          const yaGanadoAca =
            juegoGanadorNombre !== null && juegoGanadorNombre === nombreDeJuego(juego.clave);
          const pillDeshabilitada =
            descuentoDeshabilitado || (juegoGanadorNombre !== null && !yaGanadoAca);

          return (
            <TouchableOpacity
              key={juego.numero}
              onPress={() => {
                if (juego.clave === "memotest") {
                  onIrAMemotest();
                  return;
                }
                if (juego.clave === "puzzle") {
                  onIrAPuzzle();
                  return;
                }
                if (juego.clave === "bolita") {
                  onIrABolita();
                  return;
                }
                Vibration.vibrate([0, 40]);
                console.log(`${juego.titulo} — pendiente de implementación`);
              }}
              className="mb-2 flex-column gap-y-3 items-center rounded-2xl border-2 border-mostaza bg-vino p-4 active:bg-vino/80"
            >
              {juego.icono ? (
                <Image
                  source={juego.icono}
                  className="h-16 w-16"
                  resizeMode="contain"
                />
              ) : (
                <View className="h-12 w-12 items-center justify-center rounded-full border-2 border-mostaza bg-vino">
                  <Text style={{ fontFamily: "LaOriental" }} className="text-xl text-mostaza">
                    {juego.numero}
                  </Text>
                </View>
              )}
              <View className="flex-column items-center ">
                <Text style={{ fontFamily: "LaOriental" }} className="text-2xl uppercase text-mostaza">
                  {juego.titulo}
                </Text>
                <Text
                  style={{ fontFamily: "LaOriental" }}
                  className={`text-sm rounded-2xl border px-2 pt-1 ${
                    yaGanadoAca
                      ? "border-emerald-600 bg-[#10b981] text-white"
                      : pillDeshabilitada
                      ? "border-stone-400 bg-stone-200 text-stone-500"
                      : "border-calabaza bg-[#FBE9DF] text-calabaza"
                  }`}
                >
                  {yaGanadoAca ? `- ${juego.descuento}% GANADO` : `- ${juego.descuento}% OFF`}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}