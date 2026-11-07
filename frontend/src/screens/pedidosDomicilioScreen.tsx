import { FeedbackModal } from "../components/FeedbackModal";
import { ConfirmModal } from "../components/ConfirmModal";
import { CompanySpinner } from "../components/CompanySpinner";
import { ChineseFrame } from "../components/ChineseFrame";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Dimensions,
  TextInput,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { supabase } from "../config/supabase";
import { confirmarPedidoPorMozoApi } from "../services/pedidosService";

interface Props {
  usuarioActual: any;
}

const formatearFechaHora = (iso?: string | null) => {
  if (!iso) return "";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "";
  return `${fecha.toLocaleDateString([], {
    day: "2-digit",
    month: "2-digit",
  })} ${fecha.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
};

/**
 * Pantalla del dueño/supervisor para aprobar o rechazar los pedidos a
 * domicilio que llegan desde la app del cliente. Mantiene el mismo lenguaje
 * visual que las comandas del mozo.
 */
export function PedidosDomicilioScreen({ usuarioActual: _usuarioActual }: Props) {
  const [pedidosPendientes, setPedidosPendientes] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  // Carrusel horizontal de pedidos (1 por página)
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const [pagina, setPagina] = useState(0);
  const screenWidth = Dimensions.get("window").width;

  const [confirmacion, setConfirmacion] = useState<{
    visible: boolean;
    pedido: any;
    accion: "confirmar" | "rechazar";
  }>({
    visible: false,
    pedido: null,
    accion: "confirmar",
  });

  const [procesandoAccion, setProcesandoAccion] = useState<
    "confirmar" | "rechazar" | null
  >(null);

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
    setModalFeedback({ visible: true, tipo, titulo, mensaje });
  };

  const cargarPedidos = async () => {
    try {
      setCargando(true);
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (
            id,
            quantity,
            products (id, name, price, category)
          )
        `)
        .eq("order_type", "delivery")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) console.warn("Error cargando pedidos a domicilio:", error.message);
      setPedidosPendientes(data || []);
    } catch (err: any) {
      console.warn("Error cargando pedidos a domicilio:", err?.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarPedidos();

    const canalOrders = supabase
      .channel("admin_delivery_orders_channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => cargarPedidos()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canalOrders);
    };
  }, []);

  useEffect(() => {
    if (pedidosPendientes.length > 0 && pagina >= pedidosPendientes.length) {
      setPagina(pedidosPendientes.length - 1);
    }
  }, [pedidosPendientes.length]);

  const irSiguiente = () => {
    const p = pagina + 1;
    if (p < pedidosPendientes.length) {
      setPagina(p);
      scrollRef.current?.scrollTo({ x: p * screenWidth, animated: true });
    }
  };

  const irAnterior = () => {
    const p = pagina - 1;
    if (p >= 0) {
      setPagina(p);
      scrollRef.current?.scrollTo({ x: p * screenWidth, animated: true });
    }
  };

  const abrirConfirmacion = (pedido: any, accion: "confirmar" | "rechazar") => {
    if (accion === "rechazar") setMotivoRechazo("");
    setConfirmacion({ visible: true, pedido, accion });
  };

  const ejecutarDecision = async () => {
    if (!confirmacion.pedido) return;
    const { pedido, accion } = confirmacion;
    const esConfirmacion = accion === "confirmar";
    const motivo = esConfirmacion ? "" : motivoRechazo.trim();

    if (!esConfirmacion && !motivo) return;

    setConfirmacion((prev) => ({ ...prev, visible: false }));
    setProcesandoId(pedido.id);
    setProcesandoAccion(accion);

    try {
      // Para delivery el pedido no tiene mozo asignado: se envía null.
      await confirmarPedidoPorMozoApi(
        pedido.id,
        null,
        esConfirmacion ? "in_preparation" : "cancelled",
        esConfirmacion ? undefined : motivo
      );
      abrirAviso(
        esConfirmacion ? "¡Pedido Aceptado!" : "Pedido Rechazado",
        esConfirmacion
          ? "El pedido a domicilio fue aprobado. Se avisó al cliente con el tiempo estimado de entrega."
          : "Se notificó al cliente por push y por correo con el motivo del rechazo.",
        esConfirmacion ? "exito" : "error"
      );
      cargarPedidos();
    } catch (err: any) {
      abrirAviso(
        "Error",
        err?.message ||
          (esConfirmacion
            ? "No se pudo aceptar el pedido."
            : "No se pudo rechazar el pedido."),
        "error"
      );
    } finally {
      setProcesandoId(null);
      setProcesandoAccion(null);
    }
  };

  return (
    <View className="flex-1">
      <StatusBar style="light" />

      {/* Cabecera */}
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
                Pedidos a Domicilio
              </Text>
              <Text className="mt-1 text-xs font-semibold text-amber-100 text-center">
                Aceptar o rechazar pedidos de clientes registrados
              </Text>
            </View>
          </ChineseFrame>
        </View>
      </View>

      {/* Contenido */}
      <View className="flex-1">
        {cargando ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color="#8B1A1A" />
            <Text className="mt-3 text-xs font-bold text-vino">
              Cargando pedidos a domicilio...
            </Text>
          </View>
        ) : pedidosPendientes.length === 0 ? (
          <View className="items-center justify-center bg-transparent p-8 mt-6">
            <Image
              source={require("../../assets/images/audit-car.png")}
              className="mb-3 h-14 w-14"
              resizeMode="contain"
            />
            <Text
              style={{ fontFamily: "LaOriental" }}
              className="text-base uppercase text-vino text-center"
            >
              No hay pedidos a domicilio pendientes
            </Text>
            <Text className="mt-1 text-center text-xs text-stone-600">
              Cuando un cliente registrado confirme un pedido a domicilio,
              aparecerá aquí para su aprobación.
            </Text>
            <TouchableOpacity
              onPress={cargarPedidos}
              className="mt-3 rounded-xl border border-calabaza bg-caramelo/10 px-4 py-2"
            >
              <Text className="text-xs font-bold text-calabaza">Actualizar Lista</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <ScrollView
              ref={scrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                setPagina(
                  Math.round(e.nativeEvent.contentOffset.x / screenWidth)
                );
              }}
              style={{ flex: 1 }}
            >
              {pedidosPendientes.map((item) => {
                const items = item.order_items || [];
                const direccion = item.delivery_address || "Domicilio sin detallar";

                return (
                  <View
                    key={item.id}
                    style={{ width: screenWidth }}
                    className="flex-1 px-5 pt-2"
                  >
                    <ScrollView
                      nestedScrollEnabled
                      showsVerticalScrollIndicator={false}
                      className="flex-1"
                      contentContainerStyle={{ flexGrow: 1, paddingBottom: 8 }}
                    >
                      <View className="flex-1 rounded-2xl border-2 border-caramelo bg-[#FFFDF9] p-4">
                        {/* Cabecera de la tarjeta */}
                        <View className="flex-row justify-between items-center mb-3">
                          <View className="flex-row items-center flex-1">
                            <View className="h-2.5 w-2.5 rounded-full bg-amber-500 mr-2" />
                            <Text className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">
                              Pedido a Domicilio Pendiente
                            </Text>
                          </View>
                          <Text className="text-[10px] text-stone-500 font-semibold">
                            {formatearFechaHora(item.created_at)}
                          </Text>
                        </View>

                        {/* Dirección */}
                        <View className="mb-2 flex-row items-start">
                          <Image
                            source={require("../../assets/images/audit-car.png")}
                            className="mr-2 mt-0.5 h-6 w-6"
                            resizeMode="contain"
                          />
                          <View className="flex-1">
                            <Text className="text-[10px] font-bold uppercase tracking-wide text-terracota">
                              Entregar en:
                            </Text>
                            <Text className="text-base font-black text-vino">
                              {direccion}
                            </Text>
                          </View>
                        </View>

                        {/* Productos + tiempo */}
                        <View className="mt-2 flex-row items-start justify-between gap-3">
                          <View className="flex-1">
                            <Text className="text-[10px] font-bold text-terracota tracking-wide">
                              Productos:
                            </Text>
                            {items.map((it: any) => (
                              <Text
                                key={it.id}
                                className="text-sm text-stone-700"
                                numberOfLines={1}
                                ellipsizeMode="tail"
                              >
                                – {it.quantity}x {it.products?.name || "Producto"} ($
                                {it.products?.price})
                              </Text>
                            ))}
                          </View>

                          <View className="items-end">
                            <Text className="text-[10px] font-bold text-terracota tracking-wide">
                              Preparación:
                            </Text>
                            <Text className="text-sm font-bold text-stone-600">
                              ⏱ ~{item.estimated_delivery_time || 15} min
                            </Text>
                          </View>
                        </View>

                        {/* Total + acciones */}
                        <View className="mt-auto pt-3">
                          <View className="items-end mb-3">
                            <Text className="text-md font-bold text-terracota uppercase tracking-wide">
                              Total:
                            </Text>
                            <Text className="text-xl font-black text-emerald-600">
                              ${Number(item.total_amount || 0).toLocaleString("es-AR")}
                            </Text>
                          </View>

                          <View className="flex-row justify-between gap-3 border-t border-stone-200 pt-3">
                            <TouchableOpacity
                              onPress={() => abrirConfirmacion(item, "rechazar")}
                              disabled={procesandoId === item.id || procesandoAccion !== null}
                              className="flex-1 flex-row items-center justify-center rounded-xl border border-terracota bg-[#FBE9DF] py-2.5 active:bg-rose-200"
                            >
                              <Image
                                source={require("../../assets/images/cross-c.png")}
                                className="mr-1.5 h-3 w-3"
                                resizeMode="contain"
                              />
                              <Text className="text-xs font-bold text-terracota">
                                Rechazar
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => abrirConfirmacion(item, "confirmar")}
                              disabled={procesandoId === item.id || procesandoAccion !== null}
                              className="flex-1 flex-row items-center justify-center rounded-xl border border-amber-500 bg-mostaza py-2.5 active:bg-amber-600 shadow-sm"
                            >
                              <Image
                                source={require("../../assets/images/tick-v.png")}
                                className="mr-1.5 h-5 w-5"
                                resizeMode="contain"
                              />
                              <Text className="text-xs font-black text-vino uppercase">
                                Aceptar
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </ScrollView>
                  </View>
                );
              })}
            </ScrollView>

            {/* Navegación */}
            {(pagina > 0 || pagina < pedidosPendientes.length - 1) && (
              <View className="gap-2 px-5 pb-3 pt-1">
                {pagina < pedidosPendientes.length - 1 && (
                  <TouchableOpacity
                    onPress={irSiguiente}
                    disabled={procesandoAccion !== null}
                    className="w-full flex-row items-center justify-center rounded-2xl border border-calabaza bg-[#FBE9DF] py-3 active:bg-[#f5dccb]"
                  >
                    <Text
                      style={{ fontFamily: "LaOriental" }}
                      className="text-s text-calabaza"
                    >
                      Siguiente
                    </Text>
                  </TouchableOpacity>
                )}

                {pagina > 0 && (
                  <TouchableOpacity
                    onPress={irAnterior}
                    disabled={procesandoAccion !== null}
                    className="w-full flex-row items-center justify-center rounded-2xl border border-mostaza/40 bg-[#FBE9DF] py-3 active:bg-[#f5dccb]"
                  >
                    <Text
                      style={{ fontFamily: "LaOriental" }}
                      className="text-s text-calabaza"
                    >
                      Anterior
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        )}
      </View>

      {/* Modal de confirmación */}
      <ConfirmModal
        visible={confirmacion.visible}
        titulo={
          confirmacion.accion === "confirmar"
            ? "Aceptar Pedido a Domicilio"
            : "Rechazar Pedido a Domicilio"
        }
        mensaje={
          <>
            ¿Está seguro de que desea{" "}
            <Text className="font-bold">
              {confirmacion.accion === "confirmar" ? "ACEPTAR" : "RECHAZAR"}
            </Text>{" "}
            el pedido a domicilio de{" "}
            <Text className="font-bold text-mostaza">
              {confirmacion.pedido?.delivery_address || "este cliente"}
            </Text>
            ?{" "}
            {confirmacion.accion === "confirmar"
              ? "Se enviará a cocina/barra y se notificará el tiempo estimado al cliente."
              : "Se notificará al cliente por push y por correo con el motivo."}
          </>
        }
        textoConfirmar={confirmacion.accion === "confirmar" ? "Aceptar" : "Rechazar"}
        textoCancelar="Cancelar"
        tipo={confirmacion.accion === "confirmar" ? "confirmar" : "peligro"}
        confirmarDeshabilitado={
          confirmacion.accion === "rechazar" && motivoRechazo.trim().length === 0
        }
        onConfirm={ejecutarDecision}
        onCancel={() => setConfirmacion((prev) => ({ ...prev, visible: false }))}
      >
        {confirmacion.accion === "rechazar" && (
          <TextInput
            value={motivoRechazo}
            onChangeText={setMotivoRechazo}
            placeholder="Motivo del rechazo (obligatorio)"
            placeholderTextColor="#A8A29E"
            multiline
            className="mb-5 w-full rounded-xl border border-vino/30 bg-white/95 px-3 py-2.5 text-sm text-vino"
          />
        )}
      </ConfirmModal>

      <CompanySpinner
        visible={procesandoAccion !== null}
        mensaje={
          procesandoAccion === "confirmar"
            ? "Aceptando pedido..."
            : "Rechazando pedido..."
        }
      />

      <FeedbackModal
        visible={modalFeedback.visible}
        tipo={modalFeedback.tipo}
        titulo={modalFeedback.titulo}
        mensaje={modalFeedback.mensaje}
        onClose={() =>
          setModalFeedback((prev) => ({ ...prev, visible: false }))
        }
      />
    </View>
  );
}
