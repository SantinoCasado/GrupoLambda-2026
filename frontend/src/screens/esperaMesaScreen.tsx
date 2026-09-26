import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Modal,
  ImageSourcePropType,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../config/supabase";
import { eliminarClienteAnonimo, ingresarAListaEsperaLocal } from "../services/clienteAnonimoService";
import { ChineseFrame } from "../components/ChineseFrame";
import { ConfirmModal } from "../components/ConfirmModal";
import { FeedbackModal } from "../components/FeedbackModal";
import { CompanySpinner } from "../components/CompanySpinner";

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
  tipo: "exito" | "error" | "informacion";
  iconoImagen?: ImageSourcePropType;
}

export function EsperaMesaScreen({ cliente, onSalir, onMesaConfirmada }: Props) {
  const insets = useSafeAreaInsets();
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
    tipo: "informacion",
  });

  const [permission, requestPermission] = useCameraPermissions();
  const scanLockRef = useRef(false);

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
    setModalCancelado(false);
    setQrEntradaEscaneado(false);
    setWaitingListId(null);
    setMesaAsignada(null);
    setModoEscaneo("entrada");
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
              `El metre te asignó la Mesa #${num}. Por favor, escaneá el QR ubicado en tu mesa para ver el menú.`,
              "exito",
              require("../../assets/images/food-y.png")
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
          if (res.notificado === false) {
            mostrarMensaje(
              "Ingreso Registrado",
              "Ya figurás en la lista de espera, pero no pudimos avisarle al metre por push. Avisale en la puerta.",
              "error"
            );
          } else {
            mostrarMensaje(
              "¡Ingreso Confirmado!",
              "Escaneaste el QR de la puerta. Ya figurás en la lista de espera del metre.",
              "exito"
            );
          }
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
          "El código escaneado no corresponde al ingreso del local.",
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

      const qrEsperado = `RESTO-TFI-MESA-${mesaAsignada.numero}`;

      if (data.trim() === qrEsperado) {
        // QR correcto → redirige al home directo (registrado o anónimo)
        if (onMesaConfirmada) {
          onMesaConfirmada(mesaAsignada.numero);
        }
      } else {
        mostrarMensaje(
          "Mesa Incorrecta",
          `Esta no es tu mesa. Tu mesa asignada es la #${mesaAsignada.numero}.`,
          "error"
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
    <View className="flex-1 pt-4" style={{ paddingTop: insets.top + 4 }}>
      {/* Nombres del equipo */}
      <View className="absolute right-4 z-10 items-end" style={{ top: insets.top + 75 }}>
        <Text className="text-[10px] text-vino/70">Rocío Sanchez</Text>
        <Text className="text-[10px] text-vino/70">Santino Casado</Text>
        <Text className="text-[10px] text-vino/70">Sebastián Andreozzi</Text>
        <Text className="text-[10px] text-vino/70">Valentín Brazanovich</Text>
      </View>

      {/* Salir del local */}
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
      <View className="absolute left-0 right-0 px-5 pt-24">
        <View className="mb-4">
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
      </View>

      <View className="flex-1 justify-center px-6">
      <ChineseFrame className="bg-vino/90 shadow-2xl" color="#f7b538">
      <View className="items-center p-6">
        {/* Foto y Nombre */}
        {cliente?.client_photo ? (
          <Image
            source={{ uri: cliente.client_photo }}
            className="h-24 w-24 rounded-full border-2 border-mostaza"
          />
        ) : (
          <Image
            source={require("../../assets/images/no-photo.jpg")}
            className="h-24 w-24 rounded-full border-2 border-mostaza"
            resizeMode="cover"
          />
        )}
        <Text style={{ fontFamily: "LaOriental" }} className="mt-3 text-2xl text-mostaza">
          Hola, {cliente?.client_name || "Invitado"}
        </Text>
        <Text className="text-center text-xs text-amber-100/70 mt-1">
          Estado: {mesaAsignada ? `Mesa #${mesaAsignada.numero} Asignada` : "En lista de espera"}
        </Text>

        {/* Estado actual */}
        <View className="mt-3 w-full rounded-xl bg-[#FAE9DF] p-3">
          <View className="flex-row items-center justify-center">
            {qrEntradaEscaneado && !mesaAsignada && (
              <Image
                source={require("../../assets/images/sand-clock-cal.png")}
                className="mr-2 h-4 w-4"
                resizeMode="contain"
              />
            )}
            <Text className="text-center text-xs text-calabaza">
              {mesaAsignada
                ? `Mesa asignada: #${mesaAsignada.numero}. Por favor, escaneá su código QR para ver el menú.`
                : qrEntradaEscaneado
                ? "Esperando asignación de mesa..."
                : "Escaneá el QR de la entrada para anunciar tu llegada."}
            </Text>
          </View>
        </View>

        <View className="my-5 w-full border-t border-mostaza/20" />

        {/* 1. Botón QR Entrada */}
        {!qrEntradaEscaneado ? (
          <TouchableOpacity
            onPress={() => abrirEscaner("entrada")}
            className="w-full flex-row item-center justify-center rounded-2xl bg-mostaza py-3.5 active:bg-mostaza/80"
          >
            <Image
              source={require("../../assets/images/camera-v.png")}
              className="mr-2 h-5 w-5"
              resizeMode="contain"
              style={{ transform: [{ translateY: -3 }] }}
            />
            <Text style={{ fontFamily: "LaOriental" }} className="text-sm text-vino">
              Escanear QR
            </Text>
          </TouchableOpacity>
        ) : /*Capaz que lo saco*/ (
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
            <Image
              source={require("../../assets/images/table-w.png")}
              className="mr-2 h-6 w-6"
              resizeMode="contain"
            />
            <Text style={{ fontFamily: "LaOriental" }} className="text-sm uppercase text-white">
              Escanear QR en la Mesa #{mesaAsignada.numero}
            </Text>
          </TouchableOpacity>
        )}

        {/* 3. Encuestas previas */}
        <TouchableOpacity
          onPress={() => setModalEncuestas(true)}
          className="mt-5 w-full flex-row items-center justify-center rounded-2xl border border-mostaza/60 bg-vino py-3"
        >
          <Image
              source={require("../../assets/images/rating-y.png")}
              className="mr-2 h-5 w-5"
              resizeMode="contain"
              style={{ transform: [{ translateY: -2 }] }}
            />
          <Text style={{ fontFamily: "LaOriental" }} className="text-sm text-mostaza">
            Ver reseñas
          </Text>
        </TouchableOpacity>

      </View>
      </ChineseFrame>

      {/* MODAL INFORMATIVO PERSONALIZADO (Reemplazo de Alert) */}
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

      <CompanySpinner visible={saliendo} mensaje="Saliendo del local..." />

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
            className="absolute right-4 top-12 rounded-md bg-vino px-4 py-3 border border-mostaza"
          >
            <Text style={{ fontFamily: "LaOriental" }} className="text-mostaza">Cancelar</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* MODAL TURNO CANCELADO POR EL METRE */}
      <Modal visible={modalCancelado} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/80 px-6">
          <View className="w-full max-w-sm rounded-3xl border border-terracota/60 bg-vino p-6 shadow-2xl">
            <Image
              source={require("../../assets/images/reject-y.png")}
              className="mx-auto mb-1 h-14 w-14"
              resizeMode="contain"
            />
            <Text
              style={{ fontFamily: "LaOriental" }}
              className="mt-2 text-center text-xl text-mostaza"
            >
              Turno Cancelado
            </Text>
            <Text className="mt-2 text-center text-xs text-amber-100/90 leading-relaxed">
              Te han quitado de la lista de espera. Si considerás que fue un error o deseás ingresar nuevamente, puedes anunciarte otra vez.
            </Text>

            <TouchableOpacity
              onPress={reanunciarse}
              className="mt-6 rounded-xl bg-mostaza py-3 shadow"
            >
              <Image
              source={require("../../assets/images/employeeRegistration-v.png")}
              className="mr-2 h-5 w-5"
              resizeMode="contain"
              style={{ transform: [{ translateY: -3 }] }}
            />
              <Text style={{ fontFamily: "LaOriental" }} className="text-center text-sm uppercase text-vino">
                Reanunciarse
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setModalCancelado(false);
                onSalir(); // Regresa al login/inicio
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

      {/* MODAL RESULTADOS ENCUESTAS */}
      <Modal visible={modalEncuestas} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/75 px-6">
          <View className="w-full max-w-sm rounded-2xl bg-vino p-5 border border-mostaza">
            <Text style={{ fontFamily: "LaOriental" }} className="text-lg text-mostaza text-center mb-3">
              Resultados de Encuestas
            </Text>
            <View className="mb-2 flex-row items-center">
              <Image source={require("../../assets/images/food-y.png")} className="mr-1 h-4 w-4" resizeMode="contain" />
              <Text className="text-sm text-amber-100">Sabor de la comida: 4.8 / 5</Text>
            </View>
            <View className="mb-2 flex-row items-center">
              <Image source={require("../../assets/images/serving-y.png")} className="mr-1 h-4 w-4" resizeMode="contain" />
              <Text className="text-sm text-amber-100">Calidad de atención: 4.6 / 5</Text>
            </View>
            <View className="mb-4 flex-row items-center">
              <Image source={require("../../assets/images/table-y.png")} className="mr-1 h-4 w-4" resizeMode="contain" />
              <Text className="text-sm text-amber-100">Comodidad del salón: 4.9 / 5</Text>
            </View>

            <TouchableOpacity
              onPress={() => setModalEncuestas(false)}
              className="self-center rounded bg-mostaza px-3 py-2"
            >
              <Text style={{ fontFamily: "LaOriental" }} className="text-center text-s text-vino">Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </View>
    </View>
  );
}