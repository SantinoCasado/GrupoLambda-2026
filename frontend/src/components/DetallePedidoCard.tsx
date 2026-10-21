import React from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";

interface DetallePedidoItem {
  id: string;
  quantity: number;
  unit_price: number | string;
  products?: { name?: string | null } | null;
}

interface DetallePedidoCardProps {
  pedido: {
    total_amount?: number | string | null;
    discount_amount?: number | string | null;
    tip_amount?: number | string | null;
    order_items?: DetallePedidoItem[] | null;
  } | null;
  /** Porcentaje de descuento ganado en juegos. 0 = sin descuento (o desconocido). */
  descuentoPct?: number;
  cargando?: boolean;
  /** Estilos de layout del contenedor (por ejemplo, el margen inferior). */
  className?: string;
}

/**
 * Resumen de precios de un pedido: ítems, subtotal, descuento de juegos y
 * propina. El subtotal y el descuento se recalculan con la misma lógica que
 * `cuentaService.obtenerDetalleCuenta` para que el total coincida con lo que
 * se cobrará realmente.
 */
export function DetallePedidoCard({
  pedido,
  descuentoPct = 0,
  cargando = false,
  className = "",
}: DetallePedidoCardProps) {
  const items = pedido?.order_items ?? [];

  const sumatoriaItems = items.reduce(
    (acc, it) => acc + Number(it.unit_price || 0) * Number(it.quantity || 0),
    0
  );
  const subtotal =
    sumatoriaItems > 0 ? sumatoriaItems : Number(pedido?.total_amount || 0);

  const descuento =
    descuentoPct > 0
      ? Math.round(subtotal * descuentoPct) / 100
      : Number(pedido?.discount_amount || 0);

  const propina = Number(pedido?.tip_amount || 0);
  const total = Math.max(0, subtotal - descuento + propina);

  const formatear = (monto: number) => `$${monto.toLocaleString("es-AR")}`;

  return (
    <View
      style={{ height: 215 }}
      className={`rounded-2xl border border-mostaza/70 bg-amber-50 p-4 ${className}`}
    >
      <Text
        style={{ fontFamily: "LaOriental" }}
        className="mb-2 text-xl uppercase text-vino"
      >
        Detalle del Pedido
      </Text>

      {cargando ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color="#8B1A1A" />
          <Text className="mt-2 text-xs font-semibold text-stone-600">
            Cargando detalle...
          </Text>
        </View>
      ) : !pedido ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-center text-xs text-stone-600">
            No se pudo cargar el detalle del pedido.
          </Text>
        </View>
      ) : (
        <>
          <ScrollView
            className="flex-1"
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            {items.map((it) => (
              <View
                key={it.id}
                className="flex-row justify-between border-b border-stone-200 py-1.5"
              >
                <Text className="text-sm font-semibold text-stone-800">
                  {it.quantity}x {it.products?.name}
                </Text>
                <Text className="text-sm font-bold text-calabaza">
                  ${Number(it.unit_price) * it.quantity}
                </Text>
              </View>
            ))}
          </ScrollView>

          <View className="flex-row justify-between pt-1.5">
            <Text className="text-xs font-semibold text-stone-600">Subtotal</Text>
            <Text className="text-xs font-bold text-stone-700">
              {formatear(subtotal)}
            </Text>
          </View>

          {descuento > 0 && (
            <View className="flex-row justify-between pt-0.5">
              <Text className="text-xs font-bold text-emerald-700">
                Descuento juegos{descuentoPct > 0 ? ` (${descuentoPct}%)` : ""}
              </Text>
              <Text className="text-xs font-bold text-emerald-700">
                -{formatear(descuento)}
              </Text>
            </View>
          )}

          {propina > 0 && (
            <View className="flex-row justify-between pt-0.5">
              <Text className="text-xs font-semibold text-stone-600">
                Propina
              </Text>
              <Text className="text-xs font-bold text-stone-700">
                +{formatear(propina)}
              </Text>
            </View>
          )}
        </>
      )}

      <View className="mt-2 flex-row justify-between border-t border-mostaza/40 pt-2">
        <Text className="text-lg font-bold text-vino">TOTAL</Text>
        <Text className="text-lg font-black text-calabaza">
          {cargando || !pedido ? "—" : formatear(total)}
        </Text>
      </View>
    </View>
  );
}
