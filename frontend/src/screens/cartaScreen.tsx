import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
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
import { PerfilUsuario } from "../data/usuariosPrecargados";
import { ConfirmModal } from "../components/ConfirmModal";
import { FeedbackModal } from "../components/FeedbackModal";
import { useNavegacionPorMovimiento } from "../hooks/useNavegacionPorMovimiento";

// Únicos autorizados a dar de baja productos: cozinero y cantinero, cada uno
// sobre su propia sección (el cocinero solo ve comidas, el cantinero solo bebidas).
const ROLES_DAR_DE_BAJA: PerfilUsuario[] = ["cocinero", "cantinero"];

// Clientes (registrado o anónimo). Son los únicos con mesa y comanda, así que
// son los únicos que ven el CTA de agregar, la barra de importe y el chat.
const ROLES_CLIENTE: PerfilUsuario[] = ["cliente_registrado", "cliente_anonimo"];

type Categoria = "dish" | "drink" | "dessert";

const CATEGORIAS: { id: Categoria; etiqueta: string }[] = [
  { id: "dish", etiqueta: "🍲 Comidas" },
  { id: "drink", etiqueta: "🍹 Bebidas" },
  { id: "dessert", etiqueta: "🍰 Postres" },
];

// El cocinero solo trabaja con comidas y el cantinero solo con bebidas, así que
// no se les ofrecen las secciones que no les corresponden. Los demás roles
// (clientes y personal jerárquico) ven la carta completa.
const CATEGORIAS_POR_ROL: Partial<Record<PerfilUsuario, Categoria[]>> = {
  cocinero: ["dish", "dessert"],
  cantinero: ["drink"],
};

const ICONO_CATEGORIA: Record<Categoria, string> = {
  dish: "🍲",
  drink: "🍹",
  dessert: "🍰",
};

// Título del header según la categoría que se está viendo.
const TITULO_CATEGORIA: Record<Categoria, string> = {
  dish: "Carta de Platos",
  drink: "Carta de Bebidas",
  dessert: "Carta de Postres",
};

const ETIQUETA_FILTRO: Record<Categoria, string> = {
  dish: "Platos",
  drink: "Bebidas",
  dessert: "Postres",
};

// El filtro en pantalla solo ofrece comidas y postres; las bebidas se navegan
// desde el inicio y no se mezclan en el mismo selector.
type CategoriaFiltro = "dish" | "dessert";

const CATEGORIAS_FILTRO: CategoriaFiltro[] = ["dish", "dessert"];

// Íconos de cada botón de filtro: variante vino (activo) sobre fondo mostaza y
// variante mostaza (inactivo) sobre fondo vino.
const ICONO_FILTRO: Record<CategoriaFiltro, { activo: any; inactivo: any }> = {
  dish: {
    activo: require("../../assets/images/food-v.png"),
    inactivo: require("../../assets/images/food-y.png"),
  },
  dessert: {
    activo: require("../../assets/images/cake-v.png"),
    inactivo: require("../../assets/images/cake-y.png"),
  },
};

// Carrusel de fotos de un producto. Es un componente propio porque la carta
// muestra una tarjeta por página y cada una necesita su posición de foto y su
// referencia de scroll independientes. Mide su propio tamaño para que la foto
// ocupe el espacio disponible y cada slide llene el contenedor exacto.
export interface CarruselFotosHandle {
  /** Avanza (delta > 0) o retrocede (delta < 0) una foto, sin salir del rango. */
  cambiarFoto: (delta: number) => void;
  /** Vuelve a la primera foto del producto. */
  irAPrimera: () => void;
}

interface CarruselFotosProps {
  fotos: string[];
  iconoRespaldo: string;
}

const CarruselFotos = forwardRef<CarruselFotosHandle, CarruselFotosProps>(
  CarruselFotosBase
);

