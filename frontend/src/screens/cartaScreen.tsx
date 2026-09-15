import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useCart, ItemMenu } from "../context/carritoContext";
import { supabase } from "../config/supabase";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 48; // ancho adaptado con padding

interface CartaScreenProps {
  tipo: "comida" | "bebida" | "todo";
  rolUsuario: "cocinero" | "cantinero" | "cliente_registrado" | "cliente_anonimo" | string;
  onVolver?: () => void;
  onIrAlCarrito?: () => void;
}

export function CartaScreen({ tipo, rolUsuario, onVolver, onIrAlCarrito }: CartaScreenProps) {
  const [items, setItems] = useState<ItemMenu[]>([]);
  const [cargando, setCargando] = useState(true);
  const [indiceActual, setIndiceActual] = useState(0);
  const [fotoActiva, setFotoActiva] = useState(0);

  const { agregarAlCarrito, carrito } = useCart();
  const scrollFotosRef = useRef<ScrollView>(null);

  const esStaff = rolUsuario === "cocinero" || rolUsuario === "cantinero";
  const esCliente = !esStaff;

  const categoriaSupabase = tipo === "comida" ? "dish" : tipo === "bebida" ? "drink" : null;

  useEffect(() => {
    cargarProductos();
  }, [tipo]);

  // Al cambiar de plato, reseteamos el scroll de fotos al inicio
  useEffect(() => {
    setFotoActiva(0);
    scrollFotosRef.current?.scrollTo({ x: 0, animated: false });
  }, [indiceActual]);

  const cargarProductos = async () => {
    try {
      setCargando(true);
      let query = supabase
        .from("products")
        .select("id, name, description, prep_time, price, photos, category, status")
        .eq("status", "active");

      if (categoriaSupabase) {
        query = query.eq("category", categoriaSupabase);
      }

      const { data, error } = await query;

      if (error) {
        console.warn("⚠️ [Carta] Error al consultar products:", error.message);
        setItems([]);
        return;
      }

      const formateados: ItemMenu[] = (data || []).map((row: any) => ({
        id: row.id,
        nombre: row.name || "Sin nombre",
        descripcion: row.description || "",
        precio: Number(row.price) || 0,
        categoria: row.category,
        tiempoElaboracion: Number(row.prep_time) || 0,
        fotos: Array.isArray(row.photos) ? row.photos : [],
      }));

      setItems(formateados);
      setIndiceActual(0);
    } catch (err: any) {
      console.warn("⚠️ [Carta] Falló la carga de productos:", err.message);
      setItems([]);
    } finally {
      setCargando(false);
    }
  };

  const handleEliminarProducto = async (id: string) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ status: "inactive" })
        .eq("id", id);

      if (!error) {
        setItems((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err: any) {
      console.warn("⚠️ Error al dar de baja el producto:", err.message);
    }
  };

  // Navegación circular entre platos
  const platoAnterior = () => {
    if (items.length === 0) return;
    setIndiceActual((prev) => (prev === 0 ? items.length - 1 : prev - 1));
  };

  const platoSiguiente = () => {
    if (items.length === 0) return;
    setIndiceActual((prev) => (prev === items.length - 1 ? 0 : prev + 1));
  };

  const handleScrollFotos = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / CARD_WIDTH);
    if (slide !== fotoActiva) {
      setFotoActiva(slide);
    }
  };

  const itemActual = items[indiceActual];

  return (
    <View className="flex-1 px-6 pt-4 bg-amber-50/40">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3 border-b border-mostaza/20 pb-2">
        {onVolver ? (
          <TouchableOpacity onPress={onVolver} className="px-2 py-1">
            <Text className="text-vino font-bold">← Volver</Text>
          </TouchableOpacity>
        ) : (
          <View className="w-10" />
        )}

        <Text style={{ fontFamily: "LaOriental" }} className="text-xl uppercase text-vino text-center flex-1">
          {tipo === "comida" ? "Carta de Platos" : tipo === "bebida" ? "Carta de Bebidas" : "Menú"}
        </Text>

        {esCliente && onIrAlCarrito ? (
          <TouchableOpacity
            onPress={onIrAlCarrito}
            className="flex-row items-center justify-center rounded-xl bg-vino px-3 py-1.5 shadow-sm active:bg-terracota"
          >
            <Text className="text-mostaza font-bold text-sm mr-1">🛒</Text>
            <Text className="text-mostaza font-bold text-sm translate-y-0.5">{carrito.length}</Text>
          </TouchableOpacity>
        ) : (
          <View className="w-10" />
        )}
      </View>

      {/* Loading state */}
      {cargando ? (
        <View className="flex-1 justify-center items-center py-20">
          <ActivityIndicator size="large" color="#800020" />
          <Text className="text-vino mt-2 text-xs font-semibold">Cargando carta...</Text>
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center py-20">
          <Text className="text-5xl mb-3">{tipo === "comida" ? "🍲" : "🍹"}</Text>
          <Text className="text-base font-bold text-vino">No hay productos disponibles</Text>
          <Text className="text-xs text-stone-500 mt-1">Vuelve a consultar más tarde.</Text>
        </View>
      ) : esStaff ? (
        /* VISTA DE STAFF: LISTA VERTICAL CLÁSICA */
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View className="mb-4 rounded-2xl bg-white p-4 shadow-md border border-mostaza/30">
              <View className="flex-row">
                {item.fotos.length > 0 && item.fotos[0] ? (
                  <Image
                    source={{ uri: item.fotos[0] }}
                    className="h-20 w-20 rounded-xl"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="h-20 w-20 rounded-xl bg-stone-200 items-center justify-center">
                    <Text className="text-2xl">{item.categoria === "dish" ? "🍲" : "🍹"}</Text>
                  </View>
                )}

                <View className="ml-3 flex-1 justify-between">
                  <View>
                    <Text className="text-base font-bold text-vino">{item.nombre}</Text>
                    <Text className="text-xs text-stone-500" numberOfLines={2}>
                      {item.descripcion}
                    </Text>
                  </View>
                  <View className="flex-row items-center justify-between mt-2">
                    <Text className="font-bold text-calabaza">${item.precio}</Text>
                    <Text className="text-[11px] text-stone-400">⏱ {item.tiempoElaboracion} min</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => handleEliminarProducto(item.id)}
                className="mt-3 rounded-xl bg-terracota/20 py-2 items-center active:bg-terracota/40"
              >
                <Text className="font-bold text-terracota text-xs">🗑 Dar de baja producto</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      ) : (
        /* VISTA DE CLIENTE: MODO REEL / CARRUSEL */
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
          <View className="rounded-3xl bg-white p-4 shadow-xl border-2 border-mostaza/40">
            {/* 1. Carrusel horizontal de fotos */}
            <View className="relative h-64 w-full overflow-hidden rounded-2xl bg-stone-100">
              {itemActual.fotos && itemActual.fotos.length > 0 ? (
                <>
                  <ScrollView
                    ref={scrollFotosRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={handleScrollFotos}
                    scrollEventThrottle={16}
                    className="h-full w-full"
                  >
                    {itemActual.fotos.map((url, index) => (
                      <Image
                        key={`${itemActual.id}-foto-${index}`}
                        source={{ uri: url }}
                        style={{ width: CARD_WIDTH - 32, height: 256 }}
                        resizeMode="cover"
                      />
                    ))}
                  </ScrollView>

                  {/* Indicadores de puntos de fotos */}
                  {/* Indicadores de puntos de fotos sin Reanimated conflicts */}
                  {itemActual.fotos.length > 1 && (
                    <View className="absolute bottom-2 left-0 right-0 flex-row justify-center gap-1.5 bg-black/20 py-1">
                        {itemActual.fotos.map((_, i) => (
                        <View
                            key={`dot-${i}`}
                            className={`h-2 rounded-full ${
                            i === fotoActiva ? "w-5 bg-mostaza" : "w-2 bg-white/70"
                            }`}
                        />
                        ))}
                    </View>
                  )}
                </>
              ) : (
                <View className="h-full w-full items-center justify-center">
                  <Text className="text-6xl">{itemActual.categoria === "dish" ? "🍲" : "🍹"}</Text>
                </View>
              )}
            </View>

            {/* 2. Información del Plato */}
            <View className="mt-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-xl font-black text-vino flex-1 mr-2">
                  {itemActual.nombre}
                </Text>
                <Text className="text-2xl font-black text-calabaza">
                  ${itemActual.precio}
                </Text>
              </View>

              <View className="mt-1 flex-row items-center">
                <Text className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">
                  ⏱ {itemActual.tiempoElaboracion} min de preparación
                </Text>
                <Text className="ml-2 text-xs font-semibold text-stone-400">
                  {indiceActual + 1} de {items.length}
                </Text>
              </View>

              <Text className="mt-3 text-sm leading-5 text-stone-600">
                {itemActual.descripcion}
              </Text>
            </View>

            {/* 3. Botón Agregar al Carrito */}
            <TouchableOpacity
              onPress={() => agregarAlCarrito(itemActual)}
              className="mt-5 rounded-2xl bg-vino py-3.5 items-center active:bg-terracota shadow-md"
            >
              <Text
                style={{ fontFamily: "LaOriental" }}
                className="text-mostaza uppercase tracking-wider text-base font-bold"
              >
                🛒 Agregar al Carrito
              </Text>
            </TouchableOpacity>
          </View>

          {/* 4. Controles circulares Anterior / Siguiente */}
          <View className="mt-4 flex-row items-center justify-between gap-x-3">
            <TouchableOpacity
              onPress={platoAnterior}
              className="flex-1 flex-row items-center justify-center rounded-2xl border-2 border-mostaza bg-vino py-3 active:bg-terracota shadow-sm"
            >
              <Text className="mr-1 text-base font-black text-mostaza">‹</Text>
              <Text style={{ fontFamily: "LaOriental" }} className="text-sm uppercase text-mostaza">
                Anterior
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={platoSiguiente}
              className="flex-1 flex-row items-center justify-center rounded-2xl border-2 border-mostaza bg-vino py-3 active:bg-terracota shadow-sm"
            >
              <Text style={{ fontFamily: "LaOriental" }} className="text-sm uppercase text-mostaza">
                Siguiente
              </Text>
              <Text className="ml-1 text-base font-black text-mostaza">›</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}