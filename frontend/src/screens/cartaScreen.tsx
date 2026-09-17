import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useCart, ItemMenu } from "../context/carritoContext";
import { supabase } from "../config/supabase";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CompanySpinner } from "../components/CompanySpinner";
import { ConfirmModal } from "../components/ConfirmModal";
import { FeedbackModal } from "../components/FeedbackModal";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 48; // ancho adaptado con padding

interface CartaScreenProps {
  tipo: "comida" | "bebida" | "todo";
  rolUsuario: "cocinero" | "cantinero" | "cliente_registrado" | "cliente_anonimo" | string;
  onVolver?: () => void;
  onIrAlCarrito?: () => void;
}

interface TarjetaProductoProps {
  item: ItemMenu;
  esCliente: boolean;
  esStaff: boolean;
  esCocinero: boolean;
  onAgregar: () => void;
  onEliminar: () => void;
}

function TarjetaProducto({ item, esCliente, esStaff, esCocinero, onAgregar, onEliminar }: TarjetaProductoProps) {
  const [fotoActiva, setFotoActiva] = useState(0);
  const [mostrarDots, setMostrarDots] = useState(false);
  const scrollFotosRef = useRef<ScrollView>(null);
  const ocultarDotsRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleScrollFotos = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / CARD_WIDTH);
    if (slide !== fotoActiva) {
      setFotoActiva(slide);
    }
    setMostrarDots(true);
    if (ocultarDotsRef.current) clearTimeout(ocultarDotsRef.current);
    ocultarDotsRef.current = setTimeout(() => setMostrarDots(false), 1200);
  };

  return (
    <View className="flex-1 rounded-3xl bg-white p-4 shadow-xl border-2 border-vino">
      {/* Título del producto */}
      <Text style={{ fontFamily: "LaOriental" }} className="mb-5 text-xl font-black text-vino">
        {item.nombre}
      </Text>

      {/* 1. Carrusel horizontal de fotos */}
      <View className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-stone-100">
        {item.fotos && item.fotos.length > 0 ? (
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
              {item.fotos.map((url, index) => (
                <Image
                  key={`${item.id}-foto-${index}`}
                  source={{ uri: url }}
                  style={{ width: CARD_WIDTH - 32, height: "100%" }}
                  resizeMode="contain"
                />
              ))}
            </ScrollView>

            {item.fotos.length > 1 && mostrarDots && (
              <View className="absolute bottom-2 left-0 right-0 flex-row justify-center">
                <View className="flex-row items-center gap-1.5 rounded-full bg-black/20 px-2.5 py-1">
                  {item.fotos.map((_, i) => (
                    <View
                      key={`dot-${i}`}
                      className={`h-2 rounded-full ${
                        i === fotoActiva ? "w-5 bg-mostaza" : "w-2 bg-white/70"
                      }`}
                    />
                  ))}
                </View>
              </View>
            )}
          </>
        ) : (
          <View className="h-full w-full items-center justify-center">
            <Text className="text-6xl">{item.categoria === "dish" ? "🍲" : "🍹"}</Text>
          </View>
        )}
      </View>

      {/* 2. Información del Plato */}
      <View className="mt-4 flex-1">
        <Text className="text-2xl font-black text-calabaza">
          ${item.precio}
        </Text>

        <View className="mt-3 flex-row items-center">
          <Text className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">
            ⏱ {item.tiempoElaboracion} min de preparación
          </Text>
        </View>

        <Text className="mt-3 text-sm leading-5 text-stone-600">
          {item.descripcion}
        </Text>
      </View>

      {/* 3. Botón Agregar al Carrito (solo clientes) */}
      {esCliente && (
        <TouchableOpacity
          onPress={onAgregar}
          className="mt-8 flex-row items-center justify-center rounded-2xl border border-amber-400/40 bg-vino py-3 active:bg-terracota"
        >
          <Image
            source={require("../../assets/images/sello.png")}
            className="h-7 w-7"
            resizeMode="contain"
          />
          <Text style={{ fontFamily: "LaOriental" }} className="mx-5 text-center text-l uppercase tracking-wider text-mostaza">
            Agregar al Carrito
          </Text>
          <Image
            source={require("../../assets/images/sello.png")}
            className="h-7 w-7"
            resizeMode="contain"
          />
        </TouchableOpacity>
      )}

      {/* 3b. Botón Dar de Baja (solo cocinero) */}
      {esStaff && (
        <TouchableOpacity
          onPress={onEliminar}
          className="mt-8 flex-row items-center justify-center rounded-2xl border border-terracota/40 bg-terracota/20 py-3 active:bg-terracota/40"
        >
          <Image
            source={require("../../assets/images/trash-t.png")}
            className="mr-3 h-6 w-6"
            resizeMode="contain"
          />
          <Text style={{ fontFamily: "LaOriental" }} className="text-l uppercase tracking-wider text-terracota">
            {esCocinero ? "Eliminar plato" : "Eliminar bebida"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function CartaScreen({ tipo, rolUsuario, onVolver, onIrAlCarrito }: CartaScreenProps) {
  const [items, setItems] = useState<ItemMenu[]>([]);
  const [cargando, setCargando] = useState(true);
  const [pageHeight, setPageHeight] = useState(0);
  const [itemAEliminar, setItemAEliminar] = useState<ItemMenu | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<{
    visible: boolean;
    tipo: "exito" | "error" | "informacion";
    titulo: string;
    mensaje: string;
  }>({
    visible: false,
    tipo: "informacion",
    titulo: "",
    mensaje: "",
  });

  const { agregarAlCarrito, carrito } = useCart();
  const insets = useSafeAreaInsets();

  const esStaff = rolUsuario === "cocinero" || rolUsuario === "cantinero";
  const esCliente = !esStaff;
  const mostrandoSpinner = cargando || (items.length > 0 && pageHeight === 0);

  const cartIcon =
    carrito.length === 0
      ? require("../../assets/images/cart-c.png")
      : require("../../assets/images/cart-y.png");

  const categoriaSupabase = tipo === "comida" ? "dish" : tipo === "bebida" ? "drink" : null;

  useEffect(() => {
    cargarProductos();
  }, [tipo]);

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
    } catch (err: any) {
      console.warn("⚠️ [Carta] Falló la carga de productos:", err.message);
      setItems([]);
    } finally {
      setCargando(false);
    }
  };

  const confirmarEliminacion = async () => {
    if (!itemAEliminar) return;
    const { id, nombre } = itemAEliminar;
    setEliminando(true);
    try {
      const { error } = await supabase
        .from("products")
        .update({ status: "inactive" })
        .eq("id", id);

      if (!error) {
        setItems((prev) => prev.filter((item) => item.id !== id));
        setItemAEliminar(null);
        setModalFeedback({
          visible: true,
          tipo: "exito",
          titulo: "¡Producto eliminado!",
          mensaje: `"${nombre}" fue eliminado correctamente.`,
        });
      } else {
        console.warn("Error al eliminar el producto:", error.message);
        setItemAEliminar(null);
        setModalFeedback({
          visible: true,
          tipo: "error",
          titulo: "Error",
          mensaje: `No se pudo eliminar "${nombre}". Intente nuevamente.`,
        });
      }
    } catch (err: any) {
      console.warn("Error al eliminar el producto:", err.message);
      setItemAEliminar(null);
      setModalFeedback({
        visible: true,
        tipo: "error",
        titulo: "Error",
        mensaje: `No se pudo eliminar "${nombre}". Intente nuevamente.`,
      });
    } finally {
      setEliminando(false);
    }
  };

  const cancelarEliminacion = () => setItemAEliminar(null);

  return (
    <View className="flex-1 px-6 pt-4 bg-amber-50/40">
      {/* Nombres del equipo */}
      <View className="absolute right-4 z-10 items-end" style={{ top: insets.top + 16 }}>
        <Text className="text-[10px] text-vino/70">Rocío Sanchez</Text>
        <Text className="text-[10px] text-vino/70">Santino Casado</Text>
        <Text className="text-[10px] text-vino/70">Sebastián Andreozzi</Text>
        <Text className="text-[10px] text-vino/70">Valentín Brazanovich</Text>
      </View>

      {/* Cabecera */}
      <View className="mb-2">
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
      </View>

      {/* Header */}
      <View className="relative flex-row items-center justify-between mb-1 border-b border-mostaza/20 pb-5">
        {esCliente && onIrAlCarrito ? (
          <TouchableOpacity
            onPress={onIrAlCarrito}
            className={`z-20 flex-row items-center justify-center rounded-xl px-3 py-1.5 shadow-sm active:bg-terracota ${carrito.length === 0 ? "bg-[#FBE9DF]" : "bg-vino"}`}
          >
            <Image
              source={cartIcon}
              className="mr-1 h-5 w-5"
              resizeMode="contain"
            />
            <Text className={`font-bold text-sm translate-y-0.5 ${carrito.length === 0 ? "text-calabaza" : "text-mostaza"}`}>
              {carrito.length}
            </Text>
          </TouchableOpacity>
        ) : (
          <View className="w-10" />
        )}

        <Text
          style={{ fontFamily: "LaOriental" }}
          className="absolute inset-x-0 z-10 text-center text-xl uppercase text-vino pointer-events-none pb-3"
        >
          {tipo === "comida" ? "Carta de Platos" : tipo === "bebida" ? "Carta de Bebidas" : "Menú"}
        </Text>

        
      </View>

      {/* Loading state */}
      {cargando ? (
        <View className="flex-1" />
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center py-20">
          <Text className="text-5xl mb-3">{tipo === "comida" ? "🍲" : "🍹"}</Text>
          <Text className="text-base font-bold text-vino">No hay productos disponibles</Text>
          <Text className="text-xs text-stone-500 mt-1">Vuelve a consultar más tarde.</Text>
        </View>
      ) : (
        /* VISTA: REEL VERTICAL tipo TikTok/Reels */
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          pagingEnabled
          onLayout={(e) => setPageHeight(e.nativeEvent.layout.height)}
          style={pageHeight === 0 ? { opacity: 0 } : undefined}
        >
          {items.map((item) => (
            <View key={item.id} style={{ height: pageHeight }} className="w-full py-2">
              <TarjetaProducto
                item={item}
                esCliente={esCliente}
                esStaff={esStaff}
                esCocinero={rolUsuario === "cocinero"}
                onAgregar={() => agregarAlCarrito(item)}
                onEliminar={() => setItemAEliminar(item)}
              />
            </View>
          ))}
        </ScrollView>
      )}

      <CompanySpinner visible={mostrandoSpinner} mensaje="Cargando carta..." />

      <ConfirmModal
        visible={!!itemAEliminar}
        titulo="Eliminar producto"
        mensaje={`¿Está seguro de que desea dar de baja "${itemAEliminar?.nombre}"?`}
        textoConfirmar="Eliminar"
        textoCancelar="Cancelar"
        tipo="peligro"
        cargando={eliminando}
        onConfirm={confirmarEliminacion}
        onCancel={cancelarEliminacion}
      />

      <FeedbackModal
        visible={modalFeedback.visible}
        tipo={modalFeedback.tipo}
        titulo={modalFeedback.titulo}
        mensaje={modalFeedback.mensaje}
        onClose={() => setModalFeedback((p) => ({ ...p, visible: false }))}
      />
    </View>
  );
}