function CarruselFotosBase(
  { fotos, iconoRespaldo }: CarruselFotosProps,
  ref: React.ForwardedRef<CarruselFotosHandle>
) {
  const [fotoActiva, setFotoActiva] = useState(0);
  const [ancho, setAncho] = useState(0);
  const [alto, setAlto] = useState(0);
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (ancho <= 0) return;
    const slide = Math.round(event.nativeEvent.contentOffset.x / ancho);
    if (slide !== fotoActiva) setFotoActiva(slide);
  };

  const irAFoto = (indice: number) => {
    if (ancho <= 0) return;
    scrollRef.current?.scrollTo({ x: indice * ancho, animated: true });
    setFotoActiva(indice);
  };

  // Expone la navegación al padre para que los gestos muevan la foto del
  // producto que está visible, sin levantar el estado del carrusel.
  useImperativeHandle(
    ref,
    () => ({
      cambiarFoto: (delta: number) => {
        const destino = Math.max(0, Math.min(fotoActiva + delta, fotos.length - 1));
        irAFoto(destino);
      },
      irAPrimera: () => irAFoto(0),
    }),
    [fotoActiva, fotos.length, ancho]
  );

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0) setAncho(width);
    if (height > 0) setAlto(height);
  };

  return (
    <View
      onLayout={onLayout}
      className="relative w-full flex-1 overflow-hidden rounded-2xl bg-stone-100"
    >
      {fotos.length > 0 && ancho > 0 && alto > 0 ? (
        <>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            className="h-full w-full"
          >
            {fotos.map((url, index) => (
              <View
                key={`${url}-${index}`}
                style={{ width: ancho, height: alto }}
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

          {fotos.length > 1 && (
            <>
              {fotoActiva > 0 && (
                <TouchableOpacity
                  onPress={() => irAFoto(fotoActiva - 1)}
                  className="absolute left-2 top-1/2 -mt-4 h-8 w-8 items-center justify-center rounded-full bg-black/50"
                >
                  <Text className="text-base font-bold text-white">‹</Text>
                </TouchableOpacity>
              )}
              {fotoActiva < fotos.length - 1 && (
                <TouchableOpacity
                  onPress={() => irAFoto(fotoActiva + 1)}
                  className="absolute right-2 top-1/2 -mt-4 h-8 w-8 items-center justify-center rounded-full bg-black/50"
                >
                  <Text className="text-base font-bold text-white">›</Text>
                </TouchableOpacity>
              )}

              {/* Paginación de fotos */}
              <View className="absolute bottom-3 left-0 right-0 flex-row items-center justify-center gap-1.5">
                {fotos.map((_, indice) => (
                  <TouchableOpacity
                    key={`dot-${indice}`}
                    onPress={() => irAFoto(indice)}
                    hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver foto ${indice + 1} de ${fotos.length}`}
                    className={`h-2.5 rounded-full ${
                      fotoActiva === indice ? "w-4 bg-mostaza" : "w-2 bg-mostaza/40"
                    }`}
                  />
                ))}
              </View>
            </>
          )}
        </>
      ) : (
        <View className="h-full w-full items-center justify-center">
          <Text className="text-6xl">{iconoRespaldo}</Text>
        </View>
      )}
    </View>
  );
}

interface CartaScreenProps {
  tipo?: "comida" | "bebida" | "postre" | "todo";
  rolUsuario: PerfilUsuario;
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
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<Categoria>(
    tipo === "bebida" ? "drink" : tipo === "postre" ? "dessert" : "dish"
  );
  const [items, setItems] = useState<ItemMenu[]>([]);
  const [cargando, setCargando] = useState(true);
  const [itemAEliminar, setItemAEliminar] = useState<ItemMenu | null>(null);
  const [altoPagina, setAltoPagina] = useState(0);
  const [altoBarra, setAltoBarra] = useState(0);
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

  // --- Navegación por movimiento (acelerómetro + giroscopio) ---
  const listaRef = useRef<FlatList<ItemMenu> | null>(null);
  // Handle de cada carrusel, indexado por id de producto: el gesto actúa sobre
  // la tarjeta que está visible, sin levantar el estado de las fotos.
  const carruselRefs = useRef<Record<string, CarruselFotosHandle | null>>({});
  // Índice del producto visible. Va en un ref porque los gestos llegan desde el
  // sensor, fuera del ciclo de render.
  const indiceProductoRef = useRef(0);
  const [mostrarAyudaMovimiento, setMostrarAyudaMovimiento] = useState(true);

  // Todos los roles comparten la misma vista de carta. Lo único que cambia es
  // qué acciones se ofrecen: el personal de cocina/barra puede dar de baja
  // productos y los clientes pueden armar su comanda.
  const puedeDarDeBaja = ROLES_DAR_DE_BAJA.includes(rolUsuario);
  const esCliente = ROLES_CLIENTE.includes(rolUsuario);

  // Secciones que el rol puede ver. Si el rol no tiene restricción, ve todas.
  const categoriasVisibles = CATEGORIAS_POR_ROL[rolUsuario] ?? CATEGORIAS.map((c) => c.id);

  // Botones de filtro que efectivamente se muestran: intersección entre las
  // secciones del rol y las que el selector ofrece (comidas y postres).
  const categoriasFiltro = CATEGORIAS_FILTRO.filter((cat) => categoriasVisibles.includes(cat));

  // Si la categoría inicial no está permitida para el rol (por ejemplo, el
  // cantinero entra con "comida"), se usa la primera disponible. Se resuelve
  // durante el render para no llegar a consultar una sección prohibida.
  const categoriaActiva = categoriasVisibles.includes(categoriaSeleccionada)
    ? categoriaSeleccionada
    : categoriasVisibles[0];

  // Cocinero y clientes pueden alternar de sección dentro de la carta; el
  // cantinero solo tiene una sección y el resto del personal navega por separado.
  // El selector solo ofrece Platos y Postres, así que se oculta cuando la sección
  // activa es Bebidas (se navega desde el inicio y no se mezcla en el selector).
  const esCategoriaFiltro = (cat: Categoria): cat is CategoriaFiltro =>
    CATEGORIAS_FILTRO.includes(cat as CategoriaFiltro);

  const muestraFiltrosCategoria =
    (rolUsuario === "cocinero" || esCliente) && esCategoriaFiltro(categoriaActiva);

  const iconoCategoria = ICONO_CATEGORIA[categoriaActiva];

  // La barra de importe se superpone al final de la lista, así que la lista
  // necesita padding extra solo cuando la barra está visible.
  const muestraBarraInferior = esCliente && carrito.length > 0 && !!onIrAlCarrito;

  // Cada producto ocupa una página completa, así que hay que conocer el alto
  // disponible para que el scroll vertical pagee de a un producto.
  const onLayoutPagina = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    if (height > 0 && height !== altoPagina) setAltoPagina(height);
  };

  // La barra inferior es absolute y se superpone a la lista, así que su alto
  // real hay que medirlo: el importe y el conteo de ítems cambian con el carrito.
  const onLayoutBarra = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    if (height > 0 && height !== altoBarra) setAltoBarra(height);
  };

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
    cargarProductos(categoriaActiva);
  }, [categoriaActiva]);

  const cargarProductos = async (categoria: Categoria) => {
    try {
      setCargando(true);
      let query = supabase
        .from("products")
        .select("id, name, description, prep_time, price, photos, category, status")
        .eq("status", "active")
        .eq("category", categoria);

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

  const irAProducto = (indice: number) => {
    const destino = Math.max(0, Math.min(indice, items.length - 1));
    indiceProductoRef.current = destino;
    listaRef.current?.scrollToIndex({ index: destino, animated: true });
  };

  // Mantiene el índice sincronizado cuando el usuario desliza con el dedo.
  const sincronizarProductoVisible = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    if (altoPagina <= 0) return;
    const indice = Math.round(event.nativeEvent.contentOffset.y / altoPagina);
    indiceProductoRef.current = Math.max(0, Math.min(indice, items.length - 1));
  };

  // Aplica el gesto horizontal al carrusel del producto que se está viendo.
  const moverFoto = (delta: number) => {
    const id = items[indiceProductoRef.current]?.id;
    if (!id) return;
    carruselRefs.current[id]?.cambiarFoto(delta);
  };

  useNavegacionPorMovimiento({
    // El sensor se pausa mientras carga, con un modal abierto o sin productos.
    activo:
      !cargando && !itemAEliminar && !modalFeedback.visible && items.length > 0,
    // Izquierda / derecha: fotos del producto visible.
    onIzquierda: () => moverFoto(1),
    onDerecha: () => moverFoto(-1),
    // Adelante / atrás: producto anterior y siguiente.
    onAdelante: () => irAProducto(indiceProductoRef.current + 1),
    onAtras: () => irAProducto(indiceProductoRef.current - 1),
    // Giros alternados repetidos: primer producto y su primera foto.
    onReiniciar: () => {
      indiceProductoRef.current = 0;
      irAProducto(0);
      const id = items[0]?.id;
      if (id) carruselRefs.current[id]?.irAPrimera();
    },
    // Al primer gesto la ayuda ya cumplió su función.
    onMovimiento: () => setMostrarAyudaMovimiento(false),
  });

  // Al cambiar de sección la lista vuelve al primer producto.
  useEffect(() => {
    indiceProductoRef.current = 0;
    listaRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [categoriaActiva]);

  return (
    <View className="flex-1 bg-amber-50/40">
      {/* 1. Header con Mesa y Consulta al Mozo */}
      <View className="border-b border-mostaza/20 bg-vino px-5 py-3 items-center">
        <View className="flex-row items-center">
          <View className="items-center justify-center w-full border-b border-mostaza/70 py-2">
            <Text style={{ fontFamily: "LaOriental" }} className="text-3xl uppercase text-mostaza">
              {TITULO_CATEGORIA[categoriaActiva]}
            </Text>
          </View>
        </View>
      {/* Filtros de categoría: cocinero y clientes alternan entre Platos y Postres */}
        {muestraFiltrosCategoria && categoriasFiltro.length > 1 && (
          <View className="mt-3 flex-row justify-center gap-3">
            {categoriasFiltro.map((cat) => {
              const activa = cat === categoriaActiva;
              const icono = ICONO_FILTRO[cat];
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategoriaSeleccionada(cat)}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver ${ETIQUETA_FILTRO[cat]}`}
                  className={`rounded-full border px-4 py-2 ${
                    activa
                      ? "border-mostaza bg-mostaza"
                      : "border-mostaza/50 bg-transparent active:bg-mostaza/20"
                  }`}
                >
                  <Image
                    source={activa ? icono.activo : icono.inactivo}
                    className="h-7 w-7"
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Ayuda de gestos: se descarta a mano o al detectar el primer movimiento */}
        {mostrarAyudaMovimiento && !cargando && items.length > 0 && (
          <View className="mt-3 flex-row items-center rounded-full border border-mostaza/40 bg-mostaza/10 px-3 py-1.5">
            <Text className="text-[11px] font-semibold text-mostaza">
              Incliná el teléfono: ← → fotos · ↑ ↓ productos
            </Text>
            <TouchableOpacity
              onPress={() => setMostrarAyudaMovimiento(false)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Ocultar ayuda de movimiento"
              className="ml-2 h-5 w-5 items-center justify-center rounded-full bg-mostaza/20"
            >
              <Text className="text-[11px] font-bold text-mostaza">×</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 3. Contenido Principal — una tarjeta por página, scroll vertical tipo Reels */}
      <View onLayout={onLayoutPagina} className="flex-1">
        {cargando || altoPagina === 0 ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color="#800020" />
            <Text className="mt-2 text-xs font-semibold text-vino">Cargando delicias...</Text>
          </View>
        ) : items.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20">
            <Text className="mb-2 text-5xl">{iconoCategoria}</Text>
            <Text className="text-base font-bold text-vino">No hay productos en esta sección</Text>
            <Text className="mt-1 text-xs text-stone-500">Pronto agregaremos más opciones.</Text>
          </View>
        ) : (
          /* CARTA VERTICAL PAGINADA: cada producto ocupa una página completa */
          <FlatList
            ref={listaRef}
            data={items}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            decelerationRate="fast"
            disableIntervalMomentum
            snapToInterval={altoPagina}
            onMomentumScrollEnd={sincronizarProductoVisible}
            onScrollToIndexFailed={(info) => {
              // Respaldo: si la página todavía no está medida, salta directo.
              listaRef.current?.scrollToOffset({
                offset: info.index * altoPagina,
                animated: false,
              });
            }}
            getItemLayout={(_, index) => ({
              length: altoPagina,
              offset: altoPagina * index,
              index,
            })}
            renderItem={({ item }) => (
              <View
                className="px-5 pt-3"
                style={{
                  height: altoPagina,
                  paddingBottom: muestraBarraInferior ? altoBarra : 0,
                }}
              >
                <View className="mb-3 flex-1 overflow-hidden rounded-3xl border-2 border-mostaza/40 bg-white shadow-xl">
                  <View className="flex-1 p-4">
                    <CarruselFotos
                      ref={(r) => {
                        carruselRefs.current[item.id] = r;
                      }}
                      fotos={item.fotos}
                      iconoRespaldo={iconoCategoria}
                    />

                    {/* Ficha descriptiva */}
                    <View className="mt-3.5">
                      <View className="flex-row items-start justify-between">
                        <Text className="mr-2 mb-2 pr-5 flex-1 text-2xl font-black text-vino">
                          {item.nombre}
                        </Text>
                        <Text className="text-3xl font-black text-calabaza">
                          ${item.precio}
                        </Text>
                      </View>

                      <View className="mt-1 flex-row items-center">
                        <View className="rounded-md bg-amber-100 px-2 py-0.5">
                          <Text className="font-bold text-amber-900" style={{ fontSize: 16 }}>
                            ⏱ {item.tiempoElaboracion} minutos
                          </Text>
                        </View>
                      </View>
                      <Text
                        numberOfLines={3}
                        className="px-5 my-2 text-stone-600"
                        style={{ fontSize: 16 }}
                      >
                        {item.descripcion}
                      </Text>
                    </View>

                    {/* Acciones de la carta. Son mutuamente excluyentes: el personal de
                        cocina/barra da de baja, el cliente arma su comanda y el resto
                        (dueño, supervisor, metre, mozo) solo consulta. */}
                {puedeDarDeBaja ? (
                  <TouchableOpacity
                    onPress={() => setItemAEliminar(item)}
                    className="mt-2 flex-row items-center justify-center rounded-xl bg-terracota/20 py-2.5 active:bg-terracota/40"
                  >
                    <Image
                      source={require("../../assets/images/trash-t.png")}
                      className="mr-1.5 h-7 w-7"
                      resizeMode="contain"
                    />
                    <Text className="text-lg font-bold text-terracota">Dar de baja producto</Text>
                  </TouchableOpacity>
                ) : esCliente ? (
                      <TouchableOpacity
                        onPress={() => agregarAlCarrito(item)}
                        className="mt-2 flex-row items-center justify-center rounded-2xl bg-vino py-3 active:bg-terracota"
                      >
                        <Image
                          source={require("../../assets/images/sello.png")}
                          className="h-7 w-7"
                          resizeMode="contain"
                        />
                        <Text
                          style={{ fontFamily: "LaOriental" }}
                          className="mx-4 text-lg uppercase tracking-wider text-mostaza pt-1"
                        >
                          Agregar a la Mesa
                        </Text>
                        <Image
                          source={require("../../assets/images/sello.png")}
                          className="h-7 w-7"
                          resizeMode="contain"
                        />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </View>
            )}
          />
        )}
      </View>

      {/* 4. BARRA INFERIOR FIJA: IMPORTE ACUMULADO VISIBLE EN TODO MOMENTO (Punto 12) */}
      {muestraBarraInferior && onIrAlCarrito && (
        <View
          onLayout={onLayoutBarra}
          className="absolute bottom-0 left-0 right-0 border-t-2 border-mostaza bg-vino px-5 py-3 shadow-2xl"
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-sm font-bold uppercase text-amber-200">
                Importe acumulado ({carrito.length} ítem/s):
              </Text>
              {/* Buen tamaño requerido por Punto 12 */}
              <Text className="text-3xl font-black text-mostaza">
                ${importeAcumulado.toLocaleString("es-AR")}
              </Text>
              <Text className="text-sm text-amber-100/70">
                ⏱ Tiempo estimado: ~{tiempoEstimadoMax} min
              </Text>
            </View>

            <TouchableOpacity
              onPress={onIrAlCarrito}
              className="flex-row items-center rounded-2xl bg-calabaza px-4 py-2.5 shadow active:bg-calabaza/80"
            >
              <Text style={{ fontFamily: "LaOriental" }} className="text-xs font-black uppercase text-white">
                Ver pedido
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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