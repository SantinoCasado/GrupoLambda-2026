import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { ChineseFrame } from "../components/ChineseFrame";
import { FeedbackModal } from "../components/FeedbackModal";
import { DeliveryMap } from "../components/DeliveryMap";
import { AVELLANEDA_LAT, AVELLANEDA_LNG } from "../config/delivery";

export interface DireccionEntrega {
  address: string;
  lat: number;
  lng: number;
}

interface Props {
  onVolver: () => void;
  onDireccionConfirmada: (direccion: DireccionEntrega) => void;
}

interface ResultadoNominatim {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

const HEADERS_NOMINATIM = {
  "User-Agent": "JardinImperialApp/1.0 (pedidos a domicilio)",
  "Accept-Language": "es",
};

const direccionCorta = (data: any): string => {
  const a = data?.address ?? {};
  const partes = [
    a.road || a.pedestrian || a.footway || a.path,
    a.house_number,
    a.suburb || a.neighbourhood || a.quarter,
    a.city || a.town || a.village || a.municipality,
  ].filter(Boolean);

  if (partes.length > 0) return partes.join(", ");
  return typeof data?.display_name === "string" ? data.display_name : "";
};

export function DeliveryAddressScreen({ onVolver, onDireccionConfirmada }: Props) {
  const [consulta, setConsulta] = useState("");
  const [resultados, setResultados] = useState<ResultadoNominatim[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [direccion, setDireccion] = useState("");
  const [lat, setLat] = useState<number>(AVELLANEDA_LAT);
  const [lng, setLng] = useState<number>(AVELLANEDA_LNG);
  const [centerKey, setCenterKey] = useState(0);

  const [feedback, setFeedback] = useState<{
    visible: boolean;
    tipo: "exito" | "error" | "informacion";
    titulo: string;
    mensaje: string;
  }>({ visible: false, tipo: "informacion", titulo: "", mensaje: "" });

  const abrirAviso = (
    titulo: string,
    mensaje: string,
    tipo: "exito" | "error" | "informacion" = "informacion"
  ) => setFeedback({ visible: true, tipo, titulo, mensaje });

  const buscarDireccion = async () => {
    if (!consulta.trim()) {
      abrirAviso(
        "Escribí una dirección",
        "Ingresá calle y número para buscarla en el mapa.",
        "informacion"
      );
      return;
    }

    setBuscando(true);
    try {
      const q = `${consulta.trim()}, Avellaneda, Buenos Aires, Argentina`;
      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=ar&q=${encodeURIComponent(
        q
      )}`;

      const res = await fetch(url, { headers: HEADERS_NOMINATIM });
      if (!res.ok) {
        throw new Error("El buscador de direcciones no está disponible.");
      }

      const data = await res.json();
      const lista: ResultadoNominatim[] = Array.isArray(data) ? data : [];
      setResultados(lista);

      if (lista.length === 0) {
        abrirAviso(
          "Sin resultados",
          "No encontramos esa dirección. Probá con calle y altura, o marcá el punto directamente en el mapa.",
          "informacion"
        );
      }
    } catch (err: any) {
      abrirAviso(
        "No se pudo buscar",
        err?.message || "Revisá tu conexión e intentá nuevamente.",
        "error"
      );
    } finally {
      setBuscando(false);
    }
  };

  const elegirResultado = (r: ResultadoNominatim) => {
    const nuevaLat = Number(r.lat);
    const nuevaLng = Number(r.lon);
    if (!Number.isFinite(nuevaLat) || !Number.isFinite(nuevaLng)) return;

    setLat(nuevaLat);
    setLng(nuevaLng);
    setDireccion(r.display_name);
    setCenterKey((k) => k + 1);
    setResultados([]);
  };

  const actualizarDesdeMapa = async (nuevaLat: number, nuevaLng: number) => {
    setLat(nuevaLat);
    setLng(nuevaLng);

    // Geocodificación inversa para mostrar una dirección legible del punto
    // elegido. Si falla, el cliente siempre puede escribirla a mano.
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&zoom=18&addressdetails=1&lat=${nuevaLat}&lon=${nuevaLng}`;
      const res = await fetch(url, { headers: HEADERS_NOMINATIM });
      if (!res.ok) return;
      const data = await res.json();
      const corta = direccionCorta(data);
      if (corta) setDireccion(corta);
    } catch {
      // Silencioso: la dirección se puede completar manualmente.
    }
  };

  const confirmar = () => {
    if (!direccion.trim()) {
      abrirAviso(
        "Falta la dirección",
        "Escribí la dirección de entrega o elegí un punto en el mapa.",
        "informacion"
      );
      return;
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      abrirAviso(
        "Falta el punto en el mapa",
        "Marcá tu domicilio en el mapa para calcular el envío.",
        "informacion"
      );
      return;
    }

    onDireccionConfirmada({
      address: direccion.trim(),
      lat,
      lng,
    });
  };

  return (
    <View className="flex-1">
      <StatusBar style="light" />

      <View className="px-5 pt-4">
        <View className="absolute left-5 z-10" style={{ top: 30 }}>
          <TouchableOpacity
            onPress={onVolver}
            accessibilityRole="button"
            accessibilityLabel="Volver"
            className="items-center justify-center rounded-xl border-2 border-mostaza bg-vino px-2 py-1 active:bg-terracota/70"
          >
            <Image
              source={require("../../assets/images/left-arrow-y.png")}
              className="h-6 w-6 mr-1 my-1"
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        <Image
          source={require("../../assets/images/logo-name.png")}
          className="h-20 w-auto self-center"
          resizeMode="contain"
        />
        <Image
          source={require("../../assets/images/separator.png")}
          className="my-2 h-5 w-full"
          resizeMode="contain"
        />

        <ChineseFrame className="mt-1 bg-vino">
          <View className="items-center rounded-xl bg-mostaza/15 px-4 py-3">
            <Text
              style={{ fontFamily: "LaOriental" }}
              className="text-2xl text-mostaza uppercase text-center"
            >
              Entrega a Domicilio
            </Text>
            <Text className="mt-1 text-xs text-center font-semibold text-amber-100">
              Buscá tu dirección o marcá el punto en el mapa
            </Text>
          </View>
        </ChineseFrame>
      </View>

      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 }}
      >
        {/* Buscador */}
        <View className="flex-row items-center gap-2">
          <TextInput
            value={consulta}
            onChangeText={setConsulta}
            placeholder="Ej: Mitre 750"
            placeholderTextColor="#a8a29e"
            className="flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-800"
            onSubmitEditing={buscarDireccion}
            returnKeyType="search"
          />
          <TouchableOpacity
            onPress={buscarDireccion}
            disabled={buscando}
            className={`items-center justify-center rounded-xl border-2 border-mostaza bg-vino px-4 py-2.5 ${
              buscando ? "opacity-60" : "active:bg-terracota"
            }`}
          >
            {buscando ? (
              <ActivityIndicator size="small" color="#E5B25D" />
            ) : (
              <Text
                style={{ fontFamily: "LaOriental" }}
                className="text-sm uppercase text-mostaza"
              >
                Buscar
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Resultados del buscador */}
        {resultados.length > 0 && (
          <View className="mt-2 overflow-hidden rounded-xl border border-stone-200 bg-white">
            {resultados.map((r) => (
              <TouchableOpacity
                key={r.place_id}
                onPress={() => elegirResultado(r)}
                className="border-b border-stone-100 px-3 py-2.5 active:bg-amber-50"
              >
                <Text className="text-xs font-semibold text-stone-700" numberOfLines={2}>
                  📍 {r.display_name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Mapa */}
        <View className="mt-3">
          <DeliveryMap
            mode="picker"
            latitude={lat}
            longitude={lng}
            centerKey={centerKey}
            onPick={actualizarDesdeMapa}
            height={270}
          />
          <Text className="mt-1 text-[10px] text-stone-500 text-center">
            Tocá el mapa o arrastrá el marcador hasta la puerta de tu casa.
          </Text>
        </View>

        {/* Dirección final */}
        <Text className="mt-4 text-xs font-black uppercase tracking-wide text-vino">
          Dirección de entrega
        </Text>
        <TextInput
          value={direccion}
          onChangeText={setDireccion}
          placeholder="Calle, número, piso/depto y localidad"
          placeholderTextColor="#a8a29e"
          multiline
          className="mt-1 min-h-[64px] rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-800"
        />

        <Text className="mt-1 text-[10px] text-stone-500">
          Coordenadas: {lat.toFixed(5)}, {lng.toFixed(5)}
        </Text>

        <TouchableOpacity
          onPress={confirmar}
          className="mt-5 flex-row items-center justify-center rounded-2xl border border-amber-400/40 bg-vino py-3.5 shadow-md active:bg-terracota"
        >
          <Image
            source={require("../../assets/images/sello.png")}
            className="h-7 w-7"
            resizeMode="contain"
          />
          <Text
            style={{ fontFamily: "LaOriental" }}
            className="mx-4 text-center text-base uppercase tracking-wider text-mostaza"
          >
            Confirmar dirección y ver el menú
          </Text>
          <Image
            source={require("../../assets/images/sello.png")}
            className="h-7 w-7"
            resizeMode="contain"
          />
        </TouchableOpacity>
      </ScrollView>

      <FeedbackModal
        visible={feedback.visible}
        tipo={feedback.tipo}
        titulo={feedback.titulo}
        mensaje={feedback.mensaje}
        onClose={() => setFeedback((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
}
