import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Dimensions,
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
  address?: Record<string, string>;
}

interface ErroresFormulario {
  calle?: string;
  altura?: string;
}

const HEADERS_NOMINATIM = {
  "User-Agent": "JardinImperialApp/1.0 (pedidos a domicilio)",
  "Accept-Language": "es",
};

const normalizar = (valor: string) =>
  valor.trim().toLowerCase().replace(/\s+/g, " ");

/** Clave que identifica una búsqueda ya resuelta (evita ida y vuelta de geocodificación). */
const claveConsulta = (calle: string, altura: string) =>
  normalizar(`${calle} ${altura}`);

/**
 * Separa la respuesta de Nominatim en calle y altura. Si falta `road`/`house_number`
 * (común en zonas sin numeración), intenta interpretar el `display_name`.
 */
const extraerPartes = (data: any): { calle: string; altura: string } => {
  const a = data?.address ?? {};
  const calle = a.road || a.pedestrian || a.footway || a.path || a.residential || "";
  const altura = a.house_number || "";

  if (calle) {
    return { calle: String(calle).trim(), altura: String(altura).trim() };
  }

  const display: string =
    typeof data?.display_name === "string" ? data.display_name : "";
  const primera = display.split(",")[0]?.trim() ?? "";
  const conAltura = primera.match(/^(.*\D)\s+(\d+\w*)$/);

  if (conAltura) {
    return { calle: conAltura[1].trim(), altura: conAltura[2].trim() };
  }

  return { calle: primera, altura: "" };
};

