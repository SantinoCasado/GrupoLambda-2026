import React, { useState, useEffect, useRef, ReactNode } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  Vibration,
  ImageSourcePropType,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  ClientePendiente,
  obtenerClientesPendientes,
  responderSolicitudCliente,
} from "../services/aprobacionClientesService";
import { FeedbackModal } from "../components/FeedbackModal";
import { CompanySpinner } from "../components/CompanySpinner";
import { ChineseFrame } from "../components/ChineseFrame";
import { ConfirmModal } from "../components/ConfirmModal";

export default function AprobacionClientesScreen() {
  const [clientes, setClientes] = useState<ClientePendiente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [procesandoAccion, setProcesandoAccion] = useState<"aprobado" | "rechazado" | null>(null);
  const [clienteAEliminar, setClienteAEliminar] = useState<string | null>(null);
  const [fotoCargando, setFotoCargando] = useState(true);

  // Carrusel horizontal de solicitudes (2 por página)
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const [pagina, setPagina] = useState(0);
  const screenWidth = Dimensions.get("window").width;
  const CLIENTES_POR_PAGINA = 2;
  const agrupados: ClientePendiente[][] = [];
  for (let i = 0; i < clientes.length; i += CLIENTES_POR_PAGINA) {
    agrupados.push(clientes.slice(i, i + CLIENTES_POR_PAGINA));
  }

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
    mensaje: string | ReactNode;
    iconoImagen?: ImageSourcePropType;
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

  // Si la página actual queda fuera de rango (por ejemplo al aprobar/rechazar), la ajusta.
  useEffect(() => {
    if (agrupados.length > 0 && pagina >= agrupados.length) {
      setPagina(agrupados.length - 1);
    }
  }, [agrupados.length]);

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
    setProcesandoAccion(accion);

    try {
      const { correoEnviado } = await responderSolicitudCliente(id, accion);

      ejecutarVibracion(accion === "aprobado" ? "exito" : "error");

      setClienteAEliminar(id);
      setModalFeedback({
        visible: true,
        tipo: accion === "aprobado" ? "exito" : "error",
        titulo: accion === "aprobado" ? "Cliente Aprobado" : "Cliente Rechazado",
        mensaje: (
          <>
            Cliente/a{" "}
            <Text className="font-bold uppercase">
              {nombres} {apellidos}
            </Text>{" "}
            fue{" "}
            <Text className="font-bold uppercase">
              {accion === "aprobado" ? "aprobado/a" : "rechazado/a"}
            </Text>{" "}
            correctamente{correoEnviado ? " Se le envió un correo de notificación." : "."}
          </>
        ),
        ...(accion === "rechazado"
          ? { iconoImagen: require("../../assets/images/reject-w.png") }
          : {}),
      });
    } catch (error: any) {
      ejecutarVibracion("error");
      // La solicitud NO se quitó de la lista: sigue pendiente y se puede reintentar.
      setClienteAEliminar(null);
      setModalFeedback({
        visible: true,
        tipo: "error",
        titulo: "Error al procesar la solicitud",
        mensaje: error?.message || "No se pudo procesar la solicitud. Inténtelo nuevamente.",
      });
    } finally {
      setProcesandoId(null);
      setProcesandoAccion(null);
    }
  };

  return (
    <>
      <View className="flex-1">
        <StatusBar style="light" />

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

        {/* Lista de Solicitudes (carrusel horizontal) */}
        <View className="flex-1">
          {cargando ? (
            <View className="py-20 items-center justify-center">
              <ActivityIndicator size="large" color="#8B1A1A" />
              <Text className="mt-3 text-xs font-bold text-vino">Cargando solicitudes...</Text>
            </View>
          ) : clientes.length === 0 ? (
            <View className="items-center justify-center bg-transparent p-8 mt-6">
              <Image source={require("../../assets/images/yoga-y.png")} className="mb-3 h-12 w-12" resizeMode="contain" />
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
                  setPagina(Math.round(e.nativeEvent.contentOffset.x / screenWidth));
                }}
                style={{ flex: 1 }}
              >
                {agrupados.map((grupo, index) => (
                  <View key={index} style={{ width: screenWidth }} className="flex-1 px-5 pt-2">
                    <ScrollView
                      nestedScrollEnabled
                      showsVerticalScrollIndicator={false}
                      className="flex-1"
                      contentContainerStyle={{ paddingBottom: 20, gap: 16 }}
                    >
                      {grupo.map((cliente) => {
                        const estaProcesando = procesandoId === cliente.id;

                        return (
                          <View
                            key={cliente.id}
                            className="rounded-2xl border-2 border-caramelo bg-[#FFFDF9] p-4 shadow-md"
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
                              <View className="mr-4 items-center justify-center rounded-2xl border-2 border-mostaza p-1 bg-[#FBE9DF] relative overflow-hidden">
                                {fotoCargando && (
                                  <View className="absolute inset-0 items-center justify-center">
                                    <ActivityIndicator size="small" color="#8B1A1A" />
                                  </View>
                                )}
                                <Image
                                  source={{ uri: cliente.fotoUri }}
                                  className="h-28 w-28 rounded-xl"
                                  resizeMode="cover"
                                  onLoadStart={() => setFotoCargando(true)}
                                  onLoadEnd={() => setFotoCargando(false)}
                                  onError={() => setFotoCargando(false)}
                                />
                              </View>

                              {/* Datos del Cliente */}
                              <View className="flex-1">
                                <Text className="text-base font-black text-vino">
                                  {cliente.apellidos}, {cliente.nombres}
                                </Text>

                                <View className="mt-2">
                                  <Text className="text-[10px] font-bold text-terracota uppercase tracking-wide">
                                    DNI:
                                  </Text>
                                  <Text className="text-sm  text-stone-700">
                                    – {cliente.dni}
                                  </Text>
                                </View>

                                <View className="mt-2">
                                  <Text className="text-[10px] font-bold text-terracota tracking-wide">
                                    Correo Electrónico:
                                  </Text>
                                  <Text
                                    className="text-sm text-stone-700"
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                  >
                                    – {cliente.email}
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
                                <Image source={require("../../assets/images/cross-c.png")} className="mr-1.5 h-3 w-3" resizeMode="contain" />
                                <Text className="text-xs font-bold text-terracota">Rechazar</Text>
                              </TouchableOpacity>

                              {/* Botón Aceptar */}
                              <TouchableOpacity
                                onPress={() => abrirConfirmacion(cliente, "aprobado")}
                                disabled={estaProcesando}
                                className="flex-1 flex-row items-center justify-center rounded-xl border border-amber-500 bg-mostaza py-2.5 active:bg-amber-600 shadow-sm"
                              >
                                <Image source={require("../../assets/images/tick-v.png")} className="mr-1.5 h-5 w-5" resizeMode="contain" />
                                <Text className="text-xs font-black text-vino uppercase">Aceptar</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      })}
                    </ScrollView>
                  </View>
                ))}
              </ScrollView>

              {agrupados.length > 1 && (
                <View className="flex-row items-center justify-center gap-2 py-0 mb-5">
                  {agrupados.map((_, i) => (
                    <View
                      key={i}
                      className={`h-2 w-2 rotate-45 ${pagina === i ? "bg-vino" : "bg-mostaza/30"}`}
                    />
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        {/* Modal de Confirmación */}
        <ConfirmModal
          visible={confirmacion.visible}
          titulo={confirmacion.accion === "aprobado" ? "Aprobar Cliente" : "Rechazar Cliente"}
          mensaje={
            <>
              ¿Está seguro de que desea{" "}
              <Text className="font-bold">
                {confirmacion.accion === "aprobado" ? "APROBAR" : "RECHAZAR"}
              </Text>{" "}
              a{" "}
              <Text className="font-bold text-mostaza">
                {confirmacion.cliente?.nombres} {confirmacion.cliente?.apellidos}
              </Text>
              ? Se enviará un correo automático informandole.
            </>
          }
          textoConfirmar="Confirmar"
          textoCancelar="Cancelar"
          tipo={confirmacion.accion === "aprobado" ? "confirmar" : "peligro"}
          onConfirm={ejecutarDecision}
          onCancel={() => setConfirmacion((p) => ({ ...p, visible: false }))}
        />

        {/* Spinner de proceso de la solicitud */}
        <CompanySpinner
          visible={procesandoAccion !== null}
          mensaje={procesandoAccion === "aprobado" ? "Aprobando cliente..." : "Rechazando cliente..."}
        />

        {/* Modal de Feedback */}
        <FeedbackModal
          visible={modalFeedback.visible}
          tipo={modalFeedback.tipo}
          titulo={modalFeedback.titulo}
          mensaje={modalFeedback.mensaje}
          iconoImagen={modalFeedback.iconoImagen}
          onClose={() => {
            if (clienteAEliminar) {
              setClientes((prev) => prev.filter((c) => c.id !== clienteAEliminar));
              setClienteAEliminar(null);
            }
            setModalFeedback((prev) => ({ ...prev, visible: false }));
          }}
        />
      </View>
    </>
  );
}