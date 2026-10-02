import React from "react";
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

interface Props {
  onVolver: () => void;
  onIrAMemotest: () => void;
  onIrAPuzzle: () => void;
  onIrABolita: () => void;
}

interface Juego {
  clave: string;
  numero: number;
  titulo: string;
  descripcion: string;
  /** Los juegos sin icono muestran su número en un círculo. */
  icono?: ImageSourcePropType;
}

const JUEGOS: Juego[] = [
  {
    clave: "memotest",
    numero: 1,
    titulo: "Memotest",
    descripcion: "Encuentra los pares",
    icono: require("../../assets/images/tiles-y.png"),
  },
  {
    clave: "puzzle",
    numero: 2,
    titulo: "Armá el puzzle",
    descripcion: "Ordená las fichas",
    icono: require("../../assets/images/games/tiles-logo.png"),
  },
  {
    clave: "bolita",
    numero: 3,
    titulo: "¿Y la bolita?",
    descripcion: "Encuentra la bolita",
    icono: require("../../assets/images/games/cup.png"),
  },
];

export function JuegosHomeScreen({
  onVolver,
  onIrAMemotest,
  onIrAPuzzle,
  onIrABolita,
}: Props) {
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
        {JUEGOS.map((juego) => (
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
            className="mb-4 flex-row items-center rounded-2xl border-2 border-mostaza bg-vino p-4 shadow-md active:bg-vino/80"
          >
            {juego.icono ? (
              <Image
                source={juego.icono}
                className="mr-3 h-12 w-12"
                resizeMode="contain"
              />
            ) : (
              <View className="mr-3 h-12 w-12 items-center justify-center rounded-full border-2 border-mostaza bg-vino">
                <Text style={{ fontFamily: "LaOriental" }} className="text-xl text-mostaza">
                  {juego.numero}
                </Text>
              </View>
            )}
            <View className="flex-1">
              <Text style={{ fontFamily: "LaOriental" }} className="text-base uppercase text-mostaza">
                {juego.titulo}
              </Text>
              <Text className="text-xs text-amber-100">{juego.descripcion}</Text>
            </View>
            <Image
              source={require("../../assets/images/right-arrow-y.png")}
              className="h-6 w-6"
              resizeMode="contain"
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}