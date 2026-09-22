import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
} from "react-native";
import { useCart, ItemMenu } from "../context/carritoContext";
import { supabase } from "../config/supabase";

interface CartaScreenProps {
  tipo?: "comida" | "bebida" | "postre" | "todo";
  rolUsuario: "cocinero" | "cantinero" | "cliente_registrado" | "cliente_anonimo" | string;
  numeroMesa?: number;
  onVolver?: () => void;
  onIrAlCarrito?: () => void;
  onAbrirChatMozo?: () => void;
}

export function CartaScreen({
  tipo = "comida",
  rolUsuario,
  numeroMesa,
  onVolver,
  onIrAlCarrito,
  onAbrirChatMozo,
}: CartaScreenProps) {
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<"dish" | "drink" | "dessert">(
    tipo === "bebida" ? "drink" : tipo === "postre" ? "dessert" : "dish"
  );
  const [items, setItems] = useState<ItemMenu[]>([]);
  const [cargando, setCargando] = useState(true);
  const [indiceActual, setIndiceActual] = useState(0);
  const [fotoActiva, setFotoActiva] = useState(0);
  const [anchoContenedorFoto, setAnchoContenedorFoto] = useState(0);

  const { agregarAlCarrito, carrito } = useCart();
  const scrollFotosRef = useRef<ScrollView>(null);

  const esStaff = rolUsuario === "cocinero" || rolUsuario === "cantinero";
  const esCliente = !esStaff;

  // Cálculo del total acumulado y tiempo acumulado para mostrar siempre visible (Punto 12)
  const importeAcumulado = carrito.reduce(
    (total, item) => total + (item.precio || 0) * (item.cantidad || 1),
    0
  );
  const tiempoEstimadoMax = carrito.reduce(
    (max, item) => Math.max(max, item.tiempoElaboracion || 0),
    0
  );

  useEffect(() => {
    cargarProductos();
  }, [categoriaSeleccionada]);

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
        .eq("status", "active")
        .eq("category", categoriaSeleccionada);

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

  const platoAnterior = () => {
    if (items.length === 0) return;
    setIndiceActual((prev) => (prev === 0 ? items.length - 1 : prev - 1));
  };

  const platoSiguiente = () => {
    if (items.length === 0) return;
    setIndiceActual((prev) => (prev === items.length - 1 ? 0 : prev + 1));
  };

  const handleScrollFotos = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (anchoContenedorFoto <= 0) return;
    const slide = Math.round(event.nativeEvent.contentOffset.x / anchoContenedorFoto);
    if (slide !== fotoActiva) {
      setFotoActiva(slide);
    }
  };

  const cambiarFotoDirecta = (nuevaFotoIndex: number) => {
    if (anchoContenedorFoto > 0) {
      scrollFotosRef.current?.scrollTo({
        x: nuevaFotoIndex * anchoContenedorFoto,
        animated: true,
      });
      setFotoActiva(nuevaFotoIndex);
    }
  };

  const onLayoutContenedorFoto = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0 && width !== anchoContenedorFoto) {
      setAnchoContenedorFoto(width);
    }
  };

  const itemActual = items[indiceActual];

  return (
    <View className="flex-1 bg-amber-50/40">
      {/* 1. Header con Mesa y Consulta al Mozo */}
      <View className="flex-row items-center justify-between border-b border-mostaza/20 bg-vino px-5 py-3 shadow-md">
        {onVolver ? (
          <TouchableOpacity onPress={onVolver} className="py-1 pr-3">
            <Text className="text-sm font-bold text-amber-100">← Volver</Text>
          </TouchableOpacity>
        ) : (
          <View className="w-10" />
        )}

        <View className="items-center">
          <Text style={{ fontFamily: "LaOriental" }} className="text-xl uppercase text-mostaza">
            Carta Digital
          </Text>
          {numeroMesa ? (
            <Text className="text-[11px] font-bold text-amber-200">
              Mesa #{numeroMesa}
            </Text>
          ) : null}
        </View>

        {/* Botón Consulta al Mozo (Punto 11) */}
        {esCliente && onAbrirChatMozo ? (
          <TouchableOpacity
            onPress={onAbrirChatMozo}
            className="flex-row items-center rounded-xl border border-mostaza/60 bg-calabaza/90 px-2.5 py-1.5 active:bg-calabaza"
          >
            <Text className="mr-1 text-sm">💬</Text>
            <Text className="text-[11px] font-extrabold text-white uppercase">Mozo</Text>
          </TouchableOpacity>
        ) : (
          <View className="w-10" />
        )}
      </View>

      {/* 2. Pestañas de Categoría (Platos, Bebidas, Postres) */}
      {esCliente && (
        <View className="flex-row border-b border-mostaza/20 bg-vino/95 px-4 py-2 justify-around">
          <TouchableOpacity
            onPress={() => setCategoriaSeleccionada("dish")}
            className={`rounded-xl px-4 py-1.5 ${
              categoriaSeleccionada === "dish" ? "bg-mostaza" : "bg-black/20"
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                categoriaSeleccionada === "dish" ? "text-vino" : "text-amber-100/70"
              }`}
            >
              🍲 Comidas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setCategoriaSeleccionada("drink")}
            className={`rounded-xl px-4 py-1.5 ${
              categoriaSeleccionada === "drink" ? "bg-mostaza" : "bg-black/20"
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                categoriaSeleccionada === "drink" ? "text-vino" : "text-amber-100/70"
              }`}
            >
              🍹 Bebidas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setCategoriaSeleccionada("dessert")}
            className={`rounded-xl px-4 py-1.5 ${
              categoriaSeleccionada === "dessert" ? "bg-mostaza" : "bg-black/20"
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                categoriaSeleccionada === "dessert" ? "text-vino" : "text-amber-100/70"
              }`}
            >
              🍰 Postres
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 3. Contenido Principal */}
      <View className="flex-1 px-5 pt-3">
        {cargando ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color="#800020" />
            <Text className="mt-2 text-xs font-semibold text-vino">Cargando delicias...</Text>
          </View>
        ) : items.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20">
            <Text className="mb-2 text-5xl">
              {categoriaSeleccionada === "dish" ? "🍲" : categoriaSeleccionada === "drink" ? "🍹" : "🍰"}
            </Text>
            <Text className="text-base font-bold text-vino">No hay productos en esta sección</Text>
            <Text className="mt-1 text-xs text-stone-500">Pronto agregaremos más opciones.</Text>
          </View>
        ) : esStaff ? (
          /* VISTA STAFF */
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View className="mb-3 rounded-2xl border border-mostaza/30 bg-white p-3.5 shadow-sm">
                <View className="flex-row">
                  {item.fotos.length > 0 && item.fotos[0] ? (
                    <Image
                      source={{ uri: item.fotos[0] }}
                      className="h-20 w-20 rounded-xl"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="h-20 w-20 items-center justify-center rounded-xl bg-stone-200">
                      <Text className="text-2xl">🍲</Text>
                    </View>
                  )}
                  <View className="ml-3 flex-1 justify-between">
                    <View>
                      <Text className="text-base font-bold text-vino">{item.nombre}</Text>
                      <Text className="text-xs text-stone-500" numberOfLines={2}>
                        {item.descripcion}
                      </Text>
                    </View>
                    <View className="mt-2 flex-row items-center justify-between">
                      <Text className="font-bold text-calabaza">${item.precio}</Text>
                      <Text className="text-[11px] text-stone-400">⏱ {item.tiempoElaboracion} min</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => handleEliminarProducto(item.id)}
                  className="mt-3 items-center rounded-xl bg-terracota/20 py-2 active:bg-terracota/40"
                >
                  <Text className="text-xs font-bold text-terracota">🗑 Dar de baja producto</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        ) : (
          /* VISTA CLIENTE: TARJETA CON 3 FOTOS INDIVIDUALES (Punto 11) */
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 110 }}
          >
            <View className="rounded-3xl border-2 border-mostaza/40 bg-white p-4 shadow-xl">
              {/* Contenedor exacto de imágenes */}
              <View
                onLayout={onLayoutContenedorFoto}
                className="relative h-64 w-full overflow-hidden rounded-2xl bg-stone-100"
              >
                {itemActual.fotos && itemActual.fotos.length > 0 && anchoContenedorFoto > 0 ? (
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
                        <View
                          key={`${itemActual.id}-foto-${index}`}
                          style={{ width: anchoContenedorFoto, height: 256 }}
                          className="items-center justify-center bg-stone-900/5"
                        >
                          <Image
                            source={{ uri: url }}
                            style={{ width: "100%", height: "100%" }}
                            resizeMode="cover"
                          />
                        </View>
                      ))}
                    </ScrollView>

                    {/* Flechas para cambiar de foto individualmente (Punto 11) */}
                    {itemActual.fotos.length > 1 && (
                      <>
                        {fotoActiva > 0 && (
                          <TouchableOpacity
                            onPress={() => cambiarFotoDirecta(fotoActiva - 1)}
                            className="absolute left-2 top-1/2 -mt-4 h-8 w-8 items-center justify-center rounded-full bg-black/50"
                          >
                            <Text className="text-base font-bold text-white">‹</Text>
                          </TouchableOpacity>
                        )}
                        {fotoActiva < itemActual.fotos.length - 1 && (
                          <TouchableOpacity
                            onPress={() => cambiarFotoDirecta(fotoActiva + 1)}
                            className="absolute right-2 top-1/2 -mt-4 h-8 w-8 items-center justify-center rounded-full bg-black/50"
                          >
                            <Text className="text-base font-bold text-white">›</Text>
                          </TouchableOpacity>
                        )}
                      </>
                    )}

                    {/* Indicador de fotos (Punto 11: 3 imágenes individuales) */}
                    <View className="absolute bottom-2 left-0 right-0 flex-row items-center justify-center gap-1.5">
                      <View className="flex-row rounded-full bg-black/60 px-2 py-0.5">
                        <Text className="text-[10px] font-bold text-white">
                          Foto {fotoActiva + 1} de {itemActual.fotos.length}
                        </Text>
                      </View>
                    </View>
                  </>
                ) : (
                  <View className="h-full w-full items-center justify-center">
                    <Text className="text-6xl">
                      {categoriaSeleccionada === "dish" ? "🍲" : categoriaSeleccionada === "drink" ? "🍹" : "🍰"}
                    </Text>
                  </View>
                )}
              </View>

              {/* Ficha descriptiva */}
              <View className="mt-3.5">
                <View className="flex-row items-start justify-between">
                  <Text className="mr-2 flex-1 text-lg font-black text-vino">
                    {itemActual.nombre}
                  </Text>
                  <Text className="text-2xl font-black text-calabaza">
                    ${itemActual.precio}
                  </Text>
                </View>

                <View className="mt-1 flex-row items-center">
                  <View className="rounded-md bg-amber-100 px-2 py-0.5">
                    <Text className="text-[11px] font-bold text-amber-900">
                      ⏱ {itemActual.tiempoElaboracion} min elaboración
                    </Text>
                  </View>
                  <Text className="ml-2 text-xs font-semibold text-stone-400">
                    {indiceActual + 1} de {items.length}
                  </Text>
                </View>

                <Text className="mt-2 text-xs leading-relaxed text-stone-600">
                  {itemActual.descripcion}
                </Text>
              </View>

              {/* Botón Agregar al Carrito */}
              <TouchableOpacity
                onPress={() => agregarAlCarrito(itemActual)}
                className="mt-4 flex-row items-center justify-center rounded-2xl bg-vino py-3 shadow active:bg-terracota"
              >
                <Text className="mr-2 text-base">🛒</Text>
                <Text
                  style={{ fontFamily: "LaOriental" }}
                  className="text-sm font-bold uppercase tracking-wider text-mostaza"
                >
                  Agregar a la Mesa
                </Text>
              </TouchableOpacity>
            </View>

            {/* Controles de Navegación de Productos */}
            <View className="mt-3 flex-row items-center justify-between gap-x-3">
              <TouchableOpacity
                onPress={platoAnterior}
                className="flex-1 flex-row items-center justify-center rounded-2xl border-2 border-mostaza bg-vino py-2.5 active:bg-terracota"
              >
                <Text className="mr-1 text-base font-black text-mostaza">‹</Text>
                <Text style={{ fontFamily: "LaOriental" }} className="text-xs uppercase text-mostaza">
                  Anterior
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={platoSiguiente}
                className="flex-1 flex-row items-center justify-center rounded-2xl border-2 border-mostaza bg-vino py-2.5 active:bg-terracota"
              >
                <Text style={{ fontFamily: "LaOriental" }} className="text-xs uppercase text-mostaza">
                  Siguiente
                </Text>
                <Text className="ml-1 text-base font-black text-mostaza">›</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>

      {/* 4. BARRA INFERIOR FIJA: IMPORTE ACUMULADO VISIBLE EN TODO MOMENTO (Punto 12) */}
      {esCliente && carrito.length > 0 && onIrAlCarrito && (
        <View className="absolute bottom-0 left-0 right-0 border-t-2 border-mostaza bg-vino px-5 py-3 shadow-2xl">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-[10px] font-bold uppercase text-amber-200">
                Importe acumulado ({carrito.length} ítems):
              </Text>
              {/* Buen tamaño requerido por Punto 12 */}
              <Text className="text-2xl font-black text-mostaza">
                ${importeAcumulado.toLocaleString("es-AR")}
              </Text>
              <Text className="text-[10px] text-amber-100/70">
                ⏱ Tiempo estimado: ~{tiempoEstimadoMax} min
              </Text>
            </View>

            <TouchableOpacity
              onPress={onIrAlCarrito}
              className="flex-row items-center rounded-2xl bg-calabaza px-4 py-2.5 shadow active:bg-calabaza/80"
            >
              <Text style={{ fontFamily: "LaOriental" }} className="mr-1.5 text-xs font-black uppercase text-white">
                Ver Comanda
              </Text>
              <Text className="text-base">➔</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}