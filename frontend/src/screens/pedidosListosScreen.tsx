import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { supabase } from "../config/supabase";
import { ChineseFrame } from "../components/ChineseFrame";
import { ConfirmModal } from "../components/ConfirmModal";
import { FeedbackModal } from "../components/FeedbackModal";
import { marcarPedidoEntregadoApi } from "../services/pedidosService";

export default function PedidosListosScreen() {
  const [pedidosListos, setPedidosListos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<any>(null);
  const [feedback, setFeedback] = useState<{
    visible: boolean;
    tipo: "exito" | "error" | "informacion";
    titulo: string;
    mensaje: string;
  }>({ visible: false, tipo: "exito", titulo: "", mensaje: "" });

  const abrirAviso = (
    titulo: string,
    mensaje: string,
    tipo: "exito" | "error" | "informacion" = "informacion"
  ) => {
    setFeedback({ visible: true, tipo, titulo, mensaje });
  };

  const cargarPedidos = useCallback(async () => {
    try {
      setCargando(true);
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          created_at,
          status,
          restaurant_tables (table_number),
          order_items (
            id,
            quantity,
            products (id, name, category)
          )
        `)
        .eq("status", "ready")
        .order("created_at", { ascending: true });

      if (error) console.warn("Error cargando pedidos listos:", error.message);
      setPedidosListos(data || []);
    } catch (err: any) {
      console.warn("Error cargando pedidos listos:", err?.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarPedidos();

    const canal = supabase
      .channel("mozo_pedidos_listos_channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => cargarPedidos()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [cargarPedidos]);

  const ejecutarEntrega = async () => {
    if (!confirmando) return;
    setProcesandoId(confirmando.id);
    try {
      await marcarPedidoEntregadoApi(confirmando.id);
      setConfirmando(null);
      abrirAviso(
        "¡Pedido Entregado!",
        `El pedido de la Mesa #${
          confirmando.restaurant_tables?.table_number ?? "S/N"
        } fue marcado como entregado.`,
        "exito"
      );
      cargarPedidos();
    } catch (err: any) {
      setConfirmando(null);
      abrirAviso(
        "No se pudo entregar",
        err?.message || "Ocurrió un error al marcar el pedido como entregado.",
        "error"
      );
    } finally {
      setProcesandoId(null);
    }
  };

  return (
    <View className="flex-1">
      <StatusBar style="light" />

      <View className="px-5 pt-4">
        <View className="mb-4">
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
          <ChineseFrame className="mt-2 bg-vino">
            <View className="items-center rounded-xl bg-mostaza/15 px-4 py-4">
              <Text
                style={{ fontFamily: "LaOriental" }}
                className="text-2xl text-mostaza uppercase"
              >
                Pedidos Listos
              </Text>
              <Text className="mt-1 text-xs font-semibold text-amber-100">
                Listos para retirar y entregar
              </Text>
            </View>
          </ChineseFrame>
        </View>
      </View>

      <View className="flex-1">
        {cargando ? (
          <View className="items-center justify-center py-20">
            <ActivityIndicator size="large" color="#8B1A1A" />
            <Text className="mt-3 text-xs font-bold text-vino">Cargando pedidos listos...</Text>
          </View>
        ) : pedidosListos.length === 0 ? (
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
              No hay pedidos listos
            </Text>
            <Text className="mt-1 text-center text-xs text-stone-600">
              Cuando cocina y barra terminen un pedido, aparecerá aquí para entregar.
            </Text>
            <TouchableOpacity
              onPress={cargarPedidos}
              className="mt-3 rounded-xl border border-calabaza bg-caramelo/10 px-4 py-2"
            >
              <Text className="text-xs font-bold text-calabaza">Actualizar Lista</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 16, gap: 12 }}
          >
            {pedidosListos.map((pedido) => {
              const numMesa = pedido.restaurant_tables?.table_number ?? "S/N";
              const items = pedido.order_items || [];
              return (
                <View
                  key={pedido.id}
                  className="rounded-2xl border-2 border-caramelo bg-[#FFFDF9] p-4"
                >
                  <View className="mb-2 flex-row items-center justify-between">
                    <Text
                      className="text-2xl text-vino"
                      style={{ fontFamily: "LaOriental" }}
                    >
                      Mesa #{numMesa}
                    </Text>
                    <Text className="text-sm font-semibold text-stone-500">
                      {pedido.created_at
                        ? `${new Date(pedido.created_at).toLocaleDateString([], {
                            day: "2-digit",
                            month: "2-digit",
                          })} ${new Date(pedido.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}`
                        : ""}
                    </Text>
                  </View>

                  <View className="mt-2 border-b border-calabaza border-dashed pb-3">
                    {items.map((it: any) => {
                      const cat = it.products?.category;
                      const icono = cat === "drink" ? "🍹" : "🍲";
                      return (
                        <View
                          key={it.id}
                          className="mt-1.5 flex-row items-center gap-2"
                        >
                          <Text className="w-6 text-center">{icono}</Text>
                          <Text className="text-lg font-semibold text-calabaza">
                            {it.quantity}x
                          </Text>
                          <Text
                            className="min-w-0 flex-1 text-base text-stone-700"
                            numberOfLines={2}
                            ellipsizeMode="tail"
                          >
                            {it.products?.name || "Producto"}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  <TouchableOpacity
                    onPress={() => setConfirmando(pedido)}
                    disabled={procesandoId !== null}
                    className={`mt-3 w-full rounded-2xl bg-emerald-600 py-2.5 active:bg-emerald-700 ${
                      procesandoId !== null ? "opacity-50" : ""
                    }`}
                  >
                    <Text
                      style={{ fontFamily: "LaOriental" }}
                      className="text-center text-sm uppercase tracking-wide text-white"
                    >
                      {procesandoId === pedido.id ? "Entregando..." : "Entregar"}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Modal de confirmación de entrega */}
      <ConfirmModal
        visible={confirmando !== null}
        titulo="Entregar Pedido"
        mensaje={
          <>
            ¿Confirmar que el pedido de la{" "}
            <Text className="font-bold text-mostaza">
              Mesa #{confirmando?.restaurant_tables?.table_number}
            </Text>{" "}
            fue entregado?
          </>
        }
        textoConfirmar="Entregar"
        textoCancelar="Cancelar"
        cargando={procesandoId !== null}
        onConfirm={ejecutarEntrega}
        onCancel={() => setConfirmando(null)}
      />

      {/* Modal Feedback */}
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