export function DeliveryAddressScreen({ onVolver, onDireccionConfirmada }: Props) {
  // --- Carrusel ---
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const screenWidth = Dimensions.get("window").width;

  // --- Buscador ---
  const [consulta, setConsulta] = useState("");
  const [resultados, setResultados] = useState<ResultadoNominatim[]>([]);
  const [buscando, setBuscando] = useState(false);

  // --- Ubicación ---
  const [lat, setLat] = useState<number>(AVELLANEDA_LAT);
  const [lng, setLng] = useState<number>(AVELLANEDA_LNG);
  const [centerKey, setCenterKey] = useState(0);
  const [ubicacionConfirmada, setUbicacionConfirmada] = useState(false);
  const [geocodificando, setGeocodificando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  // --- Formulario ---
  const [calle, setCalle] = useState("");
  const [altura, setAltura] = useState("");
  const [piso, setPiso] = useState("");
  const [aclaraciones, setAclaraciones] = useState("");
  const [errores, setErrores] = useState<ErroresFormulario>({});
  const [avisoFormulario, setAvisoFormulario] = useState<string | null>(null);

  // Evita que el texto que llega desde el mapa dispare otra geocodificación.
  const ultimaConsultaGeocodificada = useRef("");
  const geocodeRequestId = useRef(0);
  const reverseRequestId = useRef(0);

  // Último valor de altura confirmado, para que la geocodificación inversa
  // (asíncrona) no dependa de un closure viejo.
  const alturaActualRef = useRef(altura);
  useEffect(() => {
    alturaActualRef.current = altura;
  }, [altura]);

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

  // ---------------------------------------------------------------------------
  // Geocodificación (compartida por el efecto de escritura y la confirmación)
  // ---------------------------------------------------------------------------
  const buscarCoordenadas = async (
    c: string,
    a: string
  ): Promise<{ lat: number; lng: number } | null> => {
    const q = `${c} ${a}, Avellaneda, Buenos Aires, Argentina`;
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&countrycodes=ar&q=${encodeURIComponent(
      q
    )}`;

    const res = await fetch(url, { headers: HEADERS_NOMINATIM });
    if (!res.ok) throw new Error("El buscador de direcciones no está disponible.");

    const data = await res.json();
    const primero = Array.isArray(data) ? data[0] : null;
    if (!primero) return null;

    const nuevaLat = Number(primero.lat);
    const nuevaLng = Number(primero.lon);
    if (!Number.isFinite(nuevaLat) || !Number.isFinite(nuevaLng)) return null;

    return { lat: nuevaLat, lng: nuevaLng };
  };

  // ---------------------------------------------------------------------------
  // Formulario -> mapa: cuando el cliente escribe calle y altura, movemos el pin.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const c = calle.trim();
    const a = altura.trim();

    if (!c || !a) {
      // Invalida cualquier búsqueda en curso: si el cliente borró un campo, no
      // queremos que una respuesta vieja mueva el pin.
      geocodeRequestId.current += 1;
      setGeocodificando(false);
      return;
    }

    const clave = claveConsulta(c, a);
    if (clave === ultimaConsultaGeocodificada.current) return;

    setAvisoFormulario(null);
    const id = ++geocodeRequestId.current;

    const timer = setTimeout(async () => {
      setGeocodificando(true);
      try {
        const coords = await buscarCoordenadas(c, a);
        if (id !== geocodeRequestId.current) return;

        if (!coords) {
          setUbicacionConfirmada(false);
          setAvisoFormulario(
            "No encontramos esa dirección en el mapa. Podés ajustar el pin manualmente."
          );
          return;
        }

        ultimaConsultaGeocodificada.current = clave;
        setLat(coords.lat);
        setLng(coords.lng);
        setCenterKey((k) => k + 1);
        setUbicacionConfirmada(true);
        setAvisoFormulario(null);
      } catch {
        if (id !== geocodeRequestId.current) return;
        setAvisoFormulario("No pudimos actualizar el mapa. Revisá tu conexión.");
      } finally {
        if (id === geocodeRequestId.current) setGeocodificando(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [calle, altura]);

  // ---------------------------------------------------------------------------
  // Buscador
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // Mapa -> formulario
  // ---------------------------------------------------------------------------
  const aplicarPartes = (partes: { calle: string; altura: string }) => {
    if (!partes.calle) return;

    // La altura que ya tenía el cliente se conserva si el punto no informa una.
    const alturaFinal = partes.altura || alturaActualRef.current;

    ultimaConsultaGeocodificada.current = claveConsulta(partes.calle, alturaFinal);
    setCalle(partes.calle);
    if (partes.altura) setAltura(partes.altura);
    setErrores((prev) => ({ ...prev, calle: undefined, altura: undefined }));
    setAvisoFormulario(null);
  };

  const elegirResultado = (r: ResultadoNominatim) => {
    const nuevaLat = Number(r.lat);
    const nuevaLng = Number(r.lon);
    if (!Number.isFinite(nuevaLat) || !Number.isFinite(nuevaLng)) return;

    const partes = extraerPartes(r);
    const calleFinal = partes.calle || consulta.trim();
    const alturaFinal = partes.altura || altura;

    if (calleFinal) {
      ultimaConsultaGeocodificada.current = claveConsulta(calleFinal, alturaFinal);
      setCalle(calleFinal);
      if (partes.altura) setAltura(partes.altura);
    }

    setLat(nuevaLat);
    setLng(nuevaLng);
    setCenterKey((k) => k + 1);
    setUbicacionConfirmada(true);
    setErrores({});
    setAvisoFormulario(null);
    setConsulta([calleFinal, partes.altura].filter(Boolean).join(" "));
    setResultados([]);
  };

  const actualizarDesdeMapa = async (nuevaLat: number, nuevaLng: number) => {
    setLat(nuevaLat);
    setLng(nuevaLng);
    setUbicacionConfirmada(true);

    // Geocodificación inversa para completar calle y altura del punto elegido.
    const id = ++reverseRequestId.current;
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&zoom=18&addressdetails=1&lat=${nuevaLat}&lon=${nuevaLng}`;
      const res = await fetch(url, { headers: HEADERS_NOMINATIM });
      if (id !== reverseRequestId.current) return;
      if (!res.ok) return;

      const data = await res.json();
      if (id !== reverseRequestId.current) return;

      aplicarPartes(extraerPartes(data));
    } catch {
      // Silencioso: calle y altura se pueden completar a mano en la sección 2.
    }
  };

  // ---------------------------------------------------------------------------
  // Navegación entre secciones
  // ---------------------------------------------------------------------------
  const irSiguiente = () => {
    setCurrentStep(1);
    scrollRef.current?.scrollTo({ x: screenWidth, animated: true });
  };

  const irVolver = () => {
    setCurrentStep(0);
    scrollRef.current?.scrollTo({ x: 0, animated: true });
  };

  // ---------------------------------------------------------------------------
  // Confirmación
  // ---------------------------------------------------------------------------
  const construirDireccion = (c: string, a: string) =>
    [
      `${c} ${a}`,
      piso.trim() || null,
      aclaraciones.trim() ? `— ${aclaraciones.trim()}` : null,
    ]
      .filter(Boolean)
      .join(", ");

  const confirmar = async () => {
    const errs: ErroresFormulario = {};
    if (!calle.trim()) errs.calle = "Ingresá la calle.";
    if (!altura.trim()) errs.altura = "Ingresá la altura.";

    if (Object.keys(errs).length > 0) {
      setErrores(errs);
      abrirAviso(
        "Faltan datos",
        "Completá la calle y la altura para confirmar la entrega.",
        "informacion"
      );
      return;
    }

    const c = calle.trim();
    const a = altura.trim();
    const claveActual = claveConsulta(c, a);
    const address = construirDireccion(c, a);

    // Si el texto escrito ya está geocodificado en el mapa, se confirma directo.
    if (
      claveActual === ultimaConsultaGeocodificada.current &&
      Number.isFinite(lat) &&
      Number.isFinite(lng)
    ) {
      onDireccionConfirmada({ address, lat, lng });
      return;
    }

    // La dirección se cargó a mano (o cambió): resolvemos las coordenadas acá
    // mismo para no depender de que el cliente haya tocado el mapa.
    setConfirmando(true);
    try {
      const coords = await buscarCoordenadas(c, a);

      if (!coords) {
        setUbicacionConfirmada(false);
        setAvisoFormulario(
          "No encontramos esa dirección en el mapa. Revisá calle y altura."
        );
        abrirAviso(
          "No pudimos ubicar la dirección",
          "Revisá la calle y la altura, o ajustá el punto manualmente en el mapa.",
          "error"
        );
        return;
      }

      ultimaConsultaGeocodificada.current = claveActual;
      setLat(coords.lat);
      setLng(coords.lng);
      setCenterKey((k) => k + 1);
      setUbicacionConfirmada(true);
      setAvisoFormulario(null);
      onDireccionConfirmada({ address, lat: coords.lat, lng: coords.lng });
    } catch {
      abrirAviso(
        "No pudimos confirmar",
        "Revisá tu conexión e intentá nuevamente.",
        "error"
      );
    } finally {
      setConfirmando(false);
    }
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
          className="h-16 w-auto self-center"
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
              className="text-xl text-mostaza uppercase text-center"
            >
              Entrega a Domicilio
            </Text>
            <Text className="mt-1 text-xs text-center font-semibold text-amber-100">
              Buscá tu dirección o marcá el punto en el mapa
            </Text>
          </View>
        </ChineseFrame>
      </View>

      {/* Carrusel de secciones */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
        onMomentumScrollEnd={(e) => {
          setCurrentStep(
            Math.round(e.nativeEvent.contentOffset.x / screenWidth)
          );
        }}
        style={{ flex: 1 }}
      >
        {/* SECCIÓN 0: Buscador y mapa */}
        <View style={{ width: screenWidth }} className="flex-1 px-5 pt-2">
          <ScrollView
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            {/* Buscador */}
            <View className="flex-row items-center gap-2">
              <TextInput
                value={consulta}
                onChangeText={setConsulta}
                placeholder="Ej: Mitre 750"
                placeholderTextColor="#a8a29e"
                className={`flex-1 rounded-xl border bg-white px-3 py-2.5 text-sm text-stone-800 ${
                  consulta.trim().length > 0 ? "border-mostaza" : "border-stone-300"
                }`}
                onSubmitEditing={buscarDireccion}
                returnKeyType="search"
              />
              <TouchableOpacity
                onPress={buscarDireccion}
                disabled={buscando}
                accessibilityRole="button"
                accessibilityLabel="Buscar dirección"
                className={`items-center justify-center rounded-xl border-2 border-mostaza bg-vino p-1 ${
                  buscando ? "opacity-60" : "active:bg-terracota"
                }`}
              >
                {buscando ? (
                  <ActivityIndicator size="small" color="#E5B25D" />
                ) : (
                  <Image
                    source={require("../../assets/images/search-y.png")}
                    className="h-8 w-8"
                    resizeMode="contain"
                  />
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
            </View>

            <Text className="mt-2 text-center text-xs font-semibold text-calabaza">
              Arrastrá el pin o tocá el mapa para ajustar el punto exacto.
            </Text>

            {/* Paginación + Siguiente */}
            <View className="mx-1 mt-4 items-center">
              <View className="flex-row items-center justify-center gap-2 py-1 mb-3">
                {[0, 1].map((i) => (
                  <View
                    key={i}
                    className={`h-2 w-2 rotate-45 ${
                      currentStep === i ? "bg-vino" : "bg-mostaza/30"
                    }`}
                  />
                ))}
              </View>
              <TouchableOpacity
                onPress={irSiguiente}
                className="w-full flex-row items-center justify-center rounded-2xl border border-calabaza bg-[#FBE9DF] py-3 active:bg-[#f5dccb]"
              >
                <Text
                  style={{ fontFamily: "LaOriental" }}
                  className="text-sm text-calabaza"
                >
                  Siguiente
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* SECCIÓN 1: Datos de la dirección */}
        <View style={{ width: screenWidth }} className="flex-1 px-5 pt-2">
          <ScrollView
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            <View className="mx-6 gap-y-4">
              {/* Calle */}
              <View>
                <Text className="mb-1 text-sm font-bold text-vino">Calle *</Text>
                <TextInput
                  value={calle}
                  onChangeText={(v) => {
                    setCalle(v);
                    if (errores.calle) {
                      setErrores((prev) => ({ ...prev, calle: undefined }));
                    }
                  }}
                  placeholder="Ej: Mitre"
                  placeholderTextColor="#a37e1f"
                  autoCapitalize="words"
                  className={`rounded-xl border bg-[#FFF8EA] pl-4 py-3 text-stone-700 ${
                    errores.calle ? "border-terracota" : "border-mostaza"
                  }`}
                />
                {errores.calle && (
                  <Text className="mt-1 text-xs font-medium text-rose-400">
                    {errores.calle}
                  </Text>
                )}
              </View>

              {/* Altura */}
              <View>
                <Text className="mb-1 text-sm font-bold text-vino">Altura *</Text>
                <TextInput
                  value={altura}
                  onChangeText={(v) => {
                    setAltura(v);
                    if (errores.altura) {
                      setErrores((prev) => ({ ...prev, altura: undefined }));
                    }
                  }}
                  placeholder="Ej: 750"
                  placeholderTextColor="#a37e1f"
                  keyboardType="number-pad"
                  className={`rounded-xl border bg-[#FFF8EA] pl-4 py-3 text-stone-700 ${
                    errores.altura ? "border-terracota" : "border-mostaza"
                  }`}
                />
                {errores.altura && (
                  <Text className="mt-1 text-xs font-medium text-rose-400">
                    {errores.altura}
                  </Text>
                )}
              </View>

              {/* Piso / departamento */}
              <View>
                <Text className="mb-1 text-sm font-bold text-vino">
                  Piso/departamento
                </Text>
                <TextInput
                  value={piso}
                  onChangeText={setPiso}
                  placeholder="Ej: 2° B"
                  placeholderTextColor="#a37e1f"
                  className="rounded-xl border border-mostaza bg-[#FFF8EA] pl-4 py-3 text-stone-700"
                />
              </View>

              {/* Aclaraciones */}
              <View>
                <Text className="mb-1 text-sm font-bold text-vino">Aclaraciones</Text>
                <TextInput
                  value={aclaraciones}
                  onChangeText={setAclaraciones}
                  placeholder="Ej: timbre roto, dejar en portería"
                  placeholderTextColor="#a37e1f"
                  multiline
                  className="min-h-[80px] rounded-xl border border-mostaza bg-[#FFF8EA] pl-4 pt-3 pb-3 text-stone-700"
                />
              </View>
            </View>

            {/* Estado de la ubicación en el mapa */}
            

            {/* Confirmar */}
            <TouchableOpacity
              onPress={confirmar}
              disabled={confirmando}
              className={`mx-6 mt-5 flex-row items-center justify-center rounded-2xl border border-amber-400/40 bg-vino py-3.5 shadow-md ${
                confirmando ? "opacity-70" : "active:bg-terracota"
              }`}
            >
              <Image
                source={require("../../assets/images/sello.png")}
                className="h-7 w-7"
                resizeMode="contain"
              />
              {confirmando ? (
                <ActivityIndicator
                  size="small"
                  color="#E5B25D"
                  style={{ marginHorizontal: 16 }}
                />
              ) : (
                <Text
                  style={{ fontFamily: "LaOriental" }}
                  className="mt-1 mx-4 text-center text-base uppercase tracking-wider text-mostaza"
                >
                  Confirmar dirección
                </Text>
              )}
              <Image
                source={require("../../assets/images/sello.png")}
                className="h-7 w-7"
                resizeMode="contain"
              />
            </TouchableOpacity>

            {/* Paginación + Volver */}
            <View className="mx-6 mt-4 items-center">
              <View className="flex-row items-center justify-center gap-2 py-1 mb-3">
                {[0, 1].map((i) => (
                  <View
                    key={i}
                    className={`h-2 w-2 rotate-45 ${
                      currentStep === i ? "bg-vino" : "bg-mostaza/30"
                    }`}
                  />
                ))}
              </View>
              <TouchableOpacity
                onPress={irVolver}
                className="w-full flex-row items-center justify-center rounded-2xl border border-mostaza/40 bg-[#FBE9DF] py-3 active:bg-[#f5dccb]"
              >
                <Text
                  style={{ fontFamily: "LaOriental" }}
                  className="text-sm text-calabaza"
                >
                  Volver
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
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
