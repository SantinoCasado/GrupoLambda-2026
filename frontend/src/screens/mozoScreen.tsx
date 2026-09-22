import { FeedbackModal } from "../components/FeedbackModal";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { supabase } from "../config/supabase";
import { confirmarPedidoPorMozoApi, Pedido } from "../services/pedidosService";
import { obtenerMesas, Mesa } from "../services/mesasService";

interface Props {
  usuarioActual: any;
  onAbrirChatMesa: (tableId: string, numeroMesa: number) => void;
  onCerrarSesion: () => void;
}

export function MozoScreen({
  usuarioActual,
  onAbrirChatMesa,
  onCerrarSesion,
}: Props) {
  const [tab, setTab] = useState<"pedidos" | "consultas">("pedidos");
  const [pedidosPendientes, setPedidosPendientes] = useState<any[]>([]);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  // Modal Rechazo
  const [pedidoARechazar, setPedidoARechazar] = useState<any | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");

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

    const abrirAviso = (
        titulo: string,
        mensaje: string,
        tipo: "exito" | "error" | "informacion" = "informacion"
    ) => {
        setModalFeedback({
        visible: true,
        tipo,
        titulo,
        mensaje,
        });
    };

  const cargarDatos = async () => {
    try {
      setCargando(true);
      // 1. Carga pedidos en espera de confirmación
      const { data: ordersData, error: ordersErr } = await supabase
        .from("orders")
        .select(`
          *,
          restaurant_tables (id, table_number),
          order_items (
            id,
            quantity,
            products (id, name, price, category)
          )
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (ordersErr) console.warn("Error cargando pedidos:", ordersErr.message);
      setPedidosPendientes(ordersData || []);

      // 2. Carga mesas ocupadas para consultas
      const listaMesas = await obtenerMesas();
      setMesas(listaMesas);
    } catch (err: any) {
      console.warn("Error cargando panel mozo:", err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();

    // Escucha en tiempo real de nuevos pedidos
    const canalOrders = supabase
      .channel("mozo_orders_channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => cargarDatos()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canalOrders);
    };
  }, []);

  const handleConfirmar = async (pedido: any) => {
    try {
      setProcesandoId(pedido.id);
      await confirmarPedidoPorMozoApi(
        pedido.id,
        usuarioActual.id,
        "in_preparation"
      );
      abrirAviso("¡Pedido Confirmado!", "La orden fue enviada a cocina/barra.");
      cargarDatos();
    } catch (err: any) {
      abrirAviso("Error", err.message || "No se pudo confirmar el pedido.");
    } finally {
      setProcesandoId(null);
    }
  };

  const handleRechazar = async () => {
    if (!pedidoARechazar || !motivoRechazo.trim()) {
      abrirAviso("Atención", "Indica el motivo del rechazo.");
      return;
    }

    try {
      setProcesandoId(pedidoARechazar.id);
      await confirmarPedidoPorMozoApi(
        pedidoARechazar.id,
        usuarioActual.id,
        "cancelled",
        motivoRechazo.trim()
      );
      abrirAviso("Pedido Rechazado", "Se le notificó al cliente.");
      setPedidoARechazar(null);
      setMotivoRechazo("");
      cargarDatos();
    } catch (err: any) {
      abrirAviso("Error", err.message || "No se pudo rechazar.");
    } finally {
      setProcesandoId(null);
    }
  };

  return (
    <View className="flex-1 bg-vino px-4 pt-2">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-mostaza/30 pb-3">
        <View>
          <Text style={{ fontFamily: "LaOriental" }} className="text-2xl text-mostaza">
            Atención de Salón
          </Text>
          <Text className="text-xs text-amber-100/70">
            Mozo: {usuarioActual.nombres} {usuarioActual.apellidos}
          </Text>
        </View>

        <TouchableOpacity
          onPress={onCerrarSesion}
          className="rounded-xl border border-mostaza/40 bg-black/30 px-3 py-1.5 active:bg-black/50"
        >
          <Text className="text-xs text-terracota">Salir</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View className="my-3 flex-row gap-2">
        <TouchableOpacity
          onPress={() => setTab("pedidos")}
          className={`flex-1 rounded-xl py-2.5 items-center border ${
            tab === "pedidos"
              ? "bg-calabaza border-mostaza"
              : "bg-black/30 border-mostaza/30"
          }`}
        >
          <Text className="text-xs font-bold text-amber-100 uppercase">
            Comandas ({pedidosPendientes.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setTab("consultas")}
          className={`flex-1 rounded-xl py-2.5 items-center border ${
            tab === "consultas"
              ? "bg-calabaza border-mostaza"
              : "bg-black/30 border-mostaza/30"
          }`}
        >
          <Text className="text-xs font-bold text-amber-100 uppercase">
            Chat Mesas 💬
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contenido según Tab */}
      {cargando ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#E5B25D" />
        </View>
      ) : tab === "pedidos" ? (
        /* PESTAÑA 1: COMANDAS PENDIENTES */
        pedidosPendientes.length === 0 ? (
          <View className="flex-1 items-center justify-center p-6">
            <Text className="text-4xl mb-2">🍽️</Text>
            <Text style={{ fontFamily: "LaOriental" }} className="text-base text-mostaza uppercase text-center">
              Sin pedidos pendientes
            </Text>
            <Text className="mt-1 text-center text-xs text-amber-100/70">
              Cuando un cliente termine su comanda, aparecerá aquí para su confirmación.
            </Text>
          </View>
        ) : (
          <FlatList
            data={pedidosPendientes}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const numMesa =
                item.restaurant_tables?.table_number ?? "S/N";
              const items = item.order_items || [];

              return (
                <View className="mb-3.5 rounded-2xl border-2 border-mostaza/40 bg-black/40 p-4 shadow-md">
                  <View className="flex-row items-center justify-between border-b border-mostaza/20 pb-2 mb-2">
                    <View>
                      <Text className="text-base font-black text-mostaza uppercase">
                        Mesa #{numMesa}
                      </Text>
                      <Text className="text-[10px] text-amber-200/70">
                        Hora: {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-lg font-black text-emerald-400">
                        ${Number(item.total_amount).toLocaleString("es-AR")}
                      </Text>
                      <Text className="text-[10px] text-amber-100/80">
                        ⏱ ~{item.estimated_delivery_time || 15} min
                      </Text>
                    </View>
                  </View>

                  {/* Detalle de ítems */}
                  <View className="mb-3 gap-y-1">
                    {items.map((it: any) => (
                      <Text key={it.id} className="text-xs text-amber-100/90">
                        • {it.quantity}x {it.products?.name || "Producto"} (${it.products?.price})
                      </Text>
                    ))}
                  </View>

                  {/* Acciones del Mozo */}
                  <View className="flex-row gap-2 pt-1">
                    <TouchableOpacity
                      disabled={procesandoId === item.id}
                      onPress={() => setPedidoARechazar(item)}
                      className="flex-1 items-center rounded-xl border border-terracota bg-terracota/30 py-2.5 active:bg-terracota/60"
                    >
                      <Text className="text-xs font-bold text-rose-300">Rechazar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      disabled={procesandoId === item.id}
                      onPress={() => handleConfirmar(item)}
                      className="flex-1 items-center rounded-xl border border-emerald-500 bg-emerald-600/50 py-2.5 active:bg-emerald-600/80"
                    >
                      {procesandoId === item.id ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text className="text-xs font-bold text-white uppercase">Confirmar ✓</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        )
      ) : (
        /* PESTAÑA 2: MESAS PARA CHAT */
        <FlatList
          data={mesas}
          keyExtractor={(m, index) => String(m.id || index)}
          renderItem={({ item: mesa }) => (
            <TouchableOpacity
              onPress={() => onAbrirChatMesa(mesa.id || "", mesa.numero)}
              className="mb-2.5 flex-row items-center justify-between rounded-xl border border-mostaza/30 bg-black/30 p-3.5 active:bg-black/50"
            >
              <View>
                <Text className="text-base font-bold text-mostaza">
                  Mesa #{mesa.numero}
                </Text>
                <Text className="text-xs text-amber-100/70">
                  Estado: {mesa.disponibilidad === "ocupada" ? "🔴 Ocupada" : "🟢 Libre"}
                </Text>
              </View>

              <View className="flex-row items-center gap-1">
                <Text className="text-xs font-bold text-amber-200">Abrir Chat</Text>
                <Text className="text-mostaza text-lg">💬</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Modal Rechazar Pedido */}
      <Modal visible={!!pedidoARechazar} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/75 px-6">
          <View className="w-full max-w-sm rounded-3xl border border-mostaza/50 bg-vino p-6">
            <Text style={{ fontFamily: "LaOriental" }} className="text-xl text-mostaza text-center">
              Rechazar Comanda
            </Text>
            <Text className="mt-1 text-center text-xs text-amber-100/70 mb-3">
              Mesa #{pedidoARechazar?.restaurant_tables?.table_number}
            </Text>

            <TextInput
              value={motivoRechazo}
              onChangeText={setMotivoRechazo}
              placeholder="Motivo del rechazo (ej: sin stock de carne)..."
              placeholderTextColor="#a8a29e"
              className="mb-4 rounded-xl border border-mostaza/50 bg-black/40 p-3 text-xs text-amber-100"
              multiline
            />

            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => {
                  setPedidoARechazar(null);
                  setMotivoRechazo("");
                }}
                className="flex-1 rounded-xl border border-mostaza/40 bg-black/30 py-2.5 items-center"
              >
                <Text className="text-xs text-amber-200">Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleRechazar}
                className="flex-1 rounded-xl bg-terracota py-2.5 items-center"
              >
                <Text className="text-xs font-bold text-white">Confirmar Rechazo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}