import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Modal,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { supabase } from "../config/supabase";
import { ChineseFrame } from "../components/ChineseFrame";
import { FeedbackModal } from "../components/FeedbackModal";
import { ConfirmModal } from "../components/ConfirmModal";
import { CompanySpinner } from "../components/CompanySpinner";
import { DeliveryMap } from "../components/DeliveryMap";
import {
  PedidoDelivery,
  obtenerDeliveryApi,
  tomarPedidoDeliveryApi,
  entregarPedidoDeliveryApi,
} from "../services/deliveryService";
import {
  confirmarPagoPorMozo,
  porcentajePropinaDesdePedido,
} from "../services/cuentaService";

type Seccion = "disponibles" | "camino" | "cobrar";

interface Props {
  usuarioActual: { id: string; nombres?: string; apellidos?: string };
  onAbrirChatRepartidor?: (
    pedidoId: string,
    direccion: string,
    createdAt: string | null
  ) => void;
}

const SECCIONES: { clave: Seccion; titulo: string; vacio: string }[] = [
  {
    clave: "disponibles",
    titulo: "Disponibles",
    vacio: "No hay pedidos listos para retirar.",
  },
  {
    clave: "camino",
    titulo: "En camino",
    vacio: "No tenés entregas en curso.",
  },
  {
    clave: "cobrar",
    titulo: "Por cobrar",
    vacio: "No hay cuentas pendientes de cobro.",
  },
];

