import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../config/supabase";

interface Props {
  pedidoId: string;
  onVolver: () => void;
  onIrAJuegos?: () => void;
}

const ETAPAS = [
  { clave: "pending", titulo: "Recibido", icono: "📝", descripcion: "Esperando confirmación del mozo" },
  { clave: "in_preparation", titulo: "En Cocina", icono: "👨‍🍳", descripcion: "Preparando tus platos y bebidas" },
  { clave: "ready", titulo: "Listo", icono: "✨", descripcion: "Tu pedido está listo para ser servido" },
  { clave: "delivered", titulo: "Servido", icono: "🍽️", descripcion: "¡A disfrutar tu comida!" },
];

export function EstadoPedidoScreen({ pedidoId, onVolver, onIrAJuegos }: Props) {
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
            products (name, category)
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
      <SafeAreaView className="flex-1 items-center justify-center bg-amber-50">
        <ActivityIndicator size="large" color="#800020" />
      </SafeAreaView>
    );
  }

  const estadoActual = pedido?.status || "pending";
  const numMesa = pedido?.restaurant_tables?.table_number ?? "S/N";
  const indiceActual = ETAPAS.findIndex((e) => e.clave === estadoActual);
  const estaCancelado = estadoActual === "cancelled";

  return (
    <SafeAreaView className="flex-1 bg-amber-50 px-4 pt-2">
      {/* Header */}
      <View className="mb-4 flex-row items-center justify-between border-b border-mostaza/30 pb-3">
        <TouchableOpacity onPress={onVolver} className="px-2 py-1">
          <Text className="font-bold text-vino">← Volver</Text>
        </TouchableOpacity>

        <View className="items-center">
          <Text style={{ fontFamily: "LaOriental" }} className="text-xl uppercase text-vino">
            Mesa #{numMesa}
          </Text>
          <Text className="text-[10px] font-bold text-stone-500">
            Seguimiento en Vivo
          </Text>
        </View>

        <View className="w-12" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {!estaCancelado && (
          <View className="mb-5 rounded-2xl border-2 border-mostaza bg-vino p-4 shadow-md">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-xs text-amber-200/80 uppercase font-semibold">
                  Tiempo estimado de cocina
                </Text>
                <Text className="text-2xl font-black text-mostaza">
                  ⏱ ~{pedido?.estimated_delivery_time || 15} minutos
                </Text>
              </View>
              <Text className="text-4xl">🍲</Text>
            </View>
            <Text className="mt-2 text-xs text-amber-100/70">
              El tiempo corre desde que el mozo confirmó la comanda.
            </Text>
          </View>
        )}

        {estaCancelado && (
          <View className="mb-5 rounded-2xl border-2 border-red-300 bg-red-50 p-4">
            <Text className="text-lg font-black text-red-800">Pedido rechazado</Text>
            <Text className="mt-1 text-sm text-red-700">
              {pedido?.rejection_reason || "El mozo no especificó un motivo."}
            </Text>
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
                    <Text className="text-sm">{completado && !activo ? "✓" : etapa.icono}</Text>
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
            <Text className="text-sm font-bold text-stone-800">Total Abonado / A Pagar:</Text>
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
            <Text className="text-3xl mr-3">🎮</Text>
            <View className="flex-1">
              <Text style={{ fontFamily: "LaOriental" }} className="text-base uppercase text-white font-bold">
                Jugar en la Mesa
              </Text>
              <Text className="text-xs text-amber-100">
                Jugá mientras esperás la comida y ganá descuentos en tu cuenta.
              </Text>
            </View>
            <Text className="text-lg font-bold text-mostaza">→</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}