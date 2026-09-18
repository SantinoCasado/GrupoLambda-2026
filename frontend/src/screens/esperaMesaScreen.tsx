import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, Image, Modal, Alert, ActivityIndicator } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { supabase } from "../config/supabase";
import { eliminarClienteAnonimo } from "../services/clienteAnonimoService";

interface Props {
  cliente: {
    id: string;
    client_name: string;
    client_photo: string;
    status: string;
  };
  onSalir: () => void;
}

export function EsperaMesaScreen({ cliente, onSalir }: Props) {
  const [escaneandoQR, setEscaneandoQR] = useState(false);
  const [qrEntradaEscaneado, setQrEntradaEscaneado] = useState(false);
  const [mesaAsignada, setMesaAsignada] = useState<string | null>(null);
  const [modalEncuestas, setModalEncuestas] = useState(false);
  const [saliendo, setSaliendo] = useState(false);

  const [permission, requestPermission] = useCameraPermissions();
  const scanLockRef = useRef(false);

  // Suscripción Realtime a waiting_list para detectar asignación de mesa
  useEffect(() => {
    if (!cliente?.id) return;

    const canal = supabase
      .channel(`espera_${cliente.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "waiting_list",
          filter: `id=eq.${cliente.id}`,
        },
        (payload: any) => {
          const nuevo = payload.new;
          if (nuevo?.assigned_table_id) {
            setMesaAsignada(nuevo.assigned_table_id);
            Alert.alert(
              "¡Mesa Asignada! 🍜",
              "El metre te ha asignado una mesa. Ya podés acercarte al salón."
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [cliente?.id]);

  const abrirEscaner = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert("Permiso Requerido", "Se necesita permiso de cámara para escanear el QR.");
        return;
      }
    }
    scanLockRef.current = false;
    setEscaneandoQR(true);
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanLockRef.current) return;
    scanLockRef.current = true;
    setEscaneandoQR(false);

    if (data.includes("INGRESO_LOCAL") || data.includes("ingreso") || data.includes("entrada")) {
      setQrEntradaEscaneado(true);
      Alert.alert("¡QR Correcto!", "Confirmaste tu ingreso al local. Estás en lista de espera.");
    } else {
      Alert.alert("QR no válido", "Debes escanear el código QR ubicado en el ingreso al local.", [
        { text: "Entendido", onPress: () => { scanLockRef.current = false; } },
      ]);
    }
  };

  const handleSalir = async () => {
    Alert.alert(
        "Abandonar lista",
        "¿Deseas salir del local? Tu turno en la lista de espera será cancelado.",
        [
        { text: "Cancelar", style: "cancel" },
        {
            text: "Sí, salir",
            style: "destructive",
            onPress: async () => {
            setSaliendo(true);
            try {
                // Pasa user_id (o id si coinciden) para borrar el registro de users
                const targetId = (cliente as any)?.user_id || cliente?.id;
                if (targetId) {
                await eliminarClienteAnonimo(targetId, cliente.client_photo);
                }
            } catch (err: any) {
                console.warn("Error al salir de la lista:", err.message);
            } finally {
                setSaliendo(false);
                onSalir();
            }
            },
        },
        ]
    );
    };

  return (
    <View className="flex-1 justify-center px-6 pt-12">
      <View className="items-center rounded-3xl border border-mostaza/40 bg-vino/90 p-6 shadow-2xl">
        {/* Foto y Nombre del Anónimo */}
        {cliente?.client_photo ? (
          <Image
            source={{ uri: cliente.client_photo }}
            className="h-24 w-24 rounded-full border-2 border-mostaza"
          />
        ) : (
          <Text className="text-4xl">👤</Text>
        )}
        <Text style={{ fontFamily: "LaOriental" }} className="mt-3 text-2xl text-mostaza">
          Hola, {cliente?.client_name || "Invitado"}
        </Text>
        <Text className="text-center text-xs text-amber-100/70 mt-1">
          Estado: {mesaAsignada ? "Mesa Asignada" : "En espera de mesa"}
        </Text>

        <View className="my-6 w-full border-t border-mostaza/20" />

        {/* 1. Botón de Escaneo QR de Entrada */}
        {!qrEntradaEscaneado ? (
          <TouchableOpacity
            onPress={abrirEscaner}
            className="w-full flex-row items-center justify-center rounded-2xl bg-calabaza py-3.5"
          >
            <Text className="mr-2 text-xl">📷</Text>
            <Text style={{ fontFamily: "LaOriental" }} className="text-sm uppercase text-white">
              Escanear QR de Entrada
            </Text>
          </TouchableOpacity>
        ) : (
          <View className="w-full items-center rounded-2xl bg-emerald-950/60 p-3 border border-emerald-500/40">
            <Text className="text-emerald-400 font-bold text-center text-xs">
              ✓ Ingreso confirmado - Notificado al Metre
            </Text>
          </View>
        )}

        {/* 2. Botón para ver Encuestas Previas */}
        <TouchableOpacity
          onPress={() => setModalEncuestas(true)}
          className="mt-3 w-full flex-row items-center justify-center rounded-2xl border border-mostaza/60 bg-vino py-3"
        >
          <Text className="mr-2 text-base">📊</Text>
          <Text style={{ fontFamily: "LaOriental" }} className="text-sm uppercase text-mostaza">
            Ver Encuestas Previas
          </Text>
        </TouchableOpacity>

        {/* 3. Indicador de Mesa */}
        <View className="mt-5 w-full rounded-xl bg-black/30 p-3 text-center">
          <Text className="text-center text-xs text-amber-200">
            {mesaAsignada
              ? `Mesa asignada ID: ${mesaAsignada}`
              : "⏳ Esperando que el metre te asigne una mesa libre..."}
          </Text>
        </View>

        {/* Botón Salir con confirmación y borrado en cascada */}
        <TouchableOpacity onPress={handleSalir} disabled={saliendo} className="mt-6 py-2">
          {saliendo ? (
            <ActivityIndicator size="small" color="#D8572A" />
          ) : (
            <Text className="text-xs text-terracota underline">Salir del local</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal Cámara QR */}
      <Modal visible={escaneandoQR} animationType="slide">
        <View className="flex-1 bg-black">
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={handleBarcodeScanned}
          />
          <TouchableOpacity
            onPress={() => setEscaneandoQR(false)}
            className="absolute bottom-10 self-center rounded-full bg-vino px-8 py-3"
          >
            <Text className="font-bold text-mostaza">Cancelar</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Modal Encuestas Previas */}
      <Modal visible={modalEncuestas} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/70 px-6">
          <View className="w-full max-w-sm rounded-2xl bg-vino p-5 border border-mostaza">
            <Text style={{ fontFamily: "LaOriental" }} className="text-lg text-mostaza text-center mb-3">
              Resultados de Encuestas
            </Text>
            <Text className="text-xs text-amber-100 mb-2">⭐ Calificación de comida: 4.8 / 5</Text>
            <Text className="text-xs text-amber-100 mb-2">⚡ Rapidez de atención: 4.6 / 5</Text>
            <Text className="text-xs text-amber-100 mb-4">🪑 Comodidad del salón: 4.9 / 5</Text>

            <TouchableOpacity
              onPress={() => setModalEncuestas(false)}
              className="rounded-xl bg-mostaza py-2"
            >
              <Text className="text-center font-bold text-vino">Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}