import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
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

export default function ReservasClienteScreen({ onVolver }: Props) {
  const [tab, setTab] = useState<"nueva" | "mias">("nueva");
  const [cargando, setCargando] = useState(false);
  const [misReservas, setMisReservas] = useState<Reserva[]>([]);

  // Inicializar fecha para mañana por defecto
  const maniana = new Date();
  maniana.setDate(maniana.getDate() + 1);

  const [fechaTexto, setFechaTexto] = useState(
    `${maniana.getFullYear()}-${String(maniana.getMonth() + 1).padStart(2, "0")}-${String(
      maniana.getDate()
    ).padStart(2, "0")}`
  );
  const [horaTexto, setHoraTexto] = useState("13:00");
  const [comensales, setComensales] = useState("2");

  const cargarMisReservas = async () => {
    setCargando(true);
    const data = await obtenerMisReservasApi();
    setMisReservas(data);
    setCargando(false);
  };

  useEffect(() => {
    if (tab === "mias") {
      cargarMisReservas();
    }
  }, [tab]);

  const handleCrearReserva = async () => {
    const fechaLimpia = fechaTexto.trim();
    const horaLimpia = horaTexto.trim();

    // 1. Validar formato de fecha AAAA-MM-DD
    const regexFecha = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
    if (!regexFecha.test(fechaLimpia)) {
        Alert.alert("Fecha Inválida", "Ingresá una fecha real en formato AAAA-MM-DD (ej: 2026-11-06).");
        return;
    }

    // 2. Validar formato de hora y minutos reales (00 a 59)
    const regexHora = /^(0\d|1\d|2[0-3]):([0-5]\d)$/;
    if (!regexHora.test(horaLimpia)) {
        Alert.alert("Horario Inexistente", "Ingresá un horario válido en formato HH:MM (ej: 13:30). Los minutos deben ir de 00 a 59.");
        return;
    }

    // 3. Extraer valores numéricos
    const [horaNum, minNum] = horaLimpia.split(":").map((v) => parseInt(v, 10));

    // 4. Franja de atención: 09:00 a 21:00 hs
    if (horaNum < 9 || horaNum > 21 || (horaNum === 21 && minNum > 0)) {
        Alert.alert(
        "Fuera de Franja",
        "El horario de atención es de 09:00 a 21:00 hs."
        );
        return;
    }

    // 5. Comensales: 1 a 5
    const cant = parseInt(comensales, 10);
    if (isNaN(cant) || cant < 1 || cant > 5) {
        Alert.alert("Comensales Inválidos", "La cantidad permitida es de 1 a 5 comensales.");
        return;
    }

    // 6. Construir fecha con zona horaria Argentina
    const fechaHoraStr = `${fechaLimpia}T${horaLimpia}:00-03:00`;
    const fechaObj = new Date(fechaHoraStr);

    if (isNaN(fechaObj.getTime())) {
        Alert.alert("Fecha Inválida", "La fecha ingresada no corresponde a un día de calendario real.");
        return;
    }

    const ahora = new Date();

    // 7. Tiempo estrictamente futuro
    if (fechaObj.getTime() <= ahora.getTime()) {
        Alert.alert("Horario Pasado", "La reserva debe ser en una fecha y horario futuro.");
        return;
    }

    // 8. Límite máximo de 1 mes (30 días)
    const unMesAdelante = new Date();
    unMesAdelante.setDate(unMesAdelante.getDate() + 30);

    if (fechaObj.getTime() > unMesAdelante.getTime()) {
        Alert.alert(
        "Tope Excedido",
        `Solo se pueden realizar reservas con hasta un mes de anticipación (máximo hasta el ${unMesAdelante.toLocaleDateString("es-AR")}).`
        );
        return;
    }

    setCargando(true);
    const res = await crearReservaApi(fechaObj.toISOString(), cant);
    setCargando(false);

    if (res.ok) {
        Alert.alert(
        "¡Reserva Solicitada!",
        "Tu solicitud fue enviada y está pendiente de confirmación. Te notificaremos por correo electrónico.",
        [{ text: "Ver Mis Reservas", onPress: () => setTab("mias") }]
        );
    } else {
        Alert.alert("No se pudo reservar", res.error || "Ocurrió un error.");
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
        return "bg-amber-500 text-stone-900";
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
          Reservas
        </Text>
        <Text className="text-amber-100 text-xs font-semibold">
          Jardín Imperial • Salón Principal
        </Text>
      </View>

      {/* Selector de Tabs */}
      <View className="flex-row bg-white border-b border-stone-200">
        <TouchableOpacity
          onPress={() => setTab("nueva")}
          className={`flex-1 py-3 items-center border-b-2 ${
            tab === "nueva" ? "border-vino bg-mostaza/10" : "border-transparent"
          }`}
        >
          <Text className={`font-bold text-sm ${tab === "nueva" ? "text-vino" : "text-stone-500"}`}>
            Nueva Reserva
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab("mias")}
          className={`flex-1 py-3 items-center border-b-2 ${
            tab === "mias" ? "border-vino bg-mostaza/10" : "border-transparent"
          }`}
        >
          <Text className={`font-bold text-sm ${tab === "mias" ? "text-vino" : "text-stone-500"}`}>
            Mis Reservas
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-5" showsVerticalScrollIndicator={false}>
        {tab === "nueva" ? (
          <View className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm">
            <Text className="text-stone-800 font-bold text-base mb-1 uppercase text-center">
              Solicitar Mesa
            </Text>
            <Text className="text-stone-500 text-xs text-center mb-4">
              Horario de atención: 09:00 a 21:00 hs • Máximo 5 comensales
            </Text>

            <View className="mb-4">
              <Text className="text-stone-600 font-bold text-xs mb-1">Fecha (AAAA-MM-DD)</Text>
              <TextInput
                value={fechaTexto}
                onChangeText={setFechaTexto}
                placeholder="2026-11-06"
                placeholderTextColor="#a8a29e"
                className="border border-stone-300 rounded-xl px-4 py-2.5 text-stone-800 bg-stone-50"
              />
            </View>

            <View className="mb-4">
              <Text className="text-stone-600 font-bold text-xs mb-1">Hora (HH:MM)</Text>
              <TextInput
                value={horaTexto}
                onChangeText={setHoraTexto}
                placeholder="13:00"
                placeholderTextColor="#a8a29e"
                className="border border-stone-300 rounded-xl px-4 py-2.5 text-stone-800 bg-stone-50"
              />
              <Text className="text-[10px] text-stone-400 mt-0.5">
                Rango permitido: 09:00 a 21:00 hs
              </Text>
            </View>

            <View className="mb-6">
              <Text className="text-stone-600 font-bold text-xs mb-1">Cantidad de Comensales</Text>
              <TextInput
                value={comensales}
                onChangeText={setComensales}
                keyboardType="numeric"
                maxLength={1}
                placeholder="2"
                placeholderTextColor="#a8a29e"
                className="border border-stone-300 rounded-xl px-4 py-2.5 text-stone-800 bg-stone-50"
              />
              <Text className="text-[10px] text-stone-400 mt-0.5">
                Máximo permitido: 5 personas
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleCrearReserva}
              disabled={cargando}
              className="bg-vino rounded-xl py-3.5 items-center active:bg-terracota shadow-md"
            >
              {cargando ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={{ fontFamily: "LaOriental" }} className="text-mostaza uppercase text-base tracking-wider">
                  Enviar Solicitud
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            {cargando ? (
              <ActivityIndicator size="large" color="#780116" className="mt-8" />
            ) : misReservas.length === 0 ? (
              <View className="bg-white rounded-2xl p-8 items-center border border-stone-200">
                <Text className="text-stone-400 text-sm">No tenés reservas registradas.</Text>
              </View>
            ) : (
              misReservas.map((r) => (
                <View
                  key={r.id}
                  className="bg-white rounded-2xl p-4 mb-3 border border-stone-200 shadow-sm"
                >
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="font-bold text-stone-800 text-sm">
                      {new Date(r.reservation_date).toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      hs
                    </Text>
                    <View className={`px-2.5 py-1 rounded-full ${badgeColor(r.status)}`}>
                      <Text className="text-[10px] font-extrabold uppercase">
                        {badgeTexto(r.status)}
                      </Text>
                    </View>
                  </View>

                  <Text className="text-stone-600 text-xs">
                    Comensales: <Text className="font-semibold text-stone-800">{r.guests_count}</Text>
                  </Text>

                  {r.table?.table_number && (
                    <Text className="text-emerald-700 text-xs font-bold mt-1">
                      Mesa Asignada: N° {r.table.table_number}
                    </Text>
                  )}

                  {r.rejection_reason && (
                    <View className="mt-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg">
                      <Text className="text-rose-800 text-[11px] font-semibold">
                        Motivo: {r.rejection_reason}
                      </Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}