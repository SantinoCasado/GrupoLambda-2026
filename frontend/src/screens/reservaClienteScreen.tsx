import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  crearReservaApi,
  obtenerMisReservasApi,
  Reserva,
} from "../services/reservaService";

interface Props {
  onVolver: () => void;
}

interface ModalConfig {
  visible: boolean;
  tipo: "error" | "exito";
  titulo: string;
  mensaje: string;
  textoBoton: string;
  alConfirmar?: () => void;
}

const OPCIONES_COMENSALES = [1, 2, 3, 4, 5];

const formatearFechaISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

const obtenerFechaOffset = (dias: number) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return formatearFechaISO(d);
};

// Componente de Modal estilo Jardín Imperial
function ModalOriental({
  config,
  onClose,
}: {
  config: ModalConfig;
  onClose: () => void;
}) {
  const esExito = config.tipo === "exito";
  const colorAcento = esExito ? "#10A366" : "#C02A1D";

  const manejarPresion = () => {
    onClose();
    if (config.alConfirmar) {
      config.alConfirmar();
    }
  };

  return (
    <Modal
      visible={config.visible}
      transparent
      animationType="fade"
      onRequestClose={manejarPresion}
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
          {/* Marco exterior ornamental */}
          <View
            style={{
              borderWidth: 2,
              borderColor: colorAcento,
              padding: 4,
              position: "relative",
            }}
          >
            {/* Adornos de esquina estilo oriental */}
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

            {/* Marco interior */}
            <View
              style={{
                borderWidth: 1.5,
                borderColor: colorAcento,
                paddingVertical: 26,
                paddingHorizontal: 20,
                alignItems: "center",
              }}
            >
              {/* Círculo con Ícono */}
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: colorAcento,
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 30,
                    fontWeight: "900",
                    lineHeight: 34,
                  }}
                >
                  {esExito ? "✓" : "✕"}
                </Text>
              </View>

              {/* Título */}
              <Text
                style={{
                  color: "#5C0A14",
                  fontSize: 19,
                  fontWeight: "900",
                  textAlign: "center",
                  marginBottom: 10,
                }}
              >
                {config.titulo}
              </Text>

              {/* Mensaje descriptivo */}
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
                {config.mensaje}
              </Text>

              {/* Botón de acción */}
              <Pressable
                onPress={manejarPresion}
                style={{
                  width: "100%",
                  backgroundColor: colorAcento,
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
                  {config.textoBoton}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function ReservasClienteScreen({ onVolver }: Props) {
  const [tab, setTab] = useState<"nueva" | "mias">("nueva");
  const [enviando, setEnviando] = useState(false);
  const [cargandoMias, setCargandoMias] = useState(false);
  const [misReservas, setMisReservas] = useState<Reserva[]>([]);

  const [modalConfig, setModalConfig] = useState<ModalConfig>({
    visible: false,
    tipo: "error",
    titulo: "",
    mensaje: "",
    textoBoton: "ACEPTAR",
  });

  const mostrarModalError = (titulo: string, mensaje: string) => {
    setModalConfig({
      visible: true,
      tipo: "error",
      titulo,
      mensaje,
      textoBoton: "ACEPTAR",
    });
  };

  const mostrarModalExito = (
    titulo: string,
    mensaje: string,
    textoBoton: string,
    alConfirmar?: () => void
  ) => {
    setModalConfig({
      visible: true,
      tipo: "exito",
      titulo,
      mensaje,
      textoBoton,
      alConfirmar,
    });
  };

  const cerrarModal = () => {
    setModalConfig((prev) => ({ ...prev, visible: false }));
  };

  const fechaManiana = obtenerFechaOffset(1);

  const [fechaTexto, setFechaTexto] = useState(fechaManiana);
  const [horaTexto, setHoraTexto] = useState("13:00");
  const [comensales, setComensales] = useState<number>(2);

  const cargarMisReservas = async () => {
    setCargandoMias(true);
    try {
      const data = await obtenerMisReservasApi();
      setMisReservas(Array.isArray(data) ? data : []);
    } catch {
      setMisReservas([]);
    } finally {
      setCargandoMias(false);
    }
  };

  useEffect(() => {
    if (tab === "mias") {
      cargarMisReservas();
    }
  }, [tab]);

  const handleCrearReserva = async () => {
    const fechaLimpia = fechaTexto.trim();
    const horaLimpia = horaTexto.trim();

    const regexFecha = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
    if (!regexFecha.test(fechaLimpia)) {
      mostrarModalError(
        "Fecha Inválida",
        "Ingresá una fecha real en formato Año-Mes-Día (ej: 2026-11-15)."
      );
      return;
    }

    const regexHora = /^(0\d|1\d|2[0-3]):([0-5]\d)$/;
    if (!regexHora.test(horaLimpia)) {
      mostrarModalError(
        "Horario Inexistente",
        "Ingresá un horario válido en formato HH:MM (ej: 13:30)."
      );
      return;
    }

    const [horaNum, minNum] = horaLimpia.split(":").map((v) => parseInt(v, 10));
    if (horaNum < 9 || horaNum > 21 || (horaNum === 21 && minNum > 0)) {
      mostrarModalError(
        "Fuera de Franja",
        "El horario de atención es de 09:00 a 21:00 hs."
      );
      return;
    }

    if (comensales < 1 || comensales > 5) {
      mostrarModalError(
        "Comensales Inválidos",
        "La cantidad permitida es de 1 a 5 comensales."
      );
      return;
    }

    const fechaHoraStr = `${fechaLimpia}T${horaLimpia}:00-03:00`;
    const fechaObj = new Date(fechaHoraStr);

    if (isNaN(fechaObj.getTime())) {
      mostrarModalError(
        "Fecha Inválida",
        "La fecha ingresada no corresponde a un día de calendario real."
      );
      return;
    }

    const ahora = new Date();
    if (fechaObj.getTime() <= ahora.getTime()) {
      mostrarModalError(
        "Horario Pasado",
        "La reserva debe ser en una fecha y horario futuro."
      );
      return;
    }

    const unMesAdelante = new Date();
    unMesAdelante.setDate(unMesAdelante.getDate() + 30);
    if (fechaObj.getTime() > unMesAdelante.getTime()) {
      mostrarModalError(
        "Tope Excedido",
        `Solo se pueden realizar reservas con hasta un mes de anticipación (máximo hasta el ${unMesAdelante.toLocaleDateString(
          "es-AR"
        )}).`
      );
      return;
    }

    setEnviando(true);
    const res = await crearReservaApi(fechaObj.toISOString(), comensales);
    setEnviando(false);

    if (res.ok) {
      mostrarModalExito(
        "¡Reserva Solicitada!",
        "Tu solicitud fue enviada y está pendiente de confirmación. Te notificaremos por correo electrónico.",
        "VER MIS RESERVAS",
        () => setTab("mias")
      );
    } else {
      mostrarModalError(
        "No se pudo reservar",
        res.error || "Ocurrió un error al procesar tu solicitud."
      );
    }
  };

  const badgeColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-emerald-600 text-white";
      case "rejected":
        return "bg-rose-700 text-white";
      case "cancelled":
        return "bg-stone-500 text-white";
      case "completed":
        return "bg-sky-700 text-white";
      default:
        return "bg-amber-400 text-stone-900";
    }
  };

  const badgeTexto = (status: string) => {
    switch (status) {
      case "approved":
        return "CONFIRMADA";
      case "rejected":
        return "RECHAZADA";
      case "cancelled":
        return "CANCELADA";
      case "completed":
        return "COMPLETADA";
      default:
        return "PENDIENTE";
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F9ECCE" }}>
      <StatusBar style="light" />

      {/* Modal Oriental de Feedback */}
      <ModalOriental config={modalConfig} onClose={cerrarModal} />

      {/* Header */}
      <View className="bg-vino px-6 pt-4 pb-5 items-center shadow-md">
        <Pressable
          onPress={onVolver}
          className="absolute left-4 top-7 rounded-xl border border-mostaza bg-vino px-3 py-1.5"
        >
          <Text className="text-mostaza font-bold">← Volver</Text>
        </Pressable>
        <Text
          style={{ fontFamily: "LaOriental" }}
          className="text-2xl text-mostaza uppercase mt-2"
        >
          Reservas
        </Text>
        <Text className="text-amber-100 text-xs font-semibold">
          Jardín Imperial • Salón Principal
        </Text>
      </View>

      {/* Selector de Tabs integrado al tono crema/mostaza */}
      <View
        style={{ backgroundColor: "#F3E0B5", borderBottomColor: "#E2C88B" }}
        className="flex-row border-b"
      >
        <Pressable
          onPress={() => setTab("nueva")}
          style={{
            flex: 1,
            paddingVertical: 13,
            alignItems: "center",
            borderBottomWidth: 3,
            borderBottomColor: tab === "nueva" ? "#780116" : "transparent",
            backgroundColor: tab === "nueva" ? "#F9ECCE" : "transparent",
          }}
        >
          <Text
            style={{
              fontWeight: "800",
              fontSize: 13,
              textTransform: "uppercase",
              color: tab === "nueva" ? "#780116" : "#785A32",
            }}
          >
            Nueva Reserva
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setTab("mias")}
          style={{
            flex: 1,
            paddingVertical: 13,
            alignItems: "center",
            borderBottomWidth: 3,
            borderBottomColor: tab === "mias" ? "#780116" : "transparent",
            backgroundColor: tab === "mias" ? "#F9ECCE" : "transparent",
          }}
        >
          <Text
            style={{
              fontWeight: "800",
              fontSize: 13,
              textTransform: "uppercase",
              color: tab === "mias" ? "#780116" : "#785A32",
            }}
          >
            Mis Reservas
          </Text>
        </Pressable>
      </View>

      {/* Vista 1: Nueva Reserva */}
      <ScrollView
        style={{
          display: tab === "nueva" ? "flex" : "none",
          backgroundColor: "#F9ECCE",
        }}
        className="flex-1 p-5"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{ backgroundColor: "#FFFDF7", borderColor: "#D9B978" }}
          className="rounded-2xl p-5 border-2 shadow-sm mb-4"
        >
          <Text
            style={{ fontFamily: "LaOriental" }}
            className="text-vino text-lg uppercase text-center"
          >
            Solicitar Mesa
          </Text>
          <Text className="text-stone-600 text-xs text-center mt-0.5 mb-5">
            Horario de atención: 09:00 a 21:00 hs • Máximo 5 comensales
          </Text>

          {/* Comensales */}
          <View className="mb-5">
            <Text className="text-vino font-bold text-xs uppercase mb-2">
              1. Cantidad de Comensales
            </Text>
            <View className="flex-row justify-between">
              {OPCIONES_COMENSALES.map((num) => {
                const activo = comensales === num;
                return (
                  <Pressable
                    key={num}
                    onPress={() => setComensales(num)}
                    style={{
                      flex: 1,
                      marginHorizontal: 4,
                      paddingVertical: 10,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      alignItems: "center",
                      backgroundColor: activo ? "#780116" : "#F9ECCE",
                      borderColor: activo ? "#780116" : "#D9B978",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "800",
                        color: activo ? "#F4B41A" : "#780116",
                      }}
                    >
                      {num}
                    </Text>
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: "700",
                        color: activo ? "#FEF3C7" : "#8C6D3F",
                      }}
                    >
                      pers.
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Fecha */}
          <View className="mb-5">
            <Text className="text-vino font-bold text-xs uppercase mb-2">
              2. Fecha (Año-Mes-Día)
            </Text>

            <TextInput
              value={fechaTexto}
              onChangeText={setFechaTexto}
              placeholder="2026-11-15"
              placeholderTextColor="#a8a29e"
              style={{ backgroundColor: "#F9ECCE", borderColor: "#D9B978" }}
              className="border rounded-xl px-4 py-2.5 text-stone-800 font-bold"
            />
          </View>

          {/* Hora */}
          <View className="mb-2">
            <Text className="text-vino font-bold text-xs uppercase mb-2">
              3. Horario (09:00 a 21:00 hs)
            </Text>

            <TextInput
              value={horaTexto}
              onChangeText={setHoraTexto}
              placeholder="13:00"
              placeholderTextColor="#a8a29e"
              style={{ backgroundColor: "#F9ECCE", borderColor: "#D9B978" }}
              className="border rounded-xl px-4 py-2.5 text-stone-800 font-bold"
            />
          </View>
        </View>

        {/* Resumen previo */}
        <View
          style={{ backgroundColor: "#F4B41A", borderColor: "#780116" }}
          className="rounded-2xl p-4 border-2 mb-4"
        >
          <Text className="text-vino font-black text-xs uppercase mb-1">
            Resumen de tu solicitud
          </Text>
          <Text className="text-vino text-sm font-extrabold">
            Día: {fechaTexto || "----"} • Hora: {horaTexto || "--:--"} hs
          </Text>
          <Text className="text-stone-900 text-xs font-semibold mt-0.5">
            Comensales: {comensales}{" "}
            {comensales === 1 ? "persona" : "personas"} • Tolerancia de espera:
            45 min.
          </Text>
        </View>

        {/* Botón Enviar */}
        <TouchableOpacity
          onPress={handleCrearReserva}
          disabled={enviando}
          className="bg-vino rounded-2xl py-4 items-center shadow-md mb-10 border-2 border-mostaza"
        >
          {enviando ? (
            <ActivityIndicator color="#F4B41A" />
          ) : (
            <Text
              style={{ fontFamily: "LaOriental" }}
              className="text-mostaza uppercase text-base tracking-wider"
            >
              Enviar Solicitud
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Vista 2: Mis Reservas */}
      <ScrollView
        style={{
          display: tab === "mias" ? "flex" : "none",
          backgroundColor: "#F9ECCE",
        }}
        className="flex-1 p-5"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-vino font-extrabold text-xs uppercase">
            Tus Reservas
          </Text>
          <Pressable
            onPress={cargarMisReservas}
            style={{ backgroundColor: "#FFFDF7", borderColor: "#D9B978" }}
            className="border px-3 py-1.5 rounded-xl"
          >
            <Text className="text-vino font-bold text-xs">Actualizar</Text>
          </Pressable>
        </View>

        {cargandoMias ? (
          <ActivityIndicator size="large" color="#780116" className="mt-8" />
        ) : misReservas.length === 0 ? (
          <View
            style={{ backgroundColor: "#FFFDF7", borderColor: "#D9B978" }}
            className="rounded-2xl p-8 items-center border-2"
          >
            <Text className="text-stone-700 font-bold text-sm text-center mb-4">
              No tenés reservas registradas.
            </Text>
            <Pressable
              onPress={() => setTab("nueva")}
              className="bg-vino px-5 py-3 rounded-xl border border-mostaza"
            >
              <Text className="text-mostaza font-bold text-xs uppercase">
                Solicitar una mesa
              </Text>
            </Pressable>
          </View>
        ) : (
          <View className="pb-10">
            {misReservas.map((r) => (
              <View
                key={r.id}
                style={{ backgroundColor: "#FFFDF7", borderColor: "#D9B978" }}
                className="rounded-2xl p-4 mb-3.5 border-2 shadow-sm"
              >
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="font-extrabold text-vino text-sm">
                    {new Date(r.reservation_date).toLocaleDateString("es-AR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    hs
                  </Text>
                  <View
                    className={`px-2.5 py-1 rounded-full ${badgeColor(
                      r.status
                    )}`}
                  >
                    <Text className="text-[10px] font-extrabold uppercase">
                      {badgeTexto(r.status)}
                    </Text>
                  </View>
                </View>

                <Text className="text-stone-700 text-xs font-medium">
                  Comensales:{" "}
                  <Text className="font-extrabold text-stone-900">
                    {r.guests_count}
                  </Text>
                </Text>

                {r.status === "approved" && r.table?.table_number && (
                  <View className="mt-2.5 p-3 bg-emerald-50 border border-emerald-300 rounded-xl">
                    <Text className="text-emerald-900 text-xs font-extrabold">
                      Mesa Asignada: N° {r.table.table_number}
                    </Text>
                    <Text className="text-emerald-700 text-[11px] mt-0.5">
                      Escaneá el QR de esta mesa al llegar (tolerancia 45 min).
                    </Text>
                  </View>
                )}

                {r.status === "pending" && (
                  <View
                    style={{ backgroundColor: "#F9ECCE", borderColor: "#D9B978" }}
                    className="mt-2.5 p-2.5 border rounded-xl"
                  >
                    <Text className="text-vino text-[11px] font-semibold">
                      Estamos revisando disponibilidad para asignarte una mesa.
                    </Text>
                  </View>
                )}

                {r.rejection_reason && (
                  <View className="mt-2.5 p-2.5 bg-rose-50 border border-rose-200 rounded-xl">
                    <Text className="text-rose-800 text-[11px] font-bold">
                      Motivo: {r.rejection_reason}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}