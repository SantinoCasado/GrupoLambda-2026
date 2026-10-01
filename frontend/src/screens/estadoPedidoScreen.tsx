import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../config/supabase";
import { useCart, ItemCarrito } from "../context/carritoContext";
import { ChineseFrame } from "../components/ChineseFrame";

interface Props {
  pedidoId: string;
  onVolver: () => void;
  onIrAJuegos?: () => void;
  onEditarComanda?: (motivo: string | null) => void;
}

const ETAPAS = [
  { clave: "pending", titulo: "Recibido", iconoActivo: require("../../assets/images/audit-y.png"), iconoPendiente: require("../../assets/images/audit-g.png"), descripcion: "Esperando confirmación del mozo" },
  { clave: "in_preparation", titulo: "En Cocina", iconoActivo: require("../../assets/images/chef-y.png"), iconoPendiente: require("../../assets/images/chef-g.png"), descripcion: "Preparando tus platos y bebidas" },
  { clave: "ready", titulo: "Listo", iconoActivo: require("../../assets/images/serving-y.png"), iconoPendiente: require("../../assets/images/serving-g.png"), descripcion: "Tu pedido está listo para ser servido" },
  { clave: "delivered", titulo: "Servido", iconoActivo: require("../../assets/images/dish-y.png"), iconoPendiente: require("../../assets/images/dish-g.png"), descripcion: "¡A disfrutar tu comida!" },
];

