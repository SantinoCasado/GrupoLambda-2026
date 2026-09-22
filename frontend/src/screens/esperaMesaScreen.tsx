import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Modal,
  ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { supabase } from "../config/supabase";
import { eliminarClienteAnonimo, ingresarAListaEsperaLocal } from "../services/clienteAnonimoService";

interface Props {
  cliente: {
    id: string;
    user_id?: string;
    client_name: string;
    client_photo: string;
    status: string;
  };
  onSalir: () => void;
  onMesaConfirmada?: (numeroMesa: number) => void;
}

interface ModalMensajeInfo {
  visible: boolean;
  titulo: string;
  descripcion: string;
  tipo: "exito" | "error" | "info";
  icono: string;
}

export function EsperaMesaScreen({ cliente, onSalir, onMesaConfirmada }: Props) {
  const [escaneandoQR, setEscaneandoQR] = useState(false);
  const [modoEscaneo, setModoEscaneo] = useState<"entrada" | "mesa">("entrada");
  const [qrEntradaEscaneado, setQrEntradaEscaneado] = useState(false);
  const [mesaAsignada, setMesaAsignada] = useState<{ id: string; numero: number } | null>(null);
  const [waitingListId, setWaitingListId] = useState<string | null>(null);


  // Modales
  const [modalEncuestas, setModalEncuestas] = useState(false);
  const [modalSalir, setModalSalir] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const [modalCancelado, setModalCancelado] = useState(false);
  const [modalMensaje, setModalMensaje] = useState<ModalMensajeInfo>({
    visible: false,
    titulo: "",
    descripcion: "",
    tipo: "info",
    icono: "ℹ️",
  });

  const [permission, requestPermission] = useCameraPermissions();
  const scanLockRef = useRef(false);

  const mostrarMensaje = (
    titulo: string,
    descripcion: string,
    tipo: "exito" | "error" | "info" = "info",
    icono: string = "ℹ️"
  ) => {
    setModalMensaje({
      visible: true,
      titulo,
      descripcion,
      tipo,
      icono,
    });
  };

  // Suscripción Realtime: se activa al escanear la entrada y obtener el id en waiting_list
  useEffect(() => {
    if (!waitingListId) return;

    const canal = supabase
      .channel(`espera_${waitingListId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "waiting_list",
          filter: `id=eq.${waitingListId}`,
        },
        async (payload: any) => {
          const nuevo = payload.new;
          if (nuevo?.assigned_table_id) {
            const { data: mesaData } = await supabase
              .from("restaurant_tables")
              .select("table_number")
              .eq("id", nuevo.assigned_table_id)
              .single();

            const num = mesaData?.table_number ?? 1;
            setMesaAsignada({ id: nuevo.assigned_table_id, numero: num });

            mostrarMensaje(
              "¡Mesa Asignada!",
              `El metre te asignó la Mesa #${num}. Por favor, escaneá el QR ubicado en tu mesa para sentarte.`,
              "exito",
              "🍽️"
            );
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "waiting_list",
          filter: `id=eq.${waitingListId}`,
        },
        () => {
          setModalCancelado(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [waitingListId]);

  const abrirEscaner = async (tipo: "entrada" | "mesa") => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        mostrarMensaje(
          "Permiso Denegado",
          "Se necesita acceso a la cámara para escanear los códigos QR del local.",
          "error",
          "📷"
        );
        return;
      }
    }
    setModoEscaneo(tipo);
    scanLockRef.current = false;
    setEscaneandoQR(true);
  };

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanLockRef.current) return;
    scanLockRef.current = true;
    setEscaneandoQR(false);

    if (modoEscaneo === "entrada") {
      if (
        data.includes("INGRESO_LOCAL") ||
        data.toLowerCase().includes("ingreso") ||
        data.toLowerCase().includes("entrada")
      ) {
        // Impacta en waiting_list al escanear el qr
        const res = await ingresarAListaEsperaLocal(
          cliente.user_id || cliente.id,
          cliente.client_name,
          cliente.client_photo
        );

        if (res.exito && res.waitingId) {
          setWaitingListId(res.waitingId);
          setQrEntradaEscaneado(true);
          mostrarMensaje(
            "¡Ingreso Confirmado!",
            "Escaneaste el QR de la puerta. Ya figurás en la lista de espera del metre.",
            "exito",
            "🍜"
          );
        } else {
          mostrarMensaje(
            "Error al ingresar",
            res.error || "No se pudo registrar en la lista de espera.",
            "error",
            "⚠️"
          );
        }
      } else {
        mostrarMensaje(
          "QR Incorrecto",
          "El código escaneado no corresponde al ingreso del local.",
          "error",
          "⚠️"
        );
      }
    } else if (modoEscaneo === "mesa") {
      if (!mesaAsignada) {
        mostrarMensaje(
          "Sin Mesa Asignada",
          "Aún no tenés una mesa asignada por el metre.",
          "error",
          "🚫"
        );
        return;
      }

      const qrEsperado = `RESTO-TFI-MESA-${mesaAsignada.numero}`;

      if (data.trim() === qrEsperado) {
        mostrarMensaje(
          "¡Mesa Vinculada!",
          `Te has ubicado en tu Mesa #${mesaAsignada.numero} correctamente. Ya podés ver la carta y ordenar.`,
          "exito",
          "✨"
        );
        if (onMesaConfirmada) {
          onMesaConfirmada(mesaAsignada.numero);
        }
      } else {
        mostrarMensaje(
          "Mesa Incorrecta",
          `Esta no es tu mesa. Tu mesa asignada es la #${mesaAsignada.numero}.`,
          "error",
          "❌"
        );
      }
    }
  };

  const confirmarSalida = async () => {
    setSaliendo(true);
    try {
      const targetUserId = cliente.user_id || cliente.id;

      // 1. Si tenía mesa asignada, la vuelve a poner como libre ('free')
      if (mesaAsignada?.id) {
        await supabase
          .from("restaurant_tables")
          .update({ availability: "free" })
          .eq("id", mesaAsignada.id);
      }

      // 2. Si tenía entrada en waiting_list, la borra
      if (waitingListId) {
        await supabase.from("waiting_list").delete().eq("id", waitingListId);
      }

      // 3. Borra el usuario anónimo
      if (targetUserId) {
        await eliminarClienteAnonimo(targetUserId, cliente.client_photo);
      }
    } catch (err: any) {
      console.warn("Error al salir y liberar mesa:", err.message);
    } finally {
      setSaliendo(false);
      setModalSalir(false);
      onSalir();
    }
  };

  return (
    <View className="flex-1 justify-center px-6 pt-12">
      <View className="items-center rounded-3xl border border-mostaza/40 bg-vino/90 p-6 shadow-2xl">
        {/* Foto y Nombre */}
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
          Estado: {mesaAsignada ? `Mesa #${mesaAsignada.numero} Asignada` : "En lista de espera"}
        </Text>

        <View className="my-5 w-full border-t border-mostaza/20" />

        {/* 1. Botón QR Entrada */}
        {!qrEntradaEscaneado ? (
          <TouchableOpacity
            onPress={() => abrirEscaner("entrada")}
            className="w-full flex-row items-center justify-center rounded-2xl bg-calabaza py-3.5 shadow-md active:bg-calabaza/80"
          >
            <Text className="mr-2 text-xl">📷</Text>
            <Text style={{ fontFamily: "LaOriental" }} className="text-sm uppercase text-white">
              Escanear QR de Entrada
            </Text>
          </TouchableOpacity>
        ) : (
          <View className="w-full items-center rounded-2xl bg-emerald-950/60 p-3 border border-emerald-500/40">
            <Text className="text-emerald-400 font-bold text-center text-xs">
              ✓ Ingreso confirmado en puerta
            </Text>
          </View>
        )}

        {/* 2. Botón QR Mesa (Se activa si el Metre le asignó mesa) */}
        {mesaAsignada && (
          <TouchableOpacity
            onPress={() => abrirEscaner("mesa")}
            className="mt-3 w-full flex-row items-center justify-center rounded-2xl bg-emerald-600 py-3.5 shadow-md active:bg-emerald-700"
          >
            <Text className="mr-2 text-xl">🪑</Text>
            <Text style={{ fontFamily: "LaOriental" }} className="text-sm uppercase text-white">
              Escanear Mesa #{mesaAsignada.numero}
            </Text>
          </TouchableOpacity>
        )}

        {/* 3. Encuestas previas */}
        <TouchableOpacity
          onPress={() => setModalEncuestas(true)}
          className="mt-3 w-full flex-row items-center justify-center rounded-2xl border border-mostaza/60 bg-vino py-3"
        >
          <Text className="mr-2 text-base">📊</Text>
          <Text style={{ fontFamily: "LaOriental" }} className="text-sm uppercase text-mostaza">
            Ver Encuestas Previas
          </Text>
        </TouchableOpacity>

        {/* Estado actual */}
        <View className="mt-5 w-full rounded-xl bg-black/30 p-3">
          <Text className="text-center text-xs text-amber-200">
            {mesaAsignada
              ? `Mesa asignada: #${mesaAsignada.numero}. Por favor, escaneá su código QR para sentarte.`
              : qrEntradaEscaneado
              ? "⏳ Esperando asignación de mesa por el metre..."
              : "Escaneá el QR de la entrada para notificar tu llegada."}
          </Text>
        </View>

        {/* Salir */}
        <TouchableOpacity
          onPress={() => setModalSalir(true)}
          className="mt-6 py-2"
        >
          <Text className="text-xs text-terracota underline">Salir del local</Text>
        </TouchableOpacity>
      </View>

      {/* MODAL INFORMATIVO PERSONALIZADO (Reemplazo de Alert) */}
      <Modal visible={modalMensaje.visible} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/75 px-6">
          <View className="w-full max-w-sm rounded-3xl border border-mostaza/50 bg-vino p-6 shadow-2xl">
            <Text className="text-center text-4xl">{modalMensaje.icono}</Text>
            <Text
              style={{ fontFamily: "LaOriental" }}
              className="mt-2 text-center text-xl text-mostaza"
            >
              {modalMensaje.titulo}
            </Text>
            <Text className="mt-2 text-center text-xs text-amber-100/90 leading-relaxed">
              {modalMensaje.descripcion}
            </Text>

            <TouchableOpacity
              onPress={() => setModalMensaje((prev) => ({ ...prev, visible: false }))}
              className={`mt-6 rounded-xl py-3 ${
                modalMensaje.tipo === "error" ? "bg-terracota" : "bg-mostaza"
              }`}
            >
              <Text
                className={`text-center text-xs font-bold uppercase ${
                  modalMensaje.tipo === "error" ? "text-white" : "text-vino"
                }`}
              >
                Entendido
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL SALIR */}
      <Modal visible={modalSalir} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/75 px-6">
          <View className="w-full max-w-sm rounded-3xl border border-mostaza/50 bg-vino p-6 shadow-2xl">
            <Text className="text-center text-3xl">🚪</Text>
            <Text
              style={{ fontFamily: "LaOriental" }}
              className="mt-2 text-center text-xl text-mostaza"
            >
              ¿Abandonar lista?
            </Text>
            <Text className="mt-2 text-center text-xs text-amber-100/80 leading-relaxed">
              Al salir del local se cancelará tu turno de espera y se eliminarán tus datos temporales.
            </Text>

            <View className="mt-6 flex-row gap-3">
              <TouchableOpacity
                disabled={saliendo}
                onPress={() => setModalSalir(false)}
                className="flex-1 rounded-xl border border-mostaza/40 bg-black/30 py-3"
              >
                <Text className="text-center text-xs font-semibold text-amber-200">
                  Volver
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={saliendo}
                onPress={confirmarSalida}
                className="flex-1 items-center justify-center rounded-xl bg-terracota py-3 shadow"
              >
                {saliendo ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-center text-xs font-bold uppercase text-white">
                    Sí, salir
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL CÁMARA */}
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
            className="absolute bottom-10 self-center rounded-full bg-vino px-8 py-3 border border-mostaza"
          >
            <Text className="font-bold text-mostaza">Cancelar</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* MODAL TURNO CANCELADO POR EL METRE */}
      <Modal visible={modalCancelado} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/80 px-6">
          <View className="w-full max-w-sm rounded-3xl border border-terracota/60 bg-vino p-6 shadow-2xl">
            <Text className="text-center text-4xl">🚫</Text>
            <Text
              style={{ fontFamily: "LaOriental" }}
              className="mt-2 text-center text-xl text-mostaza"
            >
              Turno Cancelado
            </Text>
            <Text className="mt-2 text-center text-xs text-amber-100/90 leading-relaxed">
              El metre ha quitado tu lugar de la lista de espera. Si considerás que fue un error o deseás ingresar nuevamente, podés registrarte otra vez.
            </Text>

            <TouchableOpacity
              onPress={() => {
                setModalCancelado(false);
                onSalir(); // Regresa al login/inicio
              }}
              className="mt-6 rounded-xl bg-terracota py-3 shadow"
            >
              <Text className="text-center text-xs font-bold uppercase text-white">
                Volver al Inicio
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL RESULTADOS ENCUESTAS */}
      <Modal visible={modalEncuestas} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/75 px-6">
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