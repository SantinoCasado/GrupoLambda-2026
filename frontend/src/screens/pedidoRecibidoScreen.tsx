import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { ChineseFrame } from "../components/ChineseFrame";
import { DetallePedidoCard } from "../components/DetallePedidoCard";
import { supabase } from "../config/supabase";
import { obtenerJugadasPedido } from "../services/juegosService";

interface Props {
  pedidoId: string;
  numeroMesa?: string | number;
  onIrAJuegos: () => void;
  onIrAEncuesta: (pedidoId: string) => void;
  onPedirCuenta: (pedidoId: string, propinaPorcentaje: number) => void;
  onVolver?: () => void;
}

// Mapeo de códigos QR a porcentaje de satisfacción
export const MAPA_QRS_PROPINA: Record<string, { label: string; porcentaje: number }> = {
  TIP_0: { label: "Malo (0%)", porcentaje: 0 },
  TIP_5: { label: "Regular (5%)", porcentaje: 5 },
  TIP_10: { label: "Bueno (10%)", porcentaje: 10 },
  TIP_15: { label: "Muy Bueno (15%)", porcentaje: 15 },
  TIP_20: { label: "Excelente (20%)", porcentaje: 20 },
};

export function PedidoRecibidoScreen({
  pedidoId,
  numeroMesa = "S/N",
  onIrAJuegos,
  onIrAEncuesta,
  onPedirCuenta,
  onVolver,
}: Props) {
  const [modalQrVisible, setModalQrVisible] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [escaneado, setEscaneado] = useState(false);
  const [pedido, setPedido] = useState<any>(null);
  const [cargandoPedido, setCargandoPedido] = useState(true);
  const [descuentoPct, setDescuentoPct] = useState(0);

  useEffect(() => {
    let activo = true;

    const cargarDetalle = async () => {
      try {
        const [{ data, error }, jugadas] = await Promise.all([
          supabase
            .from("orders")
            .select(`
              id,
              total_amount,
              discount_amount,
              tip_amount,
              order_items (
                id,
                quantity,
                unit_price,
                products (id, name)
              )
            `)
            .eq("id", pedidoId)
            .single(),
          obtenerJugadasPedido(pedidoId),
        ]);

        if (!activo) return;
        if (error) console.warn("Error cargando detalle del pedido:", error.message);

        const ganadora = jugadas.find(
          (j) =>
            Number(j.discount_percentage || 0) > 0 &&
            Boolean(j.won_on_first_try)
        );
        setDescuentoPct(Number(ganadora?.discount_percentage || 0));
        setPedido(error ? null : data);
      } catch (e: any) {
        if (activo) {
          console.warn("Error cargando detalle del pedido:", e?.message);
          setPedido(null);
        }
      } finally {
        if (activo) setCargandoPedido(false);
      }
    };

    if (pedidoId) cargarDetalle();
    else setCargandoPedido(false);

    return () => {
      activo = false;
    };
  }, [pedidoId]);

  const abrirEscanerPropina = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert(
          "Permiso de cámara",
          "Se requiere acceso a la cámara para escanear el QR de satisfacción/propina."
        );
        return;
      }
    }
    setEscaneado(false);
    setModalQrVisible(true);
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (escaneado) return;
    const cleanData = data ? data.trim().toUpperCase() : "";

    if (MAPA_QRS_PROPINA[cleanData]) {
      setEscaneado(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const { porcentaje } = MAPA_QRS_PROPINA[cleanData];
      setModalQrVisible(false);
      onPedirCuenta(pedidoId, porcentaje);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "QR no reconocido",
        `El código '${cleanData}' no corresponde a una opción válida de propina (TIP_0, TIP_5, TIP_10, TIP_15, TIP_20).`
      );
    }
  };

  return (
    <View className="flex-1">
      <StatusBar style="light" />

      {/* Cabecera */}
      <View className="px-5 pt-4">
        <View className="absolute left-5 z-10"
              style={{ top: 30 }}>
          <TouchableOpacity
            onPress={onVolver}
            accessibilityRole="button"
            accessibilityLabel="Volver"
            className="items-center justify-center rounded-xl border-2 border-mostaza bg-vino px-2 py-1 active:bg-terracota/70"
          >
            <Image
              source={require("../../assets/images/left-arrow-y.png")}
              className="h-6 w-6 mr-1 my-1"
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        <Image
          source={require("../../assets/images/logo-name.png")}
          className="h-20 w-auto self-center"
          resizeMode="contain"
        />
        <Image
          source={require("../../assets/images/separator.png")}
          className="mt-2 h-8 w-full"
          resizeMode="contain"
        />
        <ChineseFrame className="mt-1 bg-vino">
          <View className="items-center rounded-xl bg-mostaza/15 px-4 py-4">
            <Text
              style={{ fontFamily: "LaOriental" }}
              className="text-2xl text-mostaza uppercase text-center"
            >
              Mesa #{numeroMesa}
            </Text>
            <Text className="mt-1 text-xs text-center font-semibold text-amber-100">
              ¡Esperamos que haya disfrutado su estadía! 
            </Text>
            <Text className="mt-1 text-xs text-center font-semibold text-amber-100">
              No olvide dejarnos una reseña.
            </Text>
          </View>
        </ChineseFrame>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 12,
        }}
      >
        {/* Resumen del pedido */}
        <DetallePedidoCard
          pedido={pedido}
          descuentoPct={descuentoPct}
          cargando={cargandoPedido}
          className="mb-4"
        />

        {/* BOTÓN 1: DEJAR PROPINA (Abre escaneo de propina) */}
        <TouchableOpacity
          onPress={abrirEscanerPropina}
          activeOpacity={0.85}
          className="mb-4 flex-row items-center justify-between rounded-2xl border-2 border-mostaza bg-vino p-4 shadow-md active:bg-vino/80"
        >
          <View className="items-center flex-1">
            <Image
              source={require("../../assets/images/money-y.png")}
              className="h-20 w-20"
              resizeMode="contain"
            />
            <Text
              style={{ fontFamily: "LaOriental" }}
              className="text-lg uppercase text-mostaza"
            >
              Dejar propina
            </Text>
          </View>
        </TouchableOpacity>

        {/* BOTÓN 2: ENCUESTA */}
        <TouchableOpacity
          onPress={() => onIrAEncuesta(pedidoId)}
          activeOpacity={0.85}
          className="items-center rounded-2xl border-2 border-vino bg-mostaza p-4 active:bg-mostaza/80"
        >
          <View className="items-center flex-1">
            <Image
              source={require("../../assets/images/audit-v.png")}
              className="h-10 w-10"
              resizeMode="contain"
            />
            <Text
              style={{ fontFamily: "LaOriental" }}
              className="text-lg uppercase text-vino"
            >
              Dejar reseña
            </Text>
          </View>
        </TouchableOpacity>

        
      </ScrollView>

      {/* MODAL CÁMARA QR DE PROPINA */}
      <Modal
        visible={modalQrVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setModalQrVisible(false)}
      >
        <View className="flex-1 bg-black">
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
            onBarcodeScanned={escaneado ? undefined : handleBarcodeScanned}
          >
            <View className="flex-1 justify-between p-6 bg-black/40">
              {/* Header Modal */}
              <View className="items-center mt-10">
                <Text
                  style={{ fontFamily: "LaOriental" }}
                  className="text-xl text-mostaza uppercase text-center"
                >
                  Escaneo de Propina
                </Text>
                <Text className="text-white text-xs text-center mt-1 px-4">
                  Escanee el código QR que indica su grado de satisfacción con el servicio para generar la cuenta.
                </Text>
              </View>

              {/* Marco visor */}
              <View className="items-center justify-center">
                <View className="w-64 h-64 border-2 border-mostaza rounded-3xl bg-transparent relative items-center justify-center">
                  <View className="w-56 h-56 border border-dashed border-amber-200/50 rounded-2xl" />
                </View>
                <Text className="text-amber-100/80 text-[11px] mt-3 font-semibold">
                  Apunte la cámara al código QR
                </Text>
              </View>

              {/* Botón Cerrar */}
              <TouchableOpacity
                onPress={() => setModalQrVisible(false)}
                className="bg-stone-800 py-3 rounded-xl border border-stone-600 mb-4 items-center"
              >
                <Text className="text-white text-xs font-bold uppercase tracking-wider">
                  Cancelar
                </Text>
              </TouchableOpacity>
            </View>
          </CameraView>
        </View>
      </Modal>
    </View>
  );
}