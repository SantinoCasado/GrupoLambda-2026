import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
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

export default function ReservasAdminScreen({ onVolver }: Props) {
  const [cargando, setCargando] = useState(false);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [filtro, setFiltro] = useState<"pending" | "approved" | "all">("pending");
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  // Modal Rechazo
  const [modalRechazoVisible, setModalRechazoVisible] = useState(false);
  const [reservaParaRechazar, setReservaParaRechazar] = useState<string | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");

  const cargarReservas = async () => {
    setCargando(true);
    const estadoParam = filtro === "all" ? undefined : filtro;
    const data = await obtenerReservasApi(estadoParam);
    setReservas(Array.isArray(data) ? data : []);
    setCargando(false);
  };

  useEffect(() => {
    cargarReservas();
  }, [filtro]);

  // Aprobación directa: el backend calcula y asigna la mesa óptima por capacidad
  const handleAprobar = (r: Reserva) => {
    const nombre = `${r.client?.first_name || ""} ${r.client?.last_name || ""}`.trim() || "Cliente";

    Alert.alert(
      "Aprobar Reserva",
      `¿Confirmar reserva para ${nombre}?\n\nComensales: ${r.guests_count}\nSe asignará automáticamente una mesa adecuada.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            setProcesandoId(r.id);
            const res = await aprobarReservaApi(r.id);
            setProcesandoId(null);

            if (res.ok) {
              Alert.alert("Éxito", "Reserva aprobada y mesa asignada.");
              cargarReservas();
            } else {
              Alert.alert("Error al aprobar", res.error || "No se pudo aprobar la reserva.");
            }
          },
        },
      ]
    );
  };

  const abrirModalRechazo = (id: string) => {
    setReservaParaRechazar(id);
    setMotivoRechazo("");
    setModalRechazoVisible(true);
  };

  const handleConfirmarRechazo = async () => {
    if (!motivoRechazo.trim()) {
      Alert.alert("Motivo requerido", "Debe ingresar el motivo por el cual rechaza la reserva.");
      return;
    }
    if (!reservaParaRechazar) return;

    setProcesandoId(reservaParaRechazar);
    const res = await rechazarReservaApi(reservaParaRechazar, motivoRechazo.trim());
    setProcesandoId(null);
    setModalRechazoVisible(false);

    if (res.ok) {
      Alert.alert("Reserva Rechazada", "Se notificó el motivo al cliente.");
      cargarReservas();
    } else {
      Alert.alert("Error al rechazar", res.error || "No se pudo procesar el rechazo.");
    }
  };

  return (
    <View className="flex-1 bg-stone-100">
      <StatusBar style="light" />

      {/* Header */}
      <View className="bg-vino px-6 pt-12 pb-5 items-center shadow-md">
        <TouchableOpacity
          onPress={onVolver}
          className="absolute left-4 top-12 rounded-xl border border-mostaza bg-vino px-3 py-1.5 active:bg-terracota"
        >
          <Text className="text-mostaza font-bold">← Volver</Text>
        </TouchableOpacity>
        <Text style={{ fontFamily: "LaOriental" }} className="text-2xl text-mostaza uppercase mt-2">
          Gestión de Reservas
        </Text>
        <Text className="text-amber-100 text-xs font-semibold">
          Panel de Control • Dueño / Supervisor
        </Text>
      </View>

      {/* Selector de Filtros */}
      <View className="flex-row bg-white border-b border-stone-200">
        <TouchableOpacity
          onPress={() => setFiltro("pending")}
          className={`flex-1 py-3 items-center border-b-2 ${
            filtro === "pending" ? "border-vino bg-mostaza/10" : "border-transparent"
          }`}
        >
          <Text className={`font-bold text-xs ${filtro === "pending" ? "text-vino" : "text-stone-500"}`}>
            Pendientes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setFiltro("approved")}
          className={`flex-1 py-3 items-center border-b-2 ${
            filtro === "approved" ? "border-vino bg-mostaza/10" : "border-transparent"
          }`}
        >
          <Text className={`font-bold text-xs ${filtro === "approved" ? "text-vino" : "text-stone-500"}`}>
            Aprobadas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setFiltro("all")}
          className={`flex-1 py-3 items-center border-b-2 ${
            filtro === "all" ? "border-vino bg-mostaza/10" : "border-transparent"
          }`}
        >
          <Text className={`font-bold text-xs ${filtro === "all" ? "text-vino" : "text-stone-500"}`}>
            Todas
          </Text>
        </TouchableOpacity>
      </View>

      {/* Listado */}
      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        {cargando ? (
          <ActivityIndicator size="large" color="#780116" className="mt-8" />
        ) : reservas.length === 0 ? (
          <View className="bg-white rounded-2xl p-8 items-center border border-stone-200 mt-4">
            <Text className="text-stone-400 text-sm font-semibold">No hay reservas registradas en este estado.</Text>
          </View>
        ) : (
          reservas.map((r) => {
            const nombreCliente = `${r.client?.first_name || ""} ${r.client?.last_name || ""}`.trim() || "Cliente";
            const estaProcesando = procesandoId === r.id;

            return (
              <View
                key={r.id}
                className="bg-white rounded-2xl p-4 mb-3 border border-stone-200 shadow-sm"
              >
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="font-bold text-stone-900 text-base">{nombreCliente}</Text>
                  <Text className="text-xs font-semibold text-stone-500">{r.client?.email}</Text>
                </View>

                <Text className="text-xs text-stone-600 mb-2">
                  Fecha:{" "}
                  <Text className="font-bold text-stone-800">
                    {new Date(r.reservation_date).toLocaleString("es-AR")}
                  </Text>{" "}
                  • Comensales:{" "}
                  <Text className="font-bold text-vino text-sm">{r.guests_count}</Text>
                </Text>

                {r.table?.table_number && (
                  <View className="bg-emerald-50 border border-emerald-200 p-2 rounded-xl mb-2">
                    <Text className="text-xs font-bold text-emerald-800">
                      Mesa Asignada: N° {r.table.table_number} (Capacidad: {r.table.capacity ?? "N/A"})
                    </Text>
                  </View>
                )}

                {r.rejection_reason && (
                  <View className="bg-rose-50 border border-rose-200 p-2 rounded-xl mb-2">
                    <Text className="text-xs font-semibold text-rose-800">
                      Motivo de rechazo: {r.rejection_reason}
                    </Text>
                  </View>
                )}

                {r.status === "pending" && (
                  <View className="flex-row gap-2 mt-2 pt-2 border-t border-stone-100">
                    <TouchableOpacity
                      onPress={() => handleAprobar(r)}
                      disabled={estaProcesando}
                      className="flex-1 bg-emerald-600 py-2.5 rounded-xl items-center active:bg-emerald-700 shadow-sm"
                    >
                      {estaProcesando ? (
                        <ActivityIndicator color="#FFF" size="small" />
                      ) : (
                        <Text className="text-white font-bold text-xs uppercase">Aprobar</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => abrirModalRechazo(r.id)}
                      disabled={estaProcesando}
                      className="flex-1 bg-rose-700 py-2.5 rounded-xl items-center active:bg-rose-800 shadow-sm"
                    >
                      <Text className="text-white font-bold text-xs uppercase">Rechazar</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Modal Rechazo con Motivo Obligatorio */}
      <Modal visible={modalRechazoVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/60 items-center justify-center p-6">
          <View className="bg-white w-full rounded-2xl p-5 border border-stone-300 shadow-2xl">
            <Text className="text-stone-900 font-bold text-base mb-1">Rechazar Reserva</Text>
            <Text className="text-stone-500 text-xs mb-3">
              Indique el motivo. Este mensaje se registrará en la reserva y se le informará al cliente.
            </Text>

            <TextInput
              value={motivoRechazo}
              onChangeText={setMotivoRechazo}
              placeholder="Ej: Salón completo / Sin mesas disponibles en ese horario"
              multiline
              numberOfLines={3}
              className="border border-stone-300 rounded-xl p-3 text-stone-800 text-xs bg-stone-50 mb-4"
            />

            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => setModalRechazoVisible(false)}
                className="flex-1 py-2.5 rounded-xl border border-stone-300 items-center"
              >
                <Text className="text-stone-700 font-bold text-xs">Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmarRechazo}
                disabled={Boolean(procesandoId)}
                className="flex-1 py-2.5 rounded-xl bg-rose-700 items-center active:bg-rose-800"
              >
                {procesandoId ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text className="text-white font-bold text-xs uppercase">Confirmar Rechazo</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}