export function EstadoPedidoScreen({ pedidoId, onVolver, onIrAJuegos, onEditarComanda }: Props) {
  const { reemplazarCarrito } = useCart();
  const [pedido, setPedido] = useState<any | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargarPedido = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
           id,
           status,
           rejection_reason,
           total_amount,
          estimated_delivery_time,
          created_at,
          restaurant_tables (table_number),
          order_items (
            id,
            quantity,
            unit_price,
            products (id, name, description, price, prep_time, photos, category)
          )
        `)
        .eq("id", pedidoId)
        .single();

      if (!error && data) {
        setPedido(data);
      }
    } catch (e: any) {
      console.warn("Error cargando estado:", e.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarPedido();

    // Actualización en tiempo real del estado de la orden
    const canal = supabase
      .channel(`seguimiento_${pedidoId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${pedidoId}`,
        },
        () => cargarPedido()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [pedidoId]);

  if (cargando) {
    return (
      <View className="flex-1 items-center justify-center bg-amber-50">
        <ActivityIndicator size="large" color="#800020" />
      </View>
    );
  }

  const estadoActual = pedido?.status || "pending";
  const numMesa = pedido?.restaurant_tables?.table_number ?? "S/N";
  const indiceActual = ETAPAS.findIndex((e) => e.clave === estadoActual);
  const estaCancelado = estadoActual === "cancelled";

  /**
   * El carrito se vació al enviar la comanda original, así que los ítems del
   * pedido rechazado se reconstruyen desde order_items para poder editarlos.
   * El precio se toma del producto actual (el backend recalcula el total con
   * ese mismo valor) y se cae a unit_price como respaldo.
   */
  const manejarEditarComanda = () => {
    const items: ItemCarrito[] = (pedido?.order_items || [])
      .filter((it: any) => it?.products?.id)
      .map((it: any) => ({
        id: it.products.id,
        nombre: it.products.name || "Producto",
        descripcion: it.products.description || "",
        precio: Number(it.products.price ?? it.unit_price) || 0,
        categoria: it.products.category || "dish",
        tiempoElaboracion: Number(it.products.prep_time) || 0,
        fotos: Array.isArray(it.products.photos) ? it.products.photos : [],
        cantidad: Number(it.quantity) || 1,
      }));

    if (items.length === 0) return;

    reemplazarCarrito(items);
    onEditarComanda?.(pedido?.rejection_reason ?? null);
  };

  return (
    <View className="flex-1 bg-amber-50 px-4 pt-2">
      {/* Header */}
      <View className="mb-4 flex-row items-center justify-center border-b border-mostaza/30 pb-3">

        <View className="items-center w-full justify-center items-center flex-col">
          <Text style={{ fontFamily: "LaOriental" }} className="text-xl uppercase text-vino">
            Mesa #{numMesa}
          </Text>
          <Text className="text-xs font-bold text-stone-500">
            Seguimiento del pedido
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {!estaCancelado && (
          <View className="mb-5 rounded-2xl border-2 border-mostaza bg-vino p-4 shadow-md">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-xs text-amber-200/80 uppercase font-semibold">
                  Tiempo estimado de preparación
                </Text>
                <Text className="text-2xl font-black text-mostaza">
                  ⏱ ~{pedido?.estimated_delivery_time || 15} minutos
                </Text>
              </View>
              <Image
                source={require("../../assets/images/food-y.png")}
                className="h-9 w-9 mr-2"
                resizeMode="contain"
              />
            </View>
          </View>
        )}

        {estaCancelado && (
          <View className="mb-5 rounded-2xl border-2 border-red-300 bg-red-50 p-4">
            <Text className="text-lg font-black text-red-800">Pedido rechazado</Text>
            <Text className="mt-1 text-sm text-red-700">
              {pedido?.rejection_reason || "El mozo no especificó un motivo."}
            </Text>

            {onEditarComanda && (pedido?.order_items?.length ?? 0) > 0 && (
              <ChineseFrame className="mt-4 w-full" color="#c32f27">
                <TouchableOpacity
                  onPress={manejarEditarComanda}
                  className="w-full items-center rounded-xl bg-vino px-4 py-3 active:bg-terracota"
                >
                  <Text className="text-sm font-black uppercase tracking-wider text-mostaza">
                    Modificar comanda
                  </Text>
                  <Text className="mt-0.5 text-center text-[11px] text-amber-100">
                    Volvé a armarla y reenviala al mozo
                  </Text>
                </TouchableOpacity>
              </ChineseFrame>
            )}
          </View>
        )}

        {/* Línea de Etapas / Progreso */}
        <View className="mb-5 rounded-2xl border border-mostaza/30 bg-white p-4 shadow-sm">
          <Text style={{ fontFamily: "LaOriental" }} className="mb-4 text-base uppercase text-vino">
            Estado de Preparación
          </Text>

          <View className="gap-y-4">
            {ETAPAS.map((etapa, idx) => {
              const completado = !estaCancelado && idx <= (indiceActual >= 0 ? indiceActual : 0);
              const activo = !estaCancelado && idx === indiceActual;

              return (
                <View key={etapa.clave} className="flex-row items-center">
                  <View
                    className={`h-9 w-9 items-center justify-center rounded-full border-2 ${
                      activo
                        ? "border-mostaza bg-vino"
                        : completado
                        ? "border-emerald-600 bg-emerald-500"
                        : "border-stone-300 bg-stone-100"
                    }`}
                  >
                    {completado && !activo ? (
                      <Text className="text-sm">✓</Text>
                    ) : activo ? (
                      <Image source={etapa.iconoActivo} className="h-5 w-5" resizeMode="contain" />
                    ) : (
                      <Image source={etapa.iconoPendiente} className="h-5 w-5" resizeMode="contain" />
                    )}
                  </View>

                  <View className="ml-3 flex-1">
                    <Text
                      className={`text-sm font-bold ${
                        activo ? "text-vino" : completado ? "text-emerald-700" : "text-stone-400"
                      }`}
                    >
                      {etapa.titulo}
                    </Text>
                    <Text className="text-[11px] text-stone-500">{etapa.descripcion}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Resumen de la Comanda */}
        <View className="mb-5 rounded-2xl border border-mostaza/30 bg-white p-4 shadow-sm">
          <Text style={{ fontFamily: "LaOriental" }} className="mb-2 text-base uppercase text-vino">
            Detalle del Pedido
          </Text>

          {(pedido?.order_items || []).map((it: any) => (
            <View key={it.id} className="flex-row justify-between border-b border-stone-100 py-2">
              <Text className="text-xs font-semibold text-stone-800">
                {it.quantity}x {it.products?.name}
              </Text>
              <Text className="text-xs font-bold text-calabaza">
                ${Number(it.unit_price) * it.quantity}
              </Text>
            </View>
          ))}

          <View className="mt-3 flex-row justify-between pt-2 border-t border-mostaza/20">
            <Text className="text-sm font-bold text-vino">TOTAL</Text>
            <Text className="text-lg font-black text-calabaza">
              ${Number(pedido?.total_amount || 0).toLocaleString("es-AR")}
            </Text>
          </View>
        </View>

        {/* Acceso a Juegos mientras espera */}
        {onIrAJuegos && !estaCancelado && (
          <TouchableOpacity
            onPress={onIrAJuegos}
            className="mb-6 flex-row items-center rounded-2xl border-2 border-mostaza bg-calabaza p-4 shadow-md active:bg-vino"
          >
            <Image source={require("../../assets/images/joystick-w.png")} className="h-8 w-8 mr-3" resizeMode="contain" />
            <View className="flex-1">
              <Text style={{ fontFamily: "LaOriental" }} className="text-base uppercase text-white">
                Jugos
              </Text>
              <Text className="text-xs text-amber-100">
                Jugá mientras esperás y ganá descuentos.
              </Text>
            </View>
            <Image source={require("../../assets/images/right-arrow-w.png")} className="h-6 w-6" resizeMode="contain" />
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}