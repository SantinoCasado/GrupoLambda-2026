import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  obtenerReservasApi,
  aprobarReservaApi,
  rechazarReservaApi,
  Reserva,
} from "../services/reservaService";

interface Props {
  onVolver: () => void;
}

interface ModalFeedbackConfig {
  visible: boolean;
  tipo: "error" | "exito" | "confirmar";
  titulo: string;
  mensaje: string;
  textoBoton: string;
  alConfirmar?: () => void;
}

// Marco ornamental estilo Jardín Imperial reutilizable para modales
function MarcoOriental({
  colorAcento,
  children,
}: {
  colorAcento: string;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        width: "100%",
        backgroundColor: "#FBF0EC",
        padding: 12,
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
      }}
    >
      <View
        style={{
          borderWidth: 2,
          borderColor: colorAcento,
          padding: 4,
          position: "relative",
        }}
      >
        <View
          style={{
            position: "absolute",
            top: -2,
            left: -2,
            width: 18,
            height: 18,
            borderRightWidth: 2,
            borderBottomWidth: 2,
            borderColor: colorAcento,
            backgroundColor: "#FBF0EC",
            zIndex: 2,
          }}
        />
        <View
          style={{
            position: "absolute",
            top: -2,
            right: -2,
            width: 18,
            height: 18,
            borderLeftWidth: 2,
            borderBottomWidth: 2,
            borderColor: colorAcento,
            backgroundColor: "#FBF0EC",
            zIndex: 2,
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: -2,
            left: -2,
            width: 18,
            height: 18,
            borderRightWidth: 2,
            borderTopWidth: 2,
            borderColor: colorAcento,
            backgroundColor: "#FBF0EC",
            zIndex: 2,
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: -2,
            right: -2,
            width: 18,
            height: 18,
            borderLeftWidth: 2,
            borderTopWidth: 2,
            borderColor: colorAcento,
            backgroundColor: "#FBF0EC",
            zIndex: 2,
          }}
        />

        <View
          style={{
            borderWidth: 1.5,
            borderColor: colorAcento,
            paddingVertical: 24,
            paddingHorizontal: 18,
            alignItems: "center",
          }}
        >
          {children}
        </View>
      </View>
    </View>
  );
}