const formatearFechaHora = (iso?: string | null) => {
  if (!iso) return "";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "";
  return `${fecha.toLocaleDateString([], {
    day: "2-digit",
    month: "2-digit",
  })} ${fecha.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
};

const minutosTranscurridos = (iso?: string | null) => {
  if (!iso) return 0;
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - fecha.getTime()) / 60_000));
};

const formatearMonto = (monto: number) =>
  monto.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export function RepartidorScreen({
  usuarioActual,
  onAbrirChatRepartidor,
}: Props) {
  const [seccion, setSeccion] = useState<Seccion>("disponibles");
  const [disponibles, setDisponibles] = useState<PedidoDelivery[]>([]);
  const [enCamino, setEnCamino] = useState<PedidoDelivery[]>([]);
  const [porCobrar, setPorCobrar] = useState<PedidoDelivery[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [pedidoRuta, setPedidoRuta] = useState<PedidoDelivery | null>(null);
  const [pedidoAEntregar, setPedidoAEntregar] = useState<PedidoDelivery | null>(
    null
  );
  const [pedidoACobrar, setPedidoACobrar] = useState<PedidoDelivery | null>(
    null
  );

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
  ) => setFeedback({ visible: true, tipo, titulo, mensaje });

  const cargarTodo = useCallback(async () => {
    try {
      setCargando(true);
      const [listos, camino, cobrar] = await Promise.all([
        obtenerDeliveryApi("ready", usuarioActual.id).catch(() => []),
        obtenerDeliveryApi("on_the_way", usuarioActual.id).catch(() => []),
        obtenerDeliveryApi("bill_requested", usuarioActual.id).catch(() => []),
      ]);
      setDisponibles(listos);
      setEnCamino(camino);
      setPorCobrar(cobrar);
    } catch (err: any) {
      console.warn("Error cargando pedidos de delivery:", err?.message);
    } finally {
      setCargando(false);
    }
  }, [usuarioActual.id]);

  useEffect(() => {
    cargarTodo();

    const canal = supabase
      .channel(`repartidor_orders_${usuarioActual.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => cargarTodo()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [cargarTodo, usuarioActual.id]);

  const pedidos = useMemo(() => {
    if (seccion === "disponibles") return disponibles;
    if (seccion === "camino") return enCamino;
    return porCobrar;
  }, [seccion, disponibles, enCamino, porCobrar]);

  const tituloSeccion = SECCIONES.find((s) => s.clave === seccion)!;

  const tomarPedido = async (pedido: PedidoDelivery) => {
    setProcesandoId(pedido.id);
    try {
      await tomarPedidoDeliveryApi(pedido.id);
      abrirAviso(
        "Pedido asignado",
        `Retirá el pedido para ${pedido.delivery_address || "el domicilio del cliente"}. Ya se avisó al cliente que está en camino.`,
        "exito"
      );
      setSeccion("camino");
      await cargarTodo();
    } catch (err: any) {
      abrirAviso(
        "No se pudo tomar el pedido",
        err?.message || "Otro repartidor pudo haberlo tomado primero.",
        "error"
      );
      await cargarTodo();
    } finally {
      setProcesandoId(null);
    }
  };

  const ejecutarEntrega = async () => {
    if (!pedidoAEntregar) return;
    const pedido = pedidoAEntregar;
    setPedidoAEntregar(null);
    setProcesandoId(pedido.id);
    try {
      await entregarPedidoDeliveryApi(pedido.id);
      abrirAviso(
        "Entrega confirmada",
        "Se avisó al cliente para que confirme la recepción y pueda solicitar la cuenta.",
        "exito"
      );
      await cargarTodo();
    } catch (err: any) {
      abrirAviso(
        "No se pudo confirmar la entrega",
        err?.message || "Intentá nuevamente en unos segundos.",
        "error"
      );
    } finally {
      setProcesandoId(null);
    }
  };

  const ejecutarCobro = async () => {
    if (!pedidoACobrar) return;
    const pedido = pedidoACobrar;
    setPedidoACobrar(null);
    setProcesandoId(pedido.id);
    try {
      const porcentaje = porcentajePropinaDesdePedido(
        pedido.tip_amount,
        pedido.total_amount,
        pedido.discount_amount
      );

      // El repartidor cobra en la puerta. `mesaId` va vacío: un pedido a
      // domicilio no tiene mesa que liberar.
      await confirmarPagoPorMozo(pedido.id, "", porcentaje);

      abrirAviso(
        "Cobro registrado",
        "El pedido quedó pagado y el comprobante PDF fue enviado al cliente por correo.",
        "exito"
      );
      await cargarTodo();
    } catch (err: any) {
      abrirAviso(
        "No se pudo cobrar",
        err?.message || "Verificá que el cliente haya confirmado la recepción.",
        "error"
      );
    } finally {
      setProcesandoId(null);
    }
  };

  const totalPedido = (pedido: PedidoDelivery) =>
    Number(pedido.total_amount || 0);

  const renderAcciones = (pedido: PedidoDelivery) => {
    if (seccion === "disponibles") {
      return (
        <View className="mt-auto pt-3">
          <TouchableOpacity
            onPress={() => tomarPedido(pedido)}
            disabled={procesandoId !== null}
            className={`w-full rounded-2xl bg-emerald-600 py-2.5 active:bg-emerald-700 ${
              procesandoId !== null ? "opacity-50" : ""
            }`}
          >
            <Text
              style={{ fontFamily: "LaOriental" }}
              className="text-center text-sm uppercase tracking-wide text-white"
            >
              {procesandoId === pedido.id ? "Tomando..." : "Tomar pedido y salir"}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (seccion === "camino") {
      return (
        <View className="mt-auto flex-row gap-2 border-t border-stone-200 pt-3">
          <TouchableOpacity
            onPress={() => setPedidoRuta(pedido)}
            className="flex-1 items-center justify-center rounded-xl border-2 border-mostaza bg-vino py-2.5 active:bg-terracota"
          >
            <Text
              style={{ fontFamily: "LaOriental" }}
              className="text-xs uppercase tracking-wide text-mostaza"
            >
              Ver ruta
            </Text>
          </TouchableOpacity>

          {onAbrirChatRepartidor && (
            <TouchableOpacity
              onPress={() =>
                onAbrirChatRepartidor(
                  pedido.id,
                  pedido.delivery_address || "Domicilio del cliente",
                  pedido.created_at ?? null
                )
              }
              className="flex-1 flex-row items-center justify-center rounded-xl border-2 border-vino bg-mostaza py-2.5 active:bg-mostaza/80"
            >
              <Image
                source={require("../../assets/images/chat-v.png")}
                className="mr-1 h-5 w-5"
                resizeMode="contain"
              />
              <Text
                style={{ fontFamily: "LaOriental" }}
                className="text-xs uppercase tracking-wide text-vino"
              >
                Chat
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => setPedidoAEntregar(pedido)}
            disabled={procesandoId !== null}
            className={`flex-1 items-center justify-center rounded-xl bg-emerald-600 py-2.5 active:bg-emerald-700 ${
              procesandoId !== null ? "opacity-50" : ""
            }`}
          >
            <Text
              style={{ fontFamily: "LaOriental" }}
              className="text-xs uppercase tracking-wide text-white"
            >
              Entregar
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View className="mt-auto pt-3">
        <TouchableOpacity
          onPress={() => setPedidoACobrar(pedido)}
          disabled={procesandoId !== null}
          className={`w-full rounded-2xl bg-sky-600 py-2.5 active:bg-sky-700 ${
            procesandoId !== null ? "opacity-50" : ""
          }`}
        >
          <Text
            style={{ fontFamily: "LaOriental" }}
            className="text-center text-sm uppercase tracking-wide text-white"
          >
            Cobrar en el domicilio
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View className="flex-1">
      <StatusBar style="light" />

      {/* Cabecera */}
      <View className="px-5 pt-4">
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
        <ChineseFrame className="mt-1 bg-vino">
          <View className="items-center rounded-xl bg-mostaza/15 px-4 py-3">
            <Text
              style={{ fontFamily: "LaOriental" }}
              className="text-2xl text-mostaza uppercase text-center"
            >
              Repartidor
            </Text>
            <Text className="mt-1 text-xs font-semibold text-amber-100 text-center">
              Retirá los pedidos listos y entregalos en el domicilio
            </Text>
          </View>
        </ChineseFrame>

        {/* Selector de sección */}
        <View className="mt-3 flex-row gap-2">
          {SECCIONES.map((s) => {
            const cantidad =
              s.clave === "disponibles"
                ? disponibles.length
                : s.clave === "camino"
                ? enCamino.length
                : porCobrar.length;
            const activa = seccion === s.clave;

            return (
              <TouchableOpacity
                key={s.clave}
                onPress={() => setSeccion(s.clave)}
                className={`flex-1 rounded-xl border-2 px-2 py-2 ${
                  activa
                    ? "border-mostaza bg-mostaza"
                    : "border-mostaza/50 bg-vino"
                }`}
              >
                <Text
                  className={`text-center text-[11px] font-black uppercase ${
                    activa ? "text-vino" : "text-mostaza"
                  }`}
                >
                  {s.titulo}
                </Text>
                <Text
                  className={`text-center text-[10px] font-bold ${
                    activa ? "text-vino/80" : "text-amber-100/80"
                  }`}
                >
                  {cantidad}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Lista */}
      <View className="flex-1">
        {cargando ? (
          <View className="items-center justify-center py-20">
            <ActivityIndicator size="large" color="#8B1A1A" />
            <Text className="mt-3 text-xs font-bold text-vino">
              Cargando pedidos...
            </Text>
          </View>
        ) : pedidos.length === 0 ? (
          <View className="mt-6 items-center justify-center p-8">
            <Image
              source={require("../../assets/images/audit-car.png")}
              className="mb-3 h-14 w-14"
              resizeMode="contain"
            />
            <Text
              style={{ fontFamily: "LaOriental" }}
              className="text-center text-base uppercase text-vino"
            >
              {tituloSeccion.vacio}
            </Text>
            <Text className="mt-1 text-center text-xs text-stone-600">
              {seccion === "disponibles"
                ? "Cuando cocina y barra terminen un pedido a domicilio, aparecerá acá para que lo retires."
                : seccion === "camino"
                ? "Tomá un pedido disponible para comenzar una entrega."
                : "Cuando el cliente solicite la cuenta, aparecerá acá para cobrarla en la puerta."}
            </Text>
            <TouchableOpacity
              onPress={cargarTodo}
              className="mt-3 rounded-xl border border-calabaza bg-caramelo/10 px-4 py-2"
            >
              <Text className="text-xs font-bold text-calabaza">
                Actualizar Lista
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            className="flex-1 px-4 pt-3"
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            {pedidos.map((pedido) => {
              const items = pedido.items || [];
              const direccion =
                pedido.delivery_address || "Domicilio sin detallar";
              const minutos = minutosTranscurridos(pedido.created_at);
              const tieneCoords =
                pedido.delivery_lat != null &&
                pedido.delivery_lng != null &&
                Number.isFinite(Number(pedido.delivery_lat)) &&
                Number.isFinite(Number(pedido.delivery_lng));

              return (
                <View
                  key={pedido.id}
                  className="mb-3 rounded-2xl border-2 border-caramelo bg-[#FFFDF9] p-4"
                >
                  <View className="mb-2 flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                      <View
                        className={`mr-2 h-2.5 w-2.5 rounded-full ${
                          seccion === "cobrar"
                            ? "bg-sky-600"
                            : seccion === "camino"
                            ? "bg-emerald-500"
                            : "bg-amber-500"
                        }`}
                      />
                      <Text className="text-[11px] font-bold uppercase tracking-wide text-stone-600">
                        {seccion === "cobrar"
                          ? "Cuenta pendiente"
                          : seccion === "camino"
                          ? "En camino"
                          : "Listo para retirar"}
                      </Text>
                    </View>
                    <Text className="text-[10px] font-semibold text-stone-500">
                      {formatearFechaHora(pedido.created_at)}
                    </Text>
                  </View>

                  <View className="flex-row items-start">
                    <Image
                      source={require("../../assets/images/audit-car.png")}
                      className="mr-2 mt-0.5 h-7 w-7"
                      resizeMode="contain"
                    />
                    <View className="flex-1">
                      <Text className="text-[10px] font-bold uppercase tracking-wide text-terracota">
                        Entregar en:
                      </Text>
                      <Text className="text-base font-black text-vino">
                        {direccion}
                      </Text>
                      <Text className="mt-0.5 text-[10px] font-semibold text-stone-500">
                        ⏱ {minutos} min desde la creación
                        {pedido.client
                          ? ` • ${[pedido.client.first_name, pedido.client.last_name]
                              .filter(Boolean)
                              .join(" ")}`
                          : ""}
                      </Text>
                    </View>
                  </View>

                  {items.length > 0 && (
                    <View className="mt-3 rounded-xl border border-stone-200 bg-white px-3 py-2">
                      <Text className="mb-1 text-[10px] font-bold uppercase tracking-wide text-stone-500">
                        Contenido del pedido
                      </Text>
                      {items.map((it) => (
                        <Text
                          key={it.id}
                          className="text-sm text-stone-700"
                          numberOfLines={1}
                        >
                          – {it.quantity}x {it.product?.name || "Producto"}
                        </Text>
                      ))}
                    </View>
                  )}

                  <View className="mt-3 flex-row items-end justify-between">
                    <View>
                      <Text className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
                        Total a cobrar
                      </Text>
                      <Text className="text-xl font-black text-emerald-600">
                        ${formatearMonto(totalPedido(pedido))}
                      </Text>
                    </View>
                    {tieneCoords && seccion !== "disponibles" && (
                      <TouchableOpacity
                        onPress={() => setPedidoRuta(pedido)}
                        className="rounded-lg border border-vino bg-mostaza px-3 py-1.5 active:bg-mostaza/80"
                      >
                        <Text className="text-[10px] font-bold uppercase text-vino">
                          📍 Ruta
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {renderAcciones(pedido)}
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Mapa de ruta */}
      <Modal
        visible={pedidoRuta !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setPedidoRuta(null)}
      >
        <View className="flex-1 justify-center bg-black/70 px-4">
          <View className="rounded-3xl border-2 border-mostaza bg-[#FFFDF9] p-4">
            <Text
              style={{ fontFamily: "LaOriental" }}
              className="mb-2 text-center text-xl uppercase text-vino"
            >
              Ruta de entrega
            </Text>
            <Text
              className="mb-3 text-center text-[11px] font-semibold text-stone-600"
              numberOfLines={2}
            >
              🏮 Jardín Imperial → 🏠 {pedidoRuta?.delivery_address}
            </Text>

            {pedidoRuta &&
            pedidoRuta.delivery_lat != null &&
            pedidoRuta.delivery_lng != null &&
            Number.isFinite(Number(pedidoRuta.delivery_lat)) &&
            Number.isFinite(Number(pedidoRuta.delivery_lng)) ? (
              <DeliveryMap
                mode="route"
                latitude={Number(pedidoRuta.delivery_lat)}
                longitude={Number(pedidoRuta.delivery_lng)}
                height={320}
              />
            ) : (
              <View className="h-40 items-center justify-center rounded-2xl bg-stone-100 px-4">
                <Text className="text-center text-xs font-semibold text-stone-500">
                  Este pedido no tiene coordenadas cargadas. Usá la dirección
                  para ubicar el domicilio.
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={() => setPedidoRuta(null)}
              className="mt-4 w-full rounded-xl bg-vino py-3 active:bg-terracota"
            >
              <Text
                style={{ fontFamily: "LaOriental" }}
                className="text-center text-sm uppercase text-mostaza"
              >
                Cerrar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Confirmar entrega */}
      <ConfirmModal
        visible={pedidoAEntregar !== null}
        titulo="Confirmar Entrega"
        mensaje={
          <>
            ¿Confirmás que dejaste el pedido en{" "}
            <Text className="font-bold text-mostaza">
              {pedidoAEntregar?.delivery_address}
            </Text>
            ? El cliente deberá confirmar la recepción para habilitar el cobro.
          </>
        }
        textoConfirmar="Entregar"
        textoCancelar="Cancelar"
        cargando={procesandoId !== null}
        onConfirm={ejecutarEntrega}
        onCancel={() => setPedidoAEntregar(null)}
      />

      {/* Confirmar cobro */}
      <ConfirmModal
        visible={pedidoACobrar !== null}
        titulo="Cobrar Pedido"
        mensaje={
          <>
            ¿Registrás el cobro de{" "}
            <Text className="font-bold text-mostaza">
              ${formatearMonto(Number(pedidoACobrar?.total_amount || 0))}
            </Text>{" "}
            en{" "}
            <Text className="font-bold text-mostaza">
              {pedidoACobrar?.delivery_address}
            </Text>
            ? Se generará la factura y se enviará por correo al cliente.
          </>
        }
        textoConfirmar="Cobrar"
        textoCancelar="Cancelar"
        cargando={procesandoId !== null}
        onConfirm={ejecutarCobro}
        onCancel={() => setPedidoACobrar(null)}
      />

      <CompanySpinner
        visible={procesandoId !== null}
        mensaje="Procesando pedido..."
      />

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
