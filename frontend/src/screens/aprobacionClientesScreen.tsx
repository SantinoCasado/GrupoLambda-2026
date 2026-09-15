import React, { useState, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  Vibration,
  ActivityIndicator,
  Modal,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  ClientePendiente,
  obtenerClientesPendientes,
  responderSolicitudCliente,
} from "../services/aprobacionClientesService";
import { FeedbackModal } from "../components/FeedbackModal";
import { ChineseFrame } from "../components/ChineseFrame";

export default function AprobacionClientesScreen() {
  const [clientes, setClientes] = useState<ClientePendiente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  // Modal de confirmación previa a la acción
  const [confirmacion, setConfirmacion] = useState<{
    visible: boolean;
    cliente: ClientePendiente | null;
    accion: "aprobado" | "rechazado";
  }>({
    visible: false,
    cliente: null,
    accion: "aprobado",
  });

  // Modal de Feedback final
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

  const ejecutarVibracion = (tipo: "exito" | "error" | "toque") => {
    if (tipo === "error") Vibration.vibrate([0, 100, 50, 100]);
    else if (tipo === "exito") Vibration.vibrate([0, 80, 60, 150]);
    else Vibration.vibrate([0, 35]);
  };

  const cargarLista = async () => {
    setCargando(true);
    try {
      const data = await obtenerClientesPendientes();
      setClientes(data);
    } catch (err) {
      console.warn("Error cargando clientes:", err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarLista();
  }, []);

  const abrirConfirmacion = (cliente: ClientePendiente, accion: "aprobado" | "rechazado") => {
    ejecutarVibracion("toque");
    setConfirmacion({
      visible: true,
      cliente,
      accion,
    });
  };

  const ejecutarDecision = async () => {
    if (!confirmacion.cliente) return;
    const { id, nombres, apellidos } = confirmacion.cliente;
    const { accion } = confirmacion;

    setConfirmacion((prev) => ({ ...prev, visible: false }));
    setProcesandoId(id);

    // Optimistic UI: lo remueve inmediatamente de la lista
    setClientes((prev) => prev.filter((c) => c.id !== id));

    const res = await responderSolicitudCliente(id, accion);
    setProcesandoId(null);

    ejecutarVibracion(accion === "aprobado" ? "exito" : "error");

    setModalFeedback({
      visible: true,
      tipo: accion === "aprobado" ? "exito" : "informacion",
      titulo: accion === "aprobado" ? "Cliente Aprobado" : "Cliente Rechazado",
      mensaje: `${nombres} ${apellidos}: ${res.mensaje}`,
    });
  };

  return (
    <>
      <SafeAreaView className="flex-1">
        <StatusBar style="light" />

        {/* Nombres del equipo */}
        <View className="absolute right-4 z-10 items-end" style={{ top: insets.top + 16 }}>
          <Text className="text-[10px] text-vino/70">Rocío Sanchez</Text>
          <Text className="text-[10px] text-vino/70">Santino Casado</Text>
          <Text className="text-[10px] text-vino/70">Sebastián Andreozzi</Text>
          <Text className="text-[10px] text-vino/70">Valentín Brazanovich</Text>
        </View>

        {/* Cabecera idéntica a Alta Empleados */}
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
                <Text style={{ fontFamily: "LaOriental" }} className="text-xl text-mostaza uppercase">
                  Aprobación de Clientes
                </Text>
                <Text className="mt-1 text-xs font-semibold text-amber-100">
                  Pendientes: <Text className="font-extrabold text-mostaza uppercase">{clientes.length}</Text> • Dueño o Supervisor
                </Text>
              </View>
            </ChineseFrame>
          </View>
        </View>

        {/* Lista de Solicitudes */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 50, paddingTop: 6 }}
        >
          {cargando ? (
            <View className="py-20 items-center justify-center">
              <ActivityIndicator size="large" color="#8B1A1A" />
              <Text className="mt-3 text-xs font-bold text-vino">Cargando solicitudes...</Text>
            </View>
          ) : clientes.length === 0 ? (
            <View className="items-center justify-center rounded-2xl border border-dashed border-mostaza/60 bg-white/70 p-8 mt-6">
              <Text className="text-4xl mb-2">✨</Text>
              <Text
                style={{ fontFamily: "LaOriental" }}
                className="text-base uppercase text-vino text-center"
              >
                No hay clientes pendientes
              </Text>
              <Text className="mt-1 text-center text-xs text-stone-600">
                Todas las solicitudes de registro han sido procesadas.
              </Text>
              <TouchableOpacity
                onPress={cargarLista}
                className="mt-4 rounded-xl border border-mostaza bg-mostaza/20 px-4 py-2"
              >
                <Text className="text-xs font-bold text-vino">Actualizar Lista</Text>
              </TouchableOpacity>
            </View>
          ) : (
            clientes.map((cliente) => {
              const estaProcesando = procesandoId === cliente.id;

              return (
                <View
                  key={cliente.id}
                  className="mb-4 rounded-2xl border-2 border-caramelo bg-[#FFFDF9] p-4 shadow-md"
                >
                  {/* Cabecera de la Tarjeta con Tag de Fecha */}
                  <View className="flex-row justify-between items-center mb-3">
                    <View className="flex-row items-center">
                      <View className="h-2.5 w-2.5 rounded-full bg-amber-500 mr-2" />
                      <Text className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">
                        Solicitud Pendiente
                      </Text>
                    </View>
                    <Text className="text-[10px] text-stone-500 font-semibold">
                      {cliente.fechaRegistro}
                    </Text>
                  </View>

                  {/* Contenedor Individual de Foto con Buen Tamaño + Datos */}
                  <View className="flex-row items-center">
                    <View className="mr-4 items-center justify-center rounded-2xl border-2 border-mostaza p-1 bg-[#FBE9DF]">
                      <Image
                        source={{ uri: cliente.fotoUri }}
                        className="h-28 w-28 rounded-xl"
                        resizeMode="cover"
                      />
                    </View>

                    {/* Datos del Cliente */}
                    <View className="flex-1">
                      <Text className="text-base font-black text-vino">
                        {cliente.apellidos}, {cliente.nombres}
                      </Text>

                      <View className="mt-1 flex-row items-center">
                        <Text className="text-xs font-bold text-terracota">DNI: </Text>
                        <Text className="text-xs font-semibold text-stone-700">{cliente.dni}</Text>
                      </View>

                      <View className="mt-1">
                        <Text className="text-xs font-bold text-terracota">Email: </Text>
                        <Text
                          className="text-[11px] text-stone-700"
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {cliente.email}
                        </Text>
                      </View>

                      <View className="mt-2 self-start rounded-md bg-mostaza/20 px-2 py-0.5 border border-mostaza/50">
                        <Text className="text-[9px] font-bold text-amber-900">
                          Requiere Aprobación
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Botones de Control: Aceptar o Rechazar */}
                  <View className="mt-4 flex-row justify-between gap-3 border-t border-stone-200 pt-3">
                    {/* Botón Rechazar */}
                    <TouchableOpacity
                      onPress={() => abrirConfirmacion(cliente, "rechazado")}
                      disabled={estaProcesando}
                      className="flex-1 flex-row items-center justify-center rounded-xl border border-terracota bg-[#FBE9DF] py-2.5 active:bg-rose-200"
                    >
                      <Text className="text-xs font-bold text-terracota">✖ Rechazar</Text>
                    </TouchableOpacity>

                    {/* Botón Aceptar */}
                    <TouchableOpacity
                      onPress={() => abrirConfirmacion(cliente, "aprobado")}
                      disabled={estaProcesando}
                      className="flex-1 flex-row items-center justify-center rounded-xl border border-amber-500 bg-mostaza py-2.5 active:bg-amber-600 shadow-sm"
                    >
                      <Text className="text-xs font-black text-vino uppercase">✔ Aceptar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Modal de Confirmación */}
        <Modal
          visible={confirmacion.visible}
          transparent
          animationType="fade"
          onRequestClose={() => setConfirmacion((p) => ({ ...p, visible: false }))}
        >
          <View className="flex-1 items-center justify-center bg-black/60 px-6">
            <View className="w-full rounded-2xl border-2 border-mostaza bg-[#FFF6EC] p-6 shadow-2xl">
              <Text
                style={{ fontFamily: "LaOriental" }}
                className="text-xl uppercase text-vino text-center mb-2"
              >
                {confirmacion.accion === "aprobado" ? "Aprobar Cliente" : "Rechazar Cliente"}
              </Text>

              <Text className="text-center text-xs text-stone-700 mb-4">
                ¿Está seguro de que desea{" "}
                <Text className="font-bold">
                  {confirmacion.accion === "aprobado" ? "APROBAR" : "RECHAZAR"}
                </Text>{" "}
                a{" "}
                <Text className="font-bold text-vino">
                  {confirmacion.cliente?.nombres} {confirmacion.cliente?.apellidos}
                </Text>
                ? Se enviará un correo automático informando la situación.
              </Text>

              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setConfirmacion((p) => ({ ...p, visible: false }))}
                  className="flex-1 rounded-xl border border-stone-400 bg-stone-200 py-2.5 items-center"
                >
                  <Text className="text-xs font-bold text-stone-700">Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={ejecutarDecision}
                  className={`flex-1 rounded-xl py-2.5 items-center border ${
                    confirmacion.accion === "aprobado"
                      ? "bg-mostaza border-amber-600"
                      : "bg-terracota border-rose-900"
                  }`}
                >
                  <Text
                    className={`text-xs font-black uppercase ${
                      confirmacion.accion === "aprobado" ? "text-vino" : "text-white"
                    }`}
                  >
                    Confirmar
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal de Feedback */}
        <FeedbackModal
          visible={modalFeedback.visible}
          tipo={modalFeedback.tipo}
          titulo={modalFeedback.titulo}
          mensaje={modalFeedback.mensaje}
          onClose={() => setModalFeedback((prev) => ({ ...prev, visible: false }))}
        />
      </SafeAreaView>
    </>
  );
}