import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import { supabase } from "../config/supabase";
import {
  obtenerDetalleCuenta,
  confirmarPagoPorMozo,
  DetalleCuenta,
} from "../services/cuentaService";
import { ChineseFrame } from "../components/ChineseFrame";
import { FeedbackModal } from "../components/FeedbackModal";

interface TransaccionPendiente {
  pedidoId: string;
  mesaId: string | null;
  numeroMesa: string | number;
  total: number;
  propina: number;
  createdAt: string | null;
  orderType: string;
  direccionEntrega: string | null;
}

const formatearMonto = (monto: number) =>
  monto.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatearFecha = (iso: string | null) => {
  if (!iso) return "";
  const fecha = new Date(iso);
  return `${fecha.toLocaleDateString([], {
    day: "2-digit",
    month: "2-digit",
  })} ${fecha.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

export function TransaccionesScreen() {
  const [cargando, setCargando] = useState(true);
  const [lista, setLista] = useState<TransaccionPendiente[]>([]);
  const [pagina, setPagina] = useState(0);
  const [altoPagina, setAltoPagina] = useState(0);
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState<{
    detalle: DetalleCuenta;
    mesaId: string | null;
  } | null>(null);
  const [confirmando, setConfirmando] = useState(false);

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
  ) => {
    setFeedback({ visible: true, tipo, titulo, mensaje });
  };

  const cargarTransacciones = useCallback(async () => {
    try {
      setCargando(true);
      // Al recargar, el carrusel vuelve a la primera página.
      setPagina(0);

      const { data: pedidos, error } = await supabase
        .from("orders")
        .select(
          "id, table_id, total_amount, tip_amount, status, created_at, order_type, delivery_address"
        )
        .eq("status", "bill_requested")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const items: TransaccionPendiente[] = [];

      for (const p of pedidos || []) {
        const esDelivery = p.order_type === "delivery";
        let numMesa: string | number = esDelivery
          ? p.delivery_address || "Domicilio"
          : "S/N";

        if (!esDelivery && p.table_id) {
          const { data: mesa } = await supabase
            .from("restaurant_tables")
            .select("table_number")
            .eq("id", p.table_id)
            .maybeSingle();

          if (mesa?.table_number !== undefined) {
            numMesa = mesa.table_number;
          }
        }

        items.push({
          pedidoId: p.id,
          mesaId: p.table_id ?? null,
          numeroMesa: numMesa,
          total: Number(p.total_amount || 0),
          propina: Number(p.tip_amount || 0),
          createdAt: p.created_at ?? null,
          orderType: p.order_type ?? "dine_in",
          direccionEntrega: esDelivery ? p.delivery_address ?? null : null,
        });
      }

      setLista(items);
    } catch (err: any) {
      console.warn("Error cargando transacciones:", err?.message);
      abrirAviso(
        "Error al cargar",
        err?.message || "No se pudieron obtener las cuentas pendientes.",
        "error"
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarTransacciones();

    const canal = supabase
      .channel("mozo_transacciones_channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => cargarTransacciones()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [cargarTransacciones]);

  useEffect(() => {
    if (lista.length > 0 && pagina >= lista.length) {
      setPagina(lista.length - 1);
    }
  }, [lista.length, pagina]);

  const verDetalle = async (item: TransaccionPendiente) => {
    try {
      setCargando(true);
      const baseSinPropina = Math.max(1, item.total - item.propina);
      const porcentajeAprox = Math.round((item.propina / baseSinPropina) * 100);

      const detalle = await obtenerDetalleCuenta(item.pedidoId, porcentajeAprox);
      setCuentaSeleccionada({ detalle, mesaId: item.mesaId });
    } catch (err: any) {
      abrirAviso(
        "Error al abrir cuenta",
        err?.message || "No se pudo cargar el desglose.",
        "error"
      );
    } finally {
      setCargando(false);
    }
  };

  const handleConfirmarCobro = async () => {
    if (!cuentaSeleccionada) return;
    try {
      setConfirmando(true);
      await confirmarPagoPorMozo(
        cuentaSeleccionada.detalle.pedidoId,
        cuentaSeleccionada.mesaId,
        cuentaSeleccionada.detalle.porcentajePropina // número entero (0, 5, 10, etc.)
      );

      abrirAviso(
        "Cobro Registrado",
        cuentaSeleccionada.detalle.orderType === "delivery"
          ? `El pedido a domicilio en ${
              cuentaSeleccionada.detalle.direccionEntrega ||
              cuentaSeleccionada.detalle.numeroMesa
            } quedó pagado y se envió la factura al cliente.`
          : `La Mesa #${cuentaSeleccionada.detalle.numeroMesa} quedó liberada correctamente.`,
        "exito"
      );

      setCuentaSeleccionada(null);
      await cargarTransacciones();
    } catch (err: any) {
      abrirAviso(
        "Error al confirmar",
        err?.message || "No se pudo cerrar la cuenta.",
        "error"
      );
    } finally {
      setConfirmando(false);
    }
  };

  return (
    <View className="flex-1">
      {/* Cabecera */}
      <View className="px-5 pt-4">
        <Image
          source={require("../../assets/images/logo-name.png")}
          className="h-20 w-auto self-center mt-1"
          resizeMode="contain"
        />
        <Image
          source={require("../../assets/images/separator.png")}
          className="my-2 h-5 w-full"
          resizeMode="contain"
        />
        <ChineseFrame className="mt-2 bg-vino">
          <View className="items-center rounded-xl bg-mostaza/15 px-4 py-4">
            <Text
              style={{ fontFamily: "LaOriental" }}
              className={`text-center text-mostaza uppercase ${
                cuentaSeleccionada?.detalle.orderType === "delivery"
                  ? "text-lg"
                  : "text-2xl"
              }`}
              numberOfLines={2}
            >
              {cuentaSeleccionada
                ? cuentaSeleccionada.detalle.orderType === "delivery"
                  ? cuentaSeleccionada.detalle.direccionEntrega ||
                    cuentaSeleccionada.detalle.numeroMesa
                  : `Mesa #${cuentaSeleccionada.detalle.numeroMesa}`
                : "Transacciones"}
            </Text>
            <Text className="mt-1 text-center text-xs font-semibold text-amber-100">
              {cuentaSeleccionada
                ? "Detalle de la cuenta a cobrar"
                : "Cuentas pendientes de cobro"}
            </Text>
          </View>
        </ChineseFrame>

        {cuentaSeleccionada && (
          <View className="mt-2 flex-row justify-end">
            <TouchableOpacity
              onPress={() => setCuentaSeleccionada(null)}
              className="rounded-xl border border-calabaza bg-caramelo/10 px-4 py-2"
            >
              <Text className="text-xs font-bold text-calabaza">Volver a la lista</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View
        className="flex-1"
        onLayout={(e) => setAltoPagina(Math.round(e.nativeEvent.layout.height))}
      >
        {cargando ? (
          <View className="items-center justify-center py-20">
            <ActivityIndicator size="large" color="#8B1A1A" />
            <Text className="mt-3 text-xs font-bold text-vino">
              Cargando cuentas pendientes...
            </Text>
          </View>
        ) : cuentaSeleccionada ? (
          /* Detalle de la cuenta */
          <ScrollView
            className="flex-1 px-4 pt-2"
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            <View className="rounded-2xl border-2 border-caramelo bg-[#FFFDF9] p-4">
              <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-stone-500">
                Detalle del Consumo
              </Text>

              <View className="border-b border-calabaza border-dashed pb-3">
                {cuentaSeleccionada.detalle.items.map((it) => (
                  <View key={it.id} className="mt-1.5 flex-row items-center">
                    <View className="h-2.5 w-2.5 rounded-full bg-calabaza" />
                    <Text
                      style={{ fontFamily: "LaOriental" }}
                      className="ml-3 text-2xl text-calabaza"
                    >
                      {it.quantity}x
                    </Text>
                    <View className="ml-3 min-w-0 flex-1">
                      <Text
                        className="text-lg text-stone-700"
                        numberOfLines={2}
                        ellipsizeMode="tail"
                      >
                        {it.name}
                      </Text>
                      <Text className="text-xs text-stone-400">
                        ${formatearMonto(it.unit_price)} c/u
                      </Text>
                    </View>
                    <Text className="ml-3 text-lg font-semibold text-vino">
                      ${formatearMonto(it.subtotal)}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Subtotal */}
              <View className="flex-row justify-between pt-4 pb-2">
                <Text className="text-sm text-stone-600">Subtotal</Text>
                <Text className="text-sm font-semibold text-stone-800">
                  ${formatearMonto(cuentaSeleccionada.detalle.subtotal)}
                </Text>
              </View>

              {/* Descuento Juegos */}
              {cuentaSeleccionada.detalle.porcentajeDescuento > 0 && (
                <View className="flex-row justify-between py-1.5">
                  <Text className="text-sm font-semibold text-emerald-700">
                    Descuento Juegos ({cuentaSeleccionada.detalle.porcentajeDescuento}%)
                  </Text>
                  <Text className="text-sm font-bold text-emerald-700">
                    -${formatearMonto(cuentaSeleccionada.detalle.montoDescuento)}
                  </Text>
                </View>
              )}

              {/* Propina */}
              <View className="flex-row justify-between py-1.5">
                <Text className="text-sm text-calabaza">
                  Propina QR ({cuentaSeleccionada.detalle.porcentajePropina}%)
                </Text>
                <Text className="text-sm font-semibold text-calabaza">
                  +${formatearMonto(cuentaSeleccionada.detalle.montoPropina)}
                </Text>
              </View>

              <View className="my-3 border-t-2 border-dashed border-caramelo/60" />

              {/* Total */}
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-xs font-extrabold uppercase text-stone-500">
                    Total Cobrado
                  </Text>
                  <Text className="text-[10px] text-stone-400">Listo para confirmar</Text>
                </View>
                <Text
                  style={{ fontFamily: "LaOriental" }}
                  className="text-3xl text-vino"
                >
                  ${formatearMonto(cuentaSeleccionada.detalle.totalFinal)}
                </Text>
              </View>
            </View>

            {/* Confirmar transacción */}
            <TouchableOpacity
              onPress={handleConfirmarCobro}
              disabled={confirmando}
              activeOpacity={0.85}
              className={`mt-4 w-full items-center rounded-2xl bg-emerald-600 py-2.5 shadow-md active:bg-emerald-700 ${
                confirmando ? "opacity-60" : ""
              }`}
            >
              {confirmando ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text
                  style={{ fontFamily: "LaOriental" }}
                  className="text-center text-sm uppercase tracking-wide text-white"
                >
                  Confirmar Transacción
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        ) : lista.length === 0 ? (
          /* Sin cuentas pendientes */
          <View className="mt-6 items-center justify-center bg-transparent p-8">
            <Image
              source={require("../../assets/images/yoga-y.png")}
              className="mb-3 h-12 w-12"
              resizeMode="contain"
            />
            <Text
              style={{ fontFamily: "LaOriental" }}
              className="text-center text-base uppercase text-vino"
            >
              No hay transacciones pendientes
            </Text>
            <Text className="mt-1 text-center text-xs text-stone-600">
              Cuando una mesa solicite la cuenta, aparecerá aquí para su cobro.
            </Text>
            <TouchableOpacity
              onPress={cargarTransacciones}
              className="mt-3 rounded-xl border border-calabaza bg-caramelo/10 px-4 py-2"
            >
              <Text className="text-xs font-bold text-calabaza">Actualizar Lista</Text>
            </TouchableOpacity>
          </View>
        ) : !altoPagina ? null : (
          /* Cuentas en carrusel, una por página */
          <ScrollView
            pagingEnabled
            directionalLockEnabled
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
            onMomentumScrollEnd={(e) =>
              setPagina(
                Math.round(e.nativeEvent.contentOffset.y / (altoPagina || 1))
              )
            }
          >
            {lista.map((item) => (
              <View
                key={item.pedidoId}
                style={{ height: altoPagina }}
                className="px-4 py-2"
              >
                <View className="flex-1 rounded-2xl border-2 border-caramelo bg-[#FFFDF9] p-4">
                  <View className="mb-2 flex-row items-center justify-between">
                    <Text
                      className={`text-vino ${
                        item.orderType === "delivery" ? "text-lg" : "text-2xl"
                      }`}
                      style={{ fontFamily: "LaOriental" }}
                      numberOfLines={2}
                    >
                      {item.orderType === "delivery"
                        ? item.direccionEntrega || "Pedido a Domicilio"
                        : `Mesa #${item.numeroMesa}`}
                    </Text>
                    <Text className="text-sm font-semibold text-stone-500">
                      {formatearFecha(item.createdAt)}
                    </Text>
                  </View>

                  <ScrollView
                    className="mt-2 flex-1"
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 12 }}
                  >
                    <View className="border-b border-calabaza border-dashed pb-3">
                      <View className="mt-1.5 flex-row items-center">
                        <View className="h-2.5 w-2.5 rounded-full bg-calabaza" />
                        <Text className="ml-3 flex-1 text-lg text-stone-700">
                          Consumo
                        </Text>
                        <Text className="text-lg font-semibold text-stone-700">
                          ${formatearMonto(Math.max(0, item.total - item.propina))}
                        </Text>
                      </View>
                      <View className="mt-1.5 flex-row items-center">
                        <View className="h-2.5 w-2.5 rounded-full bg-calabaza" />
                        <Text className="ml-3 flex-1 text-lg text-stone-700">
                          Propina QR
                        </Text>
                        <Text className="text-lg font-semibold text-calabaza">
                          +${formatearMonto(item.propina)}
                        </Text>
                      </View>
                    </View>

                    <View className="mt-4 flex-row items-center justify-between">
                      <Text className="text-xs font-extrabold uppercase text-stone-500">
                        Total a cobrar
                      </Text>
                      <Text
                        style={{ fontFamily: "LaOriental" }}
                        className="text-3xl text-vino"
                      >
                        ${formatearMonto(item.total)}
                      </Text>
                    </View>
                  </ScrollView>

                  <View className="mt-auto pt-3">
                    <TouchableOpacity
                      onPress={() => verDetalle(item)}
                      activeOpacity={0.85}
                      className="w-full rounded-2xl bg-emerald-600 py-2.5 active:bg-emerald-700"
                    >
                      <Text
                        style={{ fontFamily: "LaOriental" }}
                        className="text-center text-sm uppercase tracking-wide text-white"
                      >
                        Revisar Cuenta
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

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
