import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  BackHandler,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  obtenerDetalleCuenta,
  solicitarCuentaApi,
  escucharPagoConfirmado,
  DetalleCuenta,
} from "../services/cuentaService";
import { FeedbackModal } from "../components/FeedbackModal";

interface Props {
  pedidoId: string;
  propinaPorcentaje: number;
  onPagoCompletado: () => void;
  onVolver: () => void;
}

export function CuentaScreen({
  pedidoId,
  propinaPorcentaje,
  onPagoCompletado,
  onVolver,
}: Props) {
  const [cargando, setCargando] = useState(true);
  const [detalle, setDetalle] = useState<DetalleCuenta | null>(null);
  const [pagando, setPagando] = useState(false);
  const [esperandoMozo, setEsperandoMozo] = useState(false);

  const [feedback, setFeedback] = useState<{
    visible: boolean;
    tipo: "exito" | "error" | "informacion";
    titulo: string;
    mensaje: string;
  }>({ visible: false, tipo: "exito", titulo: "", mensaje: "" });

  // Unificamos el manejo del botón físico de Atrás
  useEffect(() => {
    const retrocederSeguro = () => {
      if (esperandoMozo) {
        return true;
      }
      onVolver();
      return true;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      retrocederSeguro
    );

    return () => subscription.remove();
  }, [esperandoMozo, onVolver]);

  // Carga inicial del detalle
  useEffect(() => {
    async function cargar() {
      if (!pedidoId || pedidoId.trim() === "") {
        return;
      }

      try {
        setCargando(true);
        const data = await obtenerDetalleCuenta(pedidoId, propinaPorcentaje);
        setDetalle(data);

        await solicitarCuentaApi(
          pedidoId,
          data.totalFinal,
          data.montoPropina,
          data.montoDescuento
        );
      } catch (err: any) {
        setFeedback({
          visible: true,
          tipo: "error",
          titulo: "Error al cargar cuenta",
          mensaje: err?.message || "No se pudo obtener el desglose.",
        });
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, [pedidoId, propinaPorcentaje]);

  // Escuchar cuando el mozo confirma el pago
  useEffect(() => {
    if (!pedidoId || pedidoId.trim() === "") return;

    const desuscribir = escucharPagoConfirmado(pedidoId, () => {
      setEsperandoMozo(false);
      setFeedback({
        visible: true,
        tipo: "exito",
        titulo: "¡Pago Confirmado!",
        mensaje:
          detalle?.orderType === "delivery"
            ? "El repartidor confirmó el cobro. Tu comprobante en PDF ya fue generado y enviado. ¡Gracias por tu pedido!"
            : "El mozo ha confirmado tu pago. Tu comprobante en PDF ya fue generado y enviado. ¡Gracias por visitarnos!",
      });
      setTimeout(() => {
        onPagoCompletado();
      }, 2000);
    });

    return () => {
      if (typeof desuscribir === "function") {
        desuscribir();
      }
    };
  }, [pedidoId, onPagoCompletado, detalle?.orderType]);

  const simularPago = () => {
    setPagando(true);
    setTimeout(() => {
      setPagando(false);
      setEsperandoMozo(true);
    }, 1500);
  };

  if (cargando || !detalle) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#800020" />
        <Text className="mt-3 text-xs font-bold text-vino">
          Calculando cuenta y propina...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-stone-100">
      <StatusBar style="dark" />

      {/* Header Estilo Mercado Pago */}
      <View className="bg-sky-600 px-6 pt-12 pb-6 items-center shadow-md">
        <Text className="text-white text-xs font-bold tracking-widest uppercase text-center">
          Detalle de Cobro •{" "}
          {detalle.orderType === "delivery"
            ? detalle.direccionEntrega || detalle.numeroMesa
            : `Mesa #${detalle.numeroMesa}`}
        </Text>
        <Text className="text-white text-3xl font-extrabold mt-1">
          ${detalle.totalFinal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
        </Text>
        <Text className="text-sky-100 text-[11px] mt-0.5">
          Jardín Imperial Restaurant
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Tarjeta de Ticket */}
        <View className="bg-white rounded-2xl p-5 shadow-sm border border-stone-200">
          <Text className="text-xs font-bold uppercase text-stone-400 mb-3 tracking-wider">
            Consumo Realizado
          </Text>

          {detalle.items.map((it) => (
            <View
              key={it.id}
              className="flex-row justify-between items-center py-2.5 border-b border-stone-100"
            >
              <View className="flex-1 pr-2">
                <Text className="text-stone-800 text-sm font-semibold">
                  {it.name}
                </Text>
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
              ${detalle.subtotal.toFixed(2)}
            </Text>
          </View>

          {/* Descuento Juegos */}
          {detalle.porcentajeDescuento > 0 && (
            <View className="flex-row justify-between py-1.5">
              <Text className="text-emerald-600 text-sm font-semibold">
                Descuento Juegos ({detalle.porcentajeDescuento}%)
              </Text>
              <Text className="text-emerald-600 font-bold text-sm">
                -${detalle.montoDescuento.toFixed(2)}
              </Text>
            </View>
          )}

          {/* Propina Escaneada */}
          <View className="flex-row justify-between py-1.5">
            <Text className="text-amber-700 text-sm font-semibold">
              Propina ({detalle.porcentajePropina}%)
            </Text>
            <Text className="text-amber-700 font-semibold text-sm">
              +${detalle.montoPropina.toFixed(2)}
            </Text>
          </View>

          <View className="border-t-2 border-dashed border-stone-200 my-4" />

          {/* TOTAL DESTACADO */}
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-xs uppercase font-extrabold text-stone-500">
                Total a abonar
              </Text>
              <Text className="text-[10px] text-stone-400">
                IVA y servicios incluidos
              </Text>
            </View>
            <Text className="text-2xl font-black text-sky-700">
              ${detalle.totalFinal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        {/* Zona de Pago / Espera */}
        {!esperandoMozo ? (
          <View className="mt-5">
            <TouchableOpacity
              onPress={simularPago}
              disabled={pagando}
              activeOpacity={0.85}
              className={`w-full py-4 rounded-2xl bg-sky-600 items-center shadow-md active:bg-sky-700 ${
                pagando ? "opacity-60" : ""
              }`}
            >
              {pagando ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text className="text-white text-base font-bold tracking-wide">
                  Pagar con Mercado Pago
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View className="mt-6 bg-amber-100 border border-amber-300 rounded-2xl p-5 items-center">
            <ActivityIndicator size="small" color="#92400e" />
            <Text className="text-amber-900 font-bold text-sm mt-3 text-center">
              Pago emitido correctamente
            </Text>
            <Text className="text-amber-800 text-xs text-center mt-1">
              Esperando que {detalle.orderType === "delivery" ? "el repartidor" : "el mozo"} confirme la transacción...
            </Text>
          </View>
        )}
      </ScrollView>

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