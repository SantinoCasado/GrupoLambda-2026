import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Modal,
  ImageSourcePropType,
  LayoutChangeEvent,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../config/supabase";
import { eliminarClienteAnonimo, ingresarAListaEsperaLocal } from "../services/clienteAnonimoService";
import { checkInReservaApi } from "../services/reservaService";
import { ChineseFrame } from "../components/ChineseFrame";
import { ConfirmModal } from "../components/ConfirmModal";
import { FeedbackModal } from "../components/FeedbackModal";
import { CompanySpinner } from "../components/CompanySpinner";
import ScreenBackground from "../components/ScreenBackground";
import { EstadisticasScreen } from "./estadisticasScreen";

interface Props {
  cliente: {
    id: string;
    user_id?: string;
    client_name: string;
    client_photo: string;
    status: string;
  };
  esClienteRegistrado?: boolean;
  onIrAReservar?: () => void;
  onSalir: () => void;
  onMesaConfirmada?: (numeroMesa: number) => void | Promise<void>;
}

interface ModalMensajeInfo {
  visible: boolean;
  titulo: string;
  descripcion: string;
  tipo: "exito" | "error" | "informacion";
  iconoImagen?: ImageSourcePropType;
}

export function EsperaMesaScreen({
  cliente,
  esClienteRegistrado = false,
  onIrAReservar,
  onSalir,
  onMesaConfirmada,
}: Props) {
  const insets = useSafeAreaInsets();
  const [escaneandoQR, setEscaneandoQR] = useState(false);
  const [modoEscaneo, setModoEscaneo] = useState<"entrada" | "mesa">("entrada");
  const [qrEntradaEscaneado, setQrEntradaEscaneado] = useState(false);
  const [mesaAsignada, setMesaAsignada] = useState<{ id: string; numero: number } | null>(null);
  const [waitingListId, setWaitingListId] = useState<string | null>(null);

  const [altoArea, setAltoArea] = useState(0);
  const ALTO_REFERENCIA = 560;

  const onLayoutArea = (e: LayoutChangeEvent) => {
    const { height } = e.nativeEvent.layout;
    if (height > 0 && Math.abs(height - altoArea) > 1) setAltoArea(height);
  };

  const area = altoArea || ALTO_REFERENCIA;
  const k = Math.min(1.3, Math.max(0.6, area / ALTO_REFERENCIA));
  const px = (base: number, tope: number) => Math.round(Math.min(base * k, area * tope));

  // Modales
  const [modalEncuestas, setModalEncuestas] = useState(false);
  const [modalSalir, setModalSalir] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const [procesandoQR, setProcesandoQR] = useState(false);
  const [modalCancelado, setModalCancelado] = useState(false);
  const [modalMensaje, setModalMensaje] = useState<ModalMensajeInfo>({
    visible: false,
    titulo: "",
    descripcion: "",
    tipo: "informacion",
  });

  const [permission, requestPermission] = useCameraPermissions();
  const scanLockRef = useRef(false);
  const salidaVoluntariaRef = useRef(false);

  const mostrarMensaje = (
    titulo: string,
    descripcion: string,
    tipo: "exito" | "error" | "informacion" = "informacion",
    iconoImagen?: ImageSourcePropType
  ) => {
    setModalMensaje({
      visible: true,
      titulo,
      descripcion,
      tipo,
      iconoImagen,
    });
  };

  const reanunciarse = () => {
    salidaVoluntariaRef.current = false;
    setModalCancelado(false);
    setQrEntradaEscaneado(false);
    setWaitingListId(null);
    setMesaAsignada(null);
    setModoEscaneo("entrada");
  };

  // Suscripción Realtime
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
              `El metre le asignó la Mesa #${num}. Por favor, escanee el QR ubicado en su mesa para ver el menú.`,
              "exito",
              require("../../assets/images/food-w.png")
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
          if (salidaVoluntariaRef.current) return;
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
          "error"
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
    setProcesandoQR(true);

    try {
      const textoLimpio = data.trim().toUpperCase();

      // Punto 26: Si es cliente registrado y escanea un QR de mesa directamente sin pasar por entrada
      const esQrMesa = textoLimpio.includes("MESA") || /^[0-9a-fA-F-]{36}$/.test(data.trim());

      if (modoEscaneo === "entrada" && esQrMesa && esClienteRegistrado) {
        // Intentar resolver el UUID de la mesa para el check-in
        let tableIdParaCheckIn = data.trim();
        const matchNum = textoLimpio.match(/\d+/);

        if (matchNum) {
          const numMesa = parseInt(matchNum[0], 10);
          const { data: mesaRow } = await supabase
            .from("restaurant_tables")
            .select("id, table_number")
            .eq("table_number", numMesa)
            .maybeSingle();

          if (mesaRow) tableIdParaCheckIn = mesaRow.id;
        }

        const checkIn = await checkInReservaApi(tableIdParaCheckIn);
        if (checkIn.ok && checkIn.mesa) {
          mostrarMensaje(
            "¡Reserva Confirmada!",
            checkIn.mensaje || `Bienvenido a la mesa N° ${checkIn.mesa.table_number}.`,
            "exito"
          );
          await onMesaConfirmada?.(Number(checkIn.mesa.table_number));
          return;
        } else if (
          checkIn.error?.includes("Esta no es tu mesa") ||
          checkIn.error?.includes("Podés ingresar desde") ||
          checkIn.error?.includes("ocupada")
        ) {
          mostrarMensaje("Aviso de Reserva", checkIn.error, "error");
          return;
        }
      }

      if (modoEscaneo === "entrada") {
        if (
          data.includes("INGRESO_LOCAL") ||
          data.toLowerCase().includes("ingreso") ||
          data.toLowerCase().includes("entrada")
        ) {
          if (qrEntradaEscaneado) {
            setModalEncuestas(true);
            return;
          }

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
              "exito"
            );
          } else {
            mostrarMensaje(
              "Error al ingresar",
              res.error || "No se pudo registrar en la lista de espera.",
              "error"
            );
          }
        } else {
          mostrarMensaje(
            "QR Incorrecto",
            "El código escaneado no corresponde al ingreso del local ni a una mesa con reserva.",
            "error"
          );
        }
      } else if (modoEscaneo === "mesa") {
        if (!mesaAsignada) {
          mostrarMensaje(
            "Sin Mesa Asignada",
            "Aún no tenés una mesa asignada por el metre.",
            "error"
          );
          return;
        }

        const numMesaAsignada = Number(mesaAsignada.numero);
        const matchNumero = textoLimpio.match(/\d+/);
        const numeroDetectado = matchNumero ? parseInt(matchNumero[0], 10) : null;

        const esValido =
          textoLimpio === `RESTO-TFI-MESA-${numMesaAsignada}` ||
          textoLimpio.includes(`MESA-${numMesaAsignada}`) ||
          textoLimpio.includes(`MESA ${numMesaAsignada}`) ||
          numeroDetectado === numMesaAsignada;

        if (esValido) {
          await onMesaConfirmada?.(numMesaAsignada);
        } else {
          mostrarMensaje(
            "Mesa Incorrecta",
            `Esta no es tu mesa (leído: ${numeroDetectado ?? "desconocido"}). Tu mesa asignada es la #${numMesaAsignada}.`,
            "error"
          );
        }
      }
    } catch (err: any) {
      console.warn("⚠️ [EsperaMesa] Error al procesar el QR:", err?.message);
      mostrarMensaje(
        "Error al escanear",
        err?.message || "No se pudo completar la operación. Intentá nuevamente.",
        "error"
      );
    } finally {
      setProcesandoQR(false);
    }
  };

  const confirmarSalida = async () => {
    salidaVoluntariaRef.current = true;
    setSaliendo(true);
    try {
      const targetUserId = cliente.user_id || cliente.id;

      if (mesaAsignada?.id) {
        await supabase
          .from("restaurant_tables")
          .update({ availability: "free" })
          .eq("id", mesaAsignada.id);
      }

      if (waitingListId) {
        await supabase.from("waiting_list").delete().eq("id", waitingListId);
      }

      if (targetUserId && !esClienteRegistrado) {
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
    <View className="flex-1 pt-4">
      {/* Salir / Volver */}
      <TouchableOpacity
        onPress={() => setModalSalir(true)}
        className="absolute right-4 z-10 rounded-xl border border-mostaza bg-vino p-2.5"
        style={{ top: insets.top + 20 }}
      >
        <Image
          source={require("../../assets/images/exit-door-y.png")}
          className="h-6 w-6"
          resizeMode="contain"
        />
      </TouchableOpacity>

      {/* Cabecera */}
      <View className="flex-1 mt-20">
        <View className="mb-2">
          <Image
            source={require("../../assets/images/logo-name.png")}
            className="h-20 w-auto self-center"
            resizeMode="contain"
          />
          <Image
            source={require("../../assets/images/separator.png")}
            className="my-2 h-6 w-full"
            resizeMode="contain"
          />
        </View>

        <View className="flex-1 px-6" onLayout={onLayoutArea}>
          <ChineseFrame className="bg-vino/90 shadow-2xl" color="#f7b538">
            <View className="items-center p-5">
              {cliente?.client_photo ? (
                <Image
                  source={{ uri: cliente.client_photo }}
                  className="h-20 w-20 rounded-full border-2 border-mostaza"
                />
              ) : (
                <Image
                  source={require("../../assets/images/no-photo.jpg")}
                  className="h-20 w-20 rounded-full border-2 border-mostaza"
                  resizeMode="cover"
                />
              )}
              <Text style={{ fontFamily: "LaOriental" }} className="mt-2 text-2xl text-mostaza">
                Hola, {cliente?.client_name || "Invitado"}
              </Text>
              <Text className="text-center text-xs text-amber-100/70 mt-0.5">
                Estado: {mesaAsignada ? `Mesa #${mesaAsignada.numero} Asignada` : "En puerta / espera"}
              </Text>

              {/* Estado actual */}
              <View className="mt-2.5 w-full rounded-xl bg-[#FAE9DF] p-2.5">
                <View className="flex-row items-center justify-center">
                  {qrEntradaEscaneado && !mesaAsignada && (
                    <Image
                      source={require("../../assets/images/sand-clock-cal.png")}
                      className="mr-2 h-4 w-4"
                      resizeMode="contain"
                    />
                  )}
                  <Text className="text-center text-xs text-calabaza font-semibold">
                    {mesaAsignada
                      ? `Mesa asignada: #${mesaAsignada.numero}. Escanee su código QR.`
                      : qrEntradaEscaneado
                      ? "Esperando asignación de mesa por parte del metre..."
                      : "Escanee el QR de entrada o agende una reserva para otro día."}
                  </Text>
                </View>
              </View>

              <View className="my-3 w-full border-t border-mostaza/20" />

              {/* 1. Botón QR Entrada */}
              {!qrEntradaEscaneado && (
                <View className="w-full gap-y-3">
                  <TouchableOpacity
                    onPress={() => abrirEscaner("entrada")}
                    className="w-full items-center justify-center rounded-2xl bg-mostaza py-3 active:bg-mostaza/80 shadow"
                    style={{ minHeight: px(120, 0.28) }}
                  >
                    <Image
                      source={require("../../assets/images/camera-v.png")}
                      className="h-16 w-16 mb-1"
                      resizeMode="contain"
                    />
                    <Text style={{ fontFamily: "LaOriental" }} className="text-2xl text-vino">
                      Escanear QR
                    </Text>
                    <Text className="text-[11px] text-stone-800 font-semibold mt-0.5">
                      Ingresar a lista de espera
                    </Text>
                  </TouchableOpacity>

                  {/* 2. Botón Agendar Reserva (Punto 24 - Solo clientes registrados) */}
                  {esClienteRegistrado && onIrAReservar && (
                    <TouchableOpacity
                      onPress={onIrAReservar}
                      className="w-full items-center justify-center rounded-2xl border-2 border-mostaza bg-vino/60 py-3 active:bg-vino shadow"
                      style={{ minHeight: px(90, 0.22) }}
                    >
                      <View className="flex-row items-center gap-2">
                        <Image
                          source={require("../../assets/images/serving-y.png")}
                          className="h-8 w-8"
                          resizeMode="contain"
                        />
                        <Text style={{ fontFamily: "LaOriental" }} className="text-xl text-mostaza uppercase">
                          Agendar Reserva
                        </Text>
                      </View>
                      <Text className="text-[11px] text-amber-100 font-medium mt-1">
                        Reservar una mesa para una fecha futura
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* 3. Confirmación de ingreso en puerta */}
              {qrEntradaEscaneado && !mesaAsignada && (
                <View
                  className="w-full gap-1 items-center rounded-2xl bg-emerald-950/60 p-3 border border-emerald-500/40"
                  style={{ minHeight: px(110, 0.28) }}
                >
                  <Text className="text-emerald-400 font-bold text-center text-4xl">✓</Text>
                  <Text className="text-emerald-400 font-bold text-center uppercase text-base">
                    Ingreso confirmado en puerta
                  </Text>
                  <Text className="text-emerald-200 text-center text-xs">
                    El metre te asignará una mesa a la brevedad
                  </Text>
                </View>
              )}

              {/* 4. Botón QR Mesa Asignada */}
              {mesaAsignada && (
                <TouchableOpacity
                  onPress={() => abrirEscaner("mesa")}
                  className="mt-2 w-full items-center justify-center rounded-2xl bg-emerald-600 py-3 shadow-md active:bg-emerald-700"
                  style={{ minHeight: px(120, 0.3) }}
                >
                  <Image
                    source={require("../../assets/images/table-w.png")}
                    className="h-16 w-16"
                    resizeMode="contain"
                  />
                  <Text style={{ fontFamily: "LaOriental" }} className="text-xl text-center uppercase text-white mt-1">
                    Escanear QR Mesa #{mesaAsignada.numero}
                  </Text>
                </TouchableOpacity>
              )}

              {/* 5. Estadísticas */}
              {qrEntradaEscaneado && (
                <TouchableOpacity
                  onPress={() => setModalEncuestas(true)}
                  className="mt-3 w-full flex-row items-center justify-center rounded-2xl border border-mostaza/60 bg-vino py-3 px-4 shadow active:bg-terracota/30"
                >
                  <Image
                    source={require("../../assets/images/rating-y.png")}
                    className="h-5 w-10 mr-3"
                    resizeMode="contain"
                  />
                  <Text
                    style={{ fontFamily: "LaOriental" }}
                    className="text-sm text-mostaza tracking-wide uppercase"
                  >
                    Ver Reseñas
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </ChineseFrame>
        </View>

        {/* Modales */}
        <FeedbackModal
          visible={modalMensaje.visible}
          tipo={modalMensaje.tipo}
          titulo={modalMensaje.titulo}
          mensaje={modalMensaje.descripcion}
          iconoImagen={modalMensaje.iconoImagen}
          onClose={() => setModalMensaje((prev) => ({ ...prev, visible: false }))}
        />

        <ConfirmModal
          visible={modalSalir && !saliendo}
          titulo="¿Abandonar lista?"
          mensaje="Al salir del local se cancelará su turno de espera y deberá volver a hacer la fila."
          textoConfirmar="Sí, salir"
          textoCancelar="Volver"
          cargando={saliendo}
          tipo="peligro"
          onConfirm={confirmarSalida}
          onCancel={() => setModalSalir(false)}
        />

        <CompanySpinner
          visible={saliendo || procesandoQR}
          mensaje={
            saliendo
              ? "Saliendo del local..."
              : modoEscaneo === "entrada"
              ? "Procesando código QR..."
              : "Verificando tu mesa..."
          }
        />

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
              className="absolute right-4 top-12 rounded-md bg-vino px-4 py-3 border border-mostaza"
            >
              <Text style={{ fontFamily: "LaOriental" }} className="text-mostaza">
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </Modal>

        <Modal visible={modalCancelado} transparent animationType="fade">
          <View className="flex-1 items-center justify-center bg-black/80 px-6">
            <View className="w-full max-w-sm rounded-3xl border border-terracota/60 bg-vino p-6 shadow-2xl">
              <Image
                source={require("../../assets/images/reject-y.png")}
                className="mx-auto mb-1 h-14 w-14"
                resizeMode="contain"
              />
              <Text style={{ fontFamily: "LaOriental" }} className="mt-2 text-center text-xl text-mostaza">
                Turno Cancelado
              </Text>
              <Text className="mt-2 text-center text-xs text-amber-100/90 leading-relaxed">
                Te sacaron de la lista de espera. Si considerás que fue un error o deseás ingresar nuevamente, podés anunciarte otra vez.
              </Text>
              <TouchableOpacity
                onPress={reanunciarse}
                className="mt-6 items-center rounded-xl bg-mostaza py-3 shadow"
              >
                <Text style={{ fontFamily: "LaOriental" }} className="text-center text-sm uppercase text-vino">
                  Reanunciarse
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setModalCancelado(false);
                  onSalir();
                }}
                className="mt-3 rounded-xl border border-terracota bg-vino py-3 shadow"
              >
                <Text style={{ fontFamily: "LaOriental" }} className="text-center text-xs uppercase text-mostaza">
                  Volver al Inicio
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          visible={modalEncuestas}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setModalEncuestas(false)}
        >
          <View className="flex-1">
            <ScreenBackground />
            <TouchableOpacity
              onPress={() => setModalEncuestas(false)}
              className="absolute right-4 z-10 rounded-lg border border-mostaza bg-vino px-3 py-1 active:bg-vino/80"
              style={{ top: insets.top + 20 }}
            >
              <Text style={{ fontFamily: "LaOriental" }} className="text-sm mt-1 uppercase tracking-wide text-mostaza">
                Volver
              </Text>
            </TouchableOpacity>
            <EstadisticasScreen onVolver={() => setModalEncuestas(false)} esModal={true} />
          </View>
        </Modal>
      </View>
    </View>
  );
}