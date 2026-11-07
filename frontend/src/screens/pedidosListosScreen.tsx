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
import { CompanySpinner } from "../components/CompanySpinner";
import {
  marcarPedidoEntregadoApi,
  obtenerMetadatosProductosApi,
  ProductoMetadatos,
} from "../services/pedidosService";

const ORDEN_CATEGORIA: Record<string, number> = {
  dish: 0,
  drink: 1,
  dessert: 2,
};

const ICONO_CATEGORIA: Record<string, string> = {
  dish: "🍲",
  drink: "🍹",
  dessert: "🍮",
};

export default function PedidosListosScreen() {
  const [pedidosListos, setPedidosListos] = useState<any[]>([]);
  const [metadatos, setMetadatos] = useState<Record<string, ProductoMetadatos>>({});
  const [pagina, setPagina] = useState(0);
  const [altoPagina, setAltoPagina] = useState(0);
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
      // Al recargar, el carrusel vuelve a la primera página.
      setPagina(0);
      const [{ data, error }, mapa] = await Promise.all([
        supabase
          .from("orders")
          .select(`
            id,
            created_at,
            status,
            order_type,
            delivery_address,
            restaurant_tables (table_number),
            order_items (
              id,
              quantity,
              products (id, name, category)
            )
          `)
          .eq("status", "ready")
          .order("created_at", { ascending: true }),
        obtenerMetadatosProductosApi().catch(
          () => ({}) as Record<string, ProductoMetadatos>
        ),
      ]);

      if (error) console.warn("Error cargando pedidos listos:", error.message);
      setPedidosListos(data || []);
      setMetadatos(mapa);
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

  useEffect(() => {
    if (pedidosListos.length > 0 && pagina >= pedidosListos.length) {
      setPagina(pedidosListos.length - 1);
    }
  }, [pedidosListos.length, pagina]);

  const ejecutarEntrega = async () => {
    if (!confirmando) return;
    const pedido = confirmando;
    setConfirmando(null);
    setProcesandoId(pedido.id);

    try {
      await marcarPedidoEntregadoApi(pedido.id);
      const esDelivery = pedido.order_type === "delivery";
      abrirAviso(
        esDelivery ? "¡Pedido Listo para el Repartidor!" : "¡Pedido Entregado!",
        esDelivery
          ? `El pedido a domicilio en ${
              pedido.delivery_address || "la dirección del cliente"
            } fue avisado a los repartidores para que lo retiren.`
          : `El pedido de la Mesa #${
              pedido.restaurant_tables?.table_number ?? "S/N"
            } fue marcado como entregado.`,
        "exito"
      );
      cargarPedidos();
    } catch (err: any) {
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

      <View className="px-5 pt-4">
        <View className="mb-4">
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

      <View
        className="flex-1"
        onLayout={(e) => setAltoPagina(Math.round(e.nativeEvent.layout.height))}
      >
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
        ) : !altoPagina ? null : (
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
            {pedidosListos.map((pedido) => {
              const numMesa = pedido.restaurant_tables?.table_number ?? "S/N";
              const esDelivery = pedido.order_type === "delivery";
              // Platos primero, luego bebidas y al final los postres.
              const items = [...(pedido.order_items || [])].sort(
                (a: any, b: any) =>
                  (ORDEN_CATEGORIA[a.products?.category] ?? 99) -
                  (ORDEN_CATEGORIA[b.products?.category] ?? 99)
              );
              return (
                <View
                  key={pedido.id}
                  style={{ height: altoPagina }}
                  className="px-4 py-2"
                >
                  <View className="flex-1 rounded-2xl border-2 border-caramelo bg-[#FFFDF9] p-4">
                    <View className="mb-2 flex-row items-center justify-between">
                      <View className="flex-1 pr-2">
                        <Text
                          className={`text-vino ${esDelivery ? "text-lg" : "text-2xl"}`}
                          style={{ fontFamily: "LaOriental" }}
                          numberOfLines={2}
                        >
                          {esDelivery
                            ? pedido.delivery_address || "Pedido a Domicilio"
                            : `Mesa #${numMesa}`}
                        </Text>
                        {esDelivery && (
                          <Text className="text-[11px] font-bold uppercase tracking-wide text-terracota">
                            🛵 Entregar al Repartidor
                          </Text>
                        )}
                      </View>
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

                    <ScrollView
                      className="mt-2 flex-1"
                      nestedScrollEnabled
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={{ paddingBottom: 12 }}
                    >
                      <View className="border-b border-calabaza border-dashed pb-3">
                        {items.map((it: any) => {
                          const icono =
                            ICONO_CATEGORIA[it.products?.category] ?? "🍽️";
                          const foto =
                            metadatos[it.products?.id ?? ""]?.fotos[0];
                          return (
                            <View
                              key={it.id}
                              className="mt-1.5 flex-row items-center"
                            >
                              <View className="h-2.5 w-2.5 rounded-full bg-calabaza" />
                              <Text
                                className="ml-3 text-2xl text-calabaza"
                                style={{ fontFamily: "LaOriental" }}
                                numberOfLines={1}
                              >
                                {it.quantity}x
                              </Text>
                              {foto ? (
                                <Image
                                  source={{ uri: foto }}
                                  className="h-20 w-20 mx-4 rounded-lg border-2 border-calabaza bg-stone-100"
                                  resizeMode="cover"
                                />
                              ) : (
                                <View className="h-20 w-20 items-center justify-center rounded-lg bg-stone-100 mx-4">
                                  <Text className="text-base">{icono}</Text>
                                </View>
                              )}
                              <Text
                                className="min-w-0 flex-1 text-lg text-stone-700"
                                numberOfLines={2}
                                ellipsizeMode="tail"
                              >
                                {it.products?.name || "Producto"}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </ScrollView>

                    <View className="mt-auto pt-3">
                      <TouchableOpacity
                        onPress={() => setConfirmando(pedido)}
                        disabled={procesandoId !== null}
                        className={`w-full rounded-2xl bg-emerald-600 py-2.5 active:bg-emerald-700 ${
                          procesandoId !== null ? "opacity-50" : ""
                        }`}
                      >
                        <Text
                          style={{ fontFamily: "LaOriental" }}
                          className="text-center text-sm uppercase tracking-wide text-white"
                        >
                          {procesandoId === pedido.id
                            ? "Procesando..."
                            : esDelivery
                            ? "Entregar al Repartidor"
                            : "Entregar"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Modal de confirmación de entrega */}
      <ConfirmModal
        visible={confirmando !== null}
        titulo={
          confirmando?.order_type === "delivery"
            ? "Avisar al Repartidor"
            : "Entregar Pedido"
        }
        mensaje={
          confirmando?.order_type === "delivery" ? (
            <>
              Avisar a los repartidores que el pedido a domicilio en{" "}
              <Text className="font-bold text-mostaza">
                {confirmando?.delivery_address || "la dirección del cliente"}
              </Text>{" "}
              está listo para retirar.
            </>
          ) : (
            <>
              Entregar pedido de la{" "}
              <Text className="font-bold text-mostaza">
                Mesa #{confirmando?.restaurant_tables?.table_number}
              </Text>{" "}
            </>
          )
        }
        textoConfirmar={
          confirmando?.order_type === "delivery" ? "Avisar" : "Entregar"
        }
        textoCancelar="Cancelar"
        cargando={procesandoId !== null}
        onConfirm={ejecutarEntrega}
        onCancel={() => setConfirmando(null)}
      />

      {/* Spinner mientras se entrega el pedido */}
      <CompanySpinner
        visible={procesandoId !== null}
        mensaje="Entregando pedido..."
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