export default function ReservasAdminScreen({ onVolver }: Props) {
  const [cargando, setCargando] = useState(false);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [filtro, setFiltro] = useState<"pending" | "approved" | "all">("pending");
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  // Modal Feedback / Confirmación de Aprobación
  const [modalFeedback, setModalFeedback] = useState<ModalFeedbackConfig>({
    visible: false,
    tipo: "exito",
    titulo: "",
    mensaje: "",
    textoBoton: "ACEPTAR",
  });

  // Modal Rechazo
  const [modalRechazoVisible, setModalRechazoVisible] = useState(false);
  const [reservaParaRechazar, setReservaParaRechazar] = useState<string | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [errorMotivo, setErrorMotivo] = useState("");

  const cerrarModalFeedback = () => {
    setModalFeedback((prev) => ({ ...prev, visible: false }));
  };

  const mostrarError = (titulo: string, mensaje: string) => {
    setModalFeedback({
      visible: true,
      tipo: "error",
      titulo,
      mensaje,
      textoBoton: "ACEPTAR",
    });
  };

  const mostrarExito = (titulo: string, mensaje: string) => {
    setModalFeedback({
      visible: true,
      tipo: "exito",
      titulo,
      mensaje,
      textoBoton: "ACEPTAR",
    });
  };

  const cargarReservas = async () => {
    setCargando(true);
    try {
      const estadoParam = filtro === "all" ? undefined : filtro;
      const data = await obtenerReservasApi(estadoParam);
      setReservas(Array.isArray(data) ? data : []);
    } catch {
      setReservas([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarReservas();
  }, [filtro]);

  const ejecutarAprobacion = async (r: Reserva) => {
    setProcesandoId(r.id);
    const res = await aprobarReservaApi(r.id);
    setProcesandoId(null);

    if (res.ok) {
      mostrarExito(
        "¡Reserva Confirmada!",
        "La reserva fue aprobada, se asignó la mesa óptima y se notificó al cliente por correo."
      );
      cargarReservas();
    } else {
      mostrarError(
        "No se pudo aprobar",
        res.error || "Ocurrió un error al intentar aprobar la reserva."
      );
    }
  };

  const handleAprobar = (r: Reserva) => {
    const nombre =
      `${r.client?.first_name || ""} ${r.client?.last_name || ""}`.trim() ||
      "Cliente";

    setModalFeedback({
      visible: true,
      tipo: "confirmar",
      titulo: "Aprobar Reserva",
      mensaje: `¿Confirmar la reserva de ${nombre} para ${r.guests_count} ${
        r.guests_count === 1 ? "comensal" : "comensales"
      }?\n\nEl sistema asignará automáticamente una mesa disponible adecuada.`,
      textoBoton: "CONFIRMAR",
      alConfirmar: () => ejecutarAprobacion(r),
    });
  };

  const abrirModalRechazo = (id: string) => {
    setReservaParaRechazar(id);
    setMotivoRechazo("");
    setErrorMotivo("");
    setModalRechazoVisible(true);
  };

  const handleConfirmarRechazo = async () => {
    if (!motivoRechazo.trim()) {
      setErrorMotivo("Por favor, ingresá el motivo del rechazo.");
      return;
    }
    if (!reservaParaRechazar) return;

    setProcesandoId(reservaParaRechazar);
    const res = await rechazarReservaApi(
      reservaParaRechazar,
      motivoRechazo.trim()
    );
    setProcesandoId(null);
    setModalRechazoVisible(false);

    if (res.ok) {
      mostrarExito(
        "Reserva Rechazada",
        "La reserva fue rechazada y se envió el motivo al cliente por correo."
      );
      cargarReservas();
    } else {
      mostrarError(
        "Error al rechazar",
        res.error || "No se pudo procesar el rechazo."
      );
    }
  };

  const badgeEstilo = (status: string) => {
    switch (status) {
      case "approved":
        return { bg: "bg-emerald-600", text: "text-white", label: "APROBADA" };
      case "rejected":
        return { bg: "bg-rose-700", text: "text-white", label: "RECHAZADA" };
      case "cancelled":
        return { bg: "bg-stone-500", text: "text-white", label: "CANCELADA" };
      case "completed":
        return { bg: "bg-sky-700", text: "text-white", label: "COMPLETADA" };
      default:
        return { bg: "bg-amber-400", text: "text-stone-900", label: "PENDIENTE" };
    }
  };

  const colorAcentoFeedback =
    modalFeedback.tipo === "exito"
      ? "#10A366"
      : modalFeedback.tipo === "confirmar"
      ? "#780116"
      : "#C02A1D";

  return (
    <View style={{ flex: 1, backgroundColor: "#F9ECCE" }}>
      <StatusBar style="light" />

      {/* Header */}
      <View className="bg-vino px-4 pt-3 pb-4 shadow-md">
        {/* <View className="flex-row items-center justify-between mb-1">
          <Pressable
            onPress={onVolver}
            className="rounded-xl border border-mostaza bg-vino px-3 py-1.5"
          >
            <Text className="text-mostaza font-bold text-xs">← Volver</Text>
          </Pressable>
          <View style={{ width: 64 }} />
        </View> */}

        <View className="items-center">
          <Text
            style={{ fontFamily: "LaOriental" }}
            className="text-xl text-mostaza uppercase text-center"
          >
            Gestión de Reservas
          </Text>
          <Text className="text-amber-100 text-xs font-semibold mt-0.5">
            Panel de Control • Dueño / Supervisor
          </Text>
        </View>
      </View>

      {/* Selector de Filtros integrado al fondo crema/mostaza */}
      <View
        style={{ backgroundColor: "#F3E0B5", borderBottomColor: "#E2C88B" }}
        className="flex-row border-b"
      >
        {(
          [
            { key: "pending", label: "Pendientes" },
            { key: "approved", label: "Aprobadas" },
            { key: "all", label: "Todas" },
          ] as const
        ).map((item) => {
          const activo = filtro === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => setFiltro(item.key)}
              style={{
                flex: 1,
                paddingVertical: 13,
                alignItems: "center",
                borderBottomWidth: 3,
                borderBottomColor: activo ? "#780116" : "transparent",
                backgroundColor: activo ? "#F9ECCE" : "transparent",
              }}
            >
              <Text
                style={{
                  fontWeight: "800",
                  fontSize: 12,
                  textTransform: "uppercase",
                  color: activo ? "#780116" : "#785A32",
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Listado */}
      <ScrollView
        style={{ backgroundColor: "#F9ECCE" }}
        className="flex-1 p-5"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-vino font-extrabold text-xs uppercase">
            Solicitudes ({reservas.length})
          </Text>
          <Pressable
            onPress={cargarReservas}
            style={{ backgroundColor: "#FFFDF7", borderColor: "#D9B978" }}
            className="border px-3 py-1.5 rounded-xl"
          >
            <Text className="text-vino font-bold text-xs">Actualizar</Text>
          </Pressable>
        </View>

        {cargando ? (
          <ActivityIndicator size="large" color="#780116" className="mt-8" />
        ) : reservas.length === 0 ? (
          <View
            style={{ backgroundColor: "#FFFDF7", borderColor: "#D9B978" }}
            className="rounded-2xl p-8 items-center border-2 mt-2"
          >
            <Text className="text-stone-700 text-sm font-bold text-center">
              No hay reservas registradas en esta sección.
            </Text>
          </View>
        ) : (
          <View className="pb-10">
            {reservas.map((r) => {
              const nombreCliente =
                `${r.client?.first_name || ""} ${r.client?.last_name || ""}`.trim() ||
                "Cliente";
              const estaProcesando = procesandoId === r.id;
              const badge = badgeEstilo(r.status);

              return (
                <View
                  key={r.id}
                  style={{ backgroundColor: "#FFFDF7", borderColor: "#D9B978" }}
                  className="rounded-2xl p-4 mb-3.5 border-2 shadow-sm"
                >
                  <View className="flex-row justify-between items-start mb-1.5">
                    <View className="flex-1 pr-2">
                      <Text className="font-extrabold text-vino text-base">
                        {nombreCliente}
                      </Text>
                      {r.client?.email && (
                        <Text className="text-xs font-semibold text-stone-500">
                          {r.client.email}
                        </Text>
                      )}
                    </View>

                    <View className={`px-2.5 py-1 rounded-full ${badge.bg}`}>
                      <Text
                        className={`text-[10px] font-extrabold uppercase ${badge.text}`}
                      >
                        {badge.label}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={{ backgroundColor: "#F9ECCE", borderColor: "#D9B978" }}
                    className="rounded-xl p-2.5 border my-1.5"
                  >
                    <Text className="text-xs text-stone-800 font-semibold">
                      Fecha:{" "}
                      <Text className="font-extrabold text-vino">
                        {new Date(r.reservation_date).toLocaleDateString("es-AR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        hs
                      </Text>{" "}
                      • Comensales:{" "}
                      <Text className="font-extrabold text-vino text-sm">
                        {r.guests_count}
                      </Text>
                    </Text>
                  </View>

                  {r.table?.table_number && (
                    <View className="bg-emerald-50 border border-emerald-300 p-2.5 rounded-xl mt-1">
                      <Text className="text-xs font-extrabold text-emerald-900">
                        Mesa Asignada: N° {r.table.table_number} (Capacidad:{" "}
                        {r.table.capacity ?? "N/A"})
                      </Text>
                    </View>
                  )}

                  {r.rejection_reason && (
                    <View className="bg-rose-50 border border-rose-200 p-2.5 rounded-xl mt-1">
                      <Text className="text-xs font-semibold text-rose-800">
                        Motivo: {r.rejection_reason}
                      </Text>
                    </View>
                  )}

                  {r.status === "pending" && (
                    <View
                      style={{ borderTopColor: "#E8D2A6" }}
                      className="flex-row mt-3 pt-3 border-t"
                    >
                      <TouchableOpacity
                        onPress={() => handleAprobar(r)}
                        disabled={estaProcesando}
                        style={{ marginRight: 6 }}
                        className="flex-1 bg-emerald-600 py-3 rounded-xl items-center shadow-sm"
                      >
                        {estaProcesando ? (
                          <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                          <Text className="text-white font-extrabold text-xs uppercase tracking-wider">
                            Aprobar
                          </Text>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => abrirModalRechazo(r.id)}
                        disabled={estaProcesando}
                        style={{ marginLeft: 6 }}
                        className="flex-1 bg-rose-700 py-3 rounded-xl items-center shadow-sm"
                      >
                        <Text className="text-white font-extrabold text-xs uppercase tracking-wider">
                          Rechazar
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Modal Oriental de Confirmación / Éxito / Error */}
      <Modal
        visible={modalFeedback.visible}
        transparent
        animationType="fade"
        onRequestClose={cerrarModalFeedback}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(35, 10, 12, 0.65)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 22,
          }}
        >
          <MarcoOriental colorAcento={colorAcentoFeedback}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: colorAcentoFeedback,
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  color: modalFeedback.tipo === "confirmar" ? "#F4B41A" : "#FFFFFF",
                  fontSize: 30,
                  fontWeight: "900",
                  lineHeight: 34,
                }}
              >
                {modalFeedback.tipo === "exito"
                  ? "✓"
                  : modalFeedback.tipo === "confirmar"
                  ? "?"
                  : "✕"}
              </Text>
            </View>

            <Text
              style={{
                color: "#5C0A14",
                fontSize: 19,
                fontWeight: "900",
                textAlign: "center",
                marginBottom: 10,
              }}
            >
              {modalFeedback.titulo}
            </Text>

            <Text
              style={{
                color: "#5C0A14",
                fontSize: 13,
                fontWeight: "500",
                textAlign: "center",
                lineHeight: 19,
                marginBottom: 22,
              }}
            >
              {modalFeedback.mensaje}
            </Text>

            {modalFeedback.tipo === "confirmar" ? (
              <View style={{ flexDirection: "row", width: "100%" }}>
                <Pressable
                  onPress={cerrarModalFeedback}
                  style={{
                    flex: 1,
                    marginRight: 6,
                    paddingVertical: 13,
                    borderRadius: 999,
                    borderWidth: 1.5,
                    borderColor: "#780116",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "LaOriental",
                      color: "#780116",
                      fontSize: 13,
                      textTransform: "uppercase",
                    }}
                  >
                    Cancelar
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    const cb = modalFeedback.alConfirmar;
                    cerrarModalFeedback();
                    if (cb) cb();
                  }}
                  style={{
                    flex: 1,
                    marginLeft: 6,
                    paddingVertical: 13,
                    borderRadius: 999,
                    backgroundColor: "#10A366",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "LaOriental",
                      color: "#FFFFFF",
                      fontSize: 13,
                      textTransform: "uppercase",
                    }}
                  >
                    {modalFeedback.textoBoton}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={cerrarModalFeedback}
                style={{
                  width: "100%",
                  backgroundColor: colorAcentoFeedback,
                  paddingVertical: 14,
                  borderRadius: 999,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: "LaOriental",
                    color: "#FFFFFF",
                    fontSize: 14,
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                  }}
                >
                  {modalFeedback.textoBoton}
                </Text>
              </Pressable>
            )}
          </MarcoOriental>
        </View>
      </Modal>

      {/* Modal Oriental de Rechazo con Motivo Obligatorio */}
      <Modal
        visible={modalRechazoVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalRechazoVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(35, 10, 12, 0.65)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 22,
          }}
        >
          <MarcoOriental colorAcento="#C02A1D">
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: "#C02A1D",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 26,
                  fontWeight: "900",
                }}
              >
                ✕
              </Text>
            </View>

            <Text
              style={{
                color: "#5C0A14",
                fontSize: 18,
                fontWeight: "900",
                textAlign: "center",
                marginBottom: 6,
              }}
            >
              Rechazar Reserva
            </Text>

            <Text
              style={{
                color: "#5C0A14",
                fontSize: 12,
                textAlign: "center",
                marginBottom: 14,
              }}
            >
              Indicá el motivo. Se registrará en la reserva y se notificará al
              cliente.
            </Text>

            <TextInput
              value={motivoRechazo}
              onChangeText={(txt) => {
                setMotivoRechazo(txt);
                if (errorMotivo) setErrorMotivo("");
              }}
              placeholder="Ej: Salón completo en esa franja horaria"
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
              style={{
                width: "100%",
                backgroundColor: "#F9ECCE",
                borderColor: errorMotivo ? "#C02A1D" : "#D9B978",
                borderWidth: 1.5,
                borderRadius: 12,
                padding: 12,
                color: "#292524",
                fontSize: 13,
                minHeight: 75,
                textAlignVertical: "top",
                marginBottom: errorMotivo ? 6 : 18,
              }}
            />

            {errorMotivo ? (
              <Text
                style={{
                  color: "#C02A1D",
                  fontSize: 11,
                  fontWeight: "700",
                  marginBottom: 14,
                  alignSelf: "flex-start",
                }}
              >
                {errorMotivo}
              </Text>
            ) : null}

            <View style={{ flexDirection: "row", width: "100%" }}>
              <Pressable
                onPress={() => setModalRechazoVisible(false)}
                style={{
                  flex: 1,
                  marginRight: 6,
                  paddingVertical: 13,
                  borderRadius: 999,
                  borderWidth: 1.5,
                  borderColor: "#780116",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: "LaOriental",
                    color: "#780116",
                    fontSize: 13,
                    textTransform: "uppercase",
                  }}
                >
                  Cancelar
                </Text>
              </Pressable>

              <Pressable
                onPress={handleConfirmarRechazo}
                disabled={Boolean(procesandoId)}
                style={{
                  flex: 1,
                  marginLeft: 6,
                  paddingVertical: 13,
                  borderRadius: 999,
                  backgroundColor: "#C02A1D",
                  alignItems: "center",
                }}
              >
                {procesandoId ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text
                    style={{
                      fontFamily: "LaOriental",
                      color: "#FFFFFF",
                      fontSize: 13,
                      textTransform: "uppercase",
                    }}
                  >
                    Rechazar
                  </Text>
                )}
              </Pressable>
            </View>
          </MarcoOriental>
        </View>
      </Modal>
    </View>
  );
}