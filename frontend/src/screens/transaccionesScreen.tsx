import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { supabase } from "../config/supabase";
import {
  obtenerDetalleCuenta,
  confirmarPagoPorMozo,
  DetalleCuenta,
} from "../services/cuentaService";
import { FeedbackModal } from "../components/FeedbackModal";

interface TransaccionPendiente {
  pedidoId: string;
  mesaId: string;
  numeroMesa: string | number;
  total: number;
  propina: number;
}

interface Props {
  onVolver: () => void;
}

export function TransaccionesScreen({ onVolver }: Props) {
  console.log("⚡ TransaccionesScreen montado/renderizado");

  const [cargando, setCargando] = useState(true);
  const [lista, setLista] = useState<TransaccionPendiente[]>([]);
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState<{
    detalle: DetalleCuenta;
    mesaId: string;
  } | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  const [feedback, setFeedback] = useState<{
    visible: boolean;
    tipo: "exito" | "error" | "informacion";
    titulo: string;
    mensaje: string;
  }>({ visible: false, tipo: "informacion", titulo: "", mensaje: "" });

  const cargarTransacciones = async () => {
    try {
      console.log("🔍 [Transacciones] Ejecutando cargarTransacciones...");
      setCargando(true);

      const { data: pedidos, error } = await supabase
        .from("orders")
        .select("id, table_id, total_amount, tip_amount, status")
        .eq("status", "bill_requested")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ [Transacciones] Error en query:", error.message);
        throw error;
      }

      console.log("📦 [Transacciones] Registros crudos devueltos:", pedidos?.length ?? 0);

      const items: TransaccionPendiente[] = [];

      for (const p of pedidos || []) {
        let numMesa: string | number = "S/N";

        if (p.table_id) {
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
          mesaId: p.table_id,
          numeroMesa: numMesa,
          total: Number(p.total_amount || 0),
          propina: Number(p.tip_amount || 0),
        });
      }

      console.log("✅ [Transacciones] Items procesados para la lista:", items);
      setLista(items);
    } catch (err: any) {
      console.error("❌ [Transacciones] Excepción capturada:", err);
      setFeedback({
        visible: true,
        tipo: "error",
        titulo: "Error al cargar",
        mensaje: err?.message || "No se pudieron obtener las cuentas pendientes.",
      });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    // 1. Carga inicial
    cargarTransacciones();

    // 2. Crear canal con nombre único o limpiar el existente
    const canal = supabase
      .channel(`mozo_transacciones_${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          console.log("🔔 [Transacciones] Cambio detectado:", payload);
          cargarTransacciones();
        }
      )
      .subscribe((status) => {
        console.log("📡 [Transacciones] Estado suscripción:", status);
      });

    // 3. Limpieza estricta al desmontar
    return () => {
      console.log("🔴 [Transacciones] Desmontando canal realtime");
      supabase.removeChannel(canal);
    };
  }, []);

  const verDetalle = async (item: TransaccionPendiente) => {
    try {
      setCargando(true);
      const baseSinPropina = Math.max(1, item.total - item.propina);
      const porcentajeAprox = Math.round((item.propina / baseSinPropina) * 100);

      const detalle = await obtenerDetalleCuenta(item.pedidoId, porcentajeAprox);
      setCuentaSeleccionada({ detalle, mesaId: item.mesaId });
    } catch (err: any) {
      setFeedback({
        visible: true,
        tipo: "error",
        titulo: "Error al abrir cuenta",
        mensaje: err?.message || "No se pudo cargar el desglose.",
      });
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

      setFeedback({
        visible: true,
        tipo: "exito",
        titulo: "Cobro Registrado",
        mensaje: `La Mesa #${cuentaSeleccionada.detalle.numeroMesa} quedó liberada correctamente.`,
      });

      setCuentaSeleccionada(null);
      await cargarTransacciones();
    } catch (err: any) {
      setFeedback({
        visible: true,
        tipo: "error",
        titulo: "Error al confirmar",
        mensaje: err?.message || "No se pudo cerrar la cuenta.",
      });
    } finally {
      setConfirmando(false);
    }
  };

  return (
    <View className="flex-1 bg-stone-100">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="bg-sky-700 px-6 pt-6 pb-5 shadow-md flex-row justify-between items-center">
        <View>
          <Text className="text-white text-xs font-bold uppercase tracking-wider">
            Sector Mozo
          </Text>
          <Text className="text-white text-2xl font-black">
            {cuentaSeleccionada ? `Mesa #${cuentaSeleccionada.detalle.numeroMesa}` : "Transacciones"}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => {
            if (cuentaSeleccionada) {
              setCuentaSeleccionada(null);
            } else {
              onVolver();
            }
          }}
          className="bg-sky-900/60 px-3 py-1.5 rounded-xl border border-sky-400/30"
        >
          <Text className="text-white text-xs font-bold">
            {cuentaSeleccionada ? "Lista" : "Volver"}
          </Text>
        </TouchableOpacity>
      </View>

      {cargando ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0369a1" />
          <Text className="mt-2 text-xs font-bold text-stone-500">Cargando...</Text>
        </View>
      ) : cuentaSeleccionada ? (
        /* Vista de Detalle idéntica a Mercado Pago */
        <ScrollView
          className="flex-1 px-4 pt-4"
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="bg-white rounded-2xl p-5 shadow-sm border border-stone-200">
            <Text className="text-xs font-bold uppercase text-stone-400 mb-3 tracking-wider">
              Detalle del Consumo
            </Text>

            {cuentaSeleccionada.detalle.items.map((it) => (
              <View
                key={it.id}
                className="flex-row justify-between items-center py-2.5 border-b border-stone-100"
              >
                <View className="flex-1 pr-2">
                  <Text className="text-stone-800 text-sm font-semibold">{it.name}</Text>
                  <Text className="text-stone-400 text-xs">
                    {it.quantity} x ${it.unit_price.toFixed(2)}
                  </Text>
                </View>
                <Text className="text-stone-800 font-bold text-sm">
                  ${it.subtotal.toFixed(2)}
                </Text>
              </View>
            ))}

            {/* Subtotal */}
            <View className="flex-row justify-between pt-4 pb-2">
              <Text className="text-stone-600 text-sm">Subtotal</Text>
              <Text className="text-stone-800 font-semibold text-sm">
                ${cuentaSeleccionada.detalle.subtotal.toFixed(2)}
              </Text>
            </View>

            {/* Descuento Juegos */}
            {cuentaSeleccionada.detalle.porcentajeDescuento > 0 && (
              <View className="flex-row justify-between py-1.5">
                <Text className="text-emerald-600 text-sm font-semibold">
                  Descuento Juegos ({cuentaSeleccionada.detalle.porcentajeDescuento}%)
                </Text>
                <Text className="text-emerald-600 font-bold text-sm">
                  -${cuentaSeleccionada.detalle.montoDescuento.toFixed(2)}
                </Text>
              </View>
            )}

            {/* Propina */}
            <View className="flex-row justify-between py-1.5">
              <Text className="text-amber-700 text-sm">
                Propina QR ({cuentaSeleccionada.detalle.porcentajePropina}%)
              </Text>
              <Text className="text-amber-700 font-semibold text-sm">
                +${cuentaSeleccionada.detalle.montoPropina.toFixed(2)}
              </Text>
            </View>

            <View className="border-t-2 border-dashed border-stone-200 my-4" />

            {/* Total */}
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="text-xs uppercase font-extrabold text-stone-500">
                  Total Cobrado
                </Text>
                <Text className="text-[10px] text-stone-400">Listo para confirmar</Text>
              </View>
              <Text className="text-2xl font-black text-sky-700">
                ${cuentaSeleccionada.detalle.totalFinal.toLocaleString("es-AR", {
                  minimumFractionDigits: 2,
                })}
              </Text>
            </View>
          </View>

          {/* Botón Mozo: Confirmar Transacción */}
          <TouchableOpacity
            onPress={handleConfirmarCobro}
            disabled={confirmando}
            activeOpacity={0.85}
            className={`mt-6 w-full py-4 rounded-2xl bg-emerald-600 items-center shadow-md active:bg-emerald-700 ${
              confirmando ? "opacity-60" : ""
            }`}
          >
            {confirmando ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text className="text-white text-base font-bold tracking-wide uppercase">
                Confirmar Transacción
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      ) : (
        /* Lista de Mesas con Cuentas Pedidas */
        <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
          {lista.length === 0 ? (
            <View className="items-center justify-center mt-20">
              <Text className="text-3xl mb-2">🧾</Text>
              <Text className="text-stone-700 font-bold text-base">
                No hay transacciones pendientes
              </Text>
              <Text className="text-stone-400 text-xs text-center mt-1 px-8">
                Las mesas que soliciten la cuenta aparecerán aquí para su cobro.
              </Text>
              <TouchableOpacity
                onPress={cargarTransacciones}
                className="mt-4 px-4 py-2 bg-sky-600 rounded-xl"
              >
                <Text className="text-white text-xs font-bold">Reintentar lectura</Text>
              </TouchableOpacity>
            </View>
          ) : (
            lista.map((item) => (
              <TouchableOpacity
                key={item.pedidoId}
                onPress={() => verDetalle(item)}
                activeOpacity={0.85}
                className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm mb-3 flex-row justify-between items-center"
              >
                <View>
                  <Text className="text-base font-extrabold text-stone-800">
                    Mesa #{item.numeroMesa}
                  </Text>
                  <Text className="text-xs text-amber-700 font-semibold mt-0.5">
                    Propina: ${item.propina.toFixed(2)}
                  </Text>
                </View>

                <View className="items-end">
                  <Text className="text-lg font-black text-sky-700">
                    ${item.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </Text>
                  <Text className="text-[10px] font-bold text-emerald-600 uppercase mt-0.5">
                    Tocar para revisar →
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

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