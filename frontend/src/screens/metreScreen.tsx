import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  Modal,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { supabase } from "../config/supabase";
import {
  obtenerMesas,
  obtenerListaEspera,
  asignarMesa,
  eliminarDeListaEspera,
  Mesa,
  ClienteEnEspera,
} from "../services/mesasService";

interface Props {
  onCerrarSesion: () => void;
}

interface ModalMensajeInfo {
  visible: boolean;
  titulo: string;
  descripcion: string;
  tipo: "exito" | "error" | "info";
  icono: string;
}

export function MetreScreen({ onCerrarSesion }: Props) {
  const [clientesEspera, setClientesEspera] = useState<ClienteEnEspera[]>([]);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [cargando, setCargando] = useState(true);

  // Modal Asignar
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteEnEspera | null>(null);
  const [modalAsignar, setModalAsignar] = useState(false);
  const [asignando, setAsignando] = useState(false);

  // Modal Eliminar
  const [clienteAEliminar, setClienteAEliminar] = useState<ClienteEnEspera | null>(null);
  const [modalEliminar, setModalEliminar] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  // Modal Informativo / Feedback
  const [modalMensaje, setModalMensaje] = useState<ModalMensajeInfo>({
    visible: false,
    titulo: "",
    descripcion: "",
    tipo: "info",
    icono: "ℹ️",
  });

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

  const cargarDatos = async () => {
    try {
      const [lista, listaMesas] = await Promise.all([
        obtenerListaEspera(),
        obtenerMesas(),
      ]);
      setClientesEspera(lista);
      setMesas(listaMesas);
    } catch (err) {
      console.warn("Error cargando datos del metre:", err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();

    const canal = supabase
      .channel("metre_dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "waiting_list" },
        () => cargarDatos()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "restaurant_tables" },
        () => cargarDatos()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  // Confirmación de eliminación
  const confirmarEliminacion = async () => {
    if (!clienteAEliminar) return;

    setEliminando(true);
    const ok = await eliminarDeListaEspera(clienteAEliminar.id);
    setEliminando(false);
    setModalEliminar(false);

    if (ok) {
      setClientesEspera((prev) => prev.filter((c) => c.id !== clienteAEliminar.id));
      mostrarMensaje(
        "Cliente Removido",
        `${clienteAEliminar.client_name} fue quitado de la lista de espera.`,
        "info",
        "🗑️"
      );
    } else {
      mostrarMensaje(
        "Error",
        "No se pudo eliminar al cliente de la lista de espera.",
        "error",
        "⚠️"
      );
    }
    setClienteAEliminar(null);
  };

  // Asignación de mesa
  const confirmarAsignacion = async (mesa: Mesa) => {
    if (!clienteSeleccionado || !mesa.id) return;

    setAsignando(true);
    const res = await asignarMesa(clienteSeleccionado.id, mesa.id);
    setAsignando(false);
    setModalAsignar(false);

    if (res.exito) {
      mostrarMensaje(
        "¡Mesa Asignada!",
        `Mesa #${mesa.numero} asignada a ${clienteSeleccionado.client_name}. El cliente ya fue notificado.`,
        "exito",
        "🍽️"
      );
      setClienteSeleccionado(null);
      cargarDatos();
    } else {
      mostrarMensaje("Error al asignar", res.mensaje, "error", "⚠️");
    }
  };

  const mesasLibres = mesas.filter((m) => m.disponibilidad === "vacia");

  return (
    <View className="flex-1 bg-vino px-4 pt-12">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-mostaza/30 pb-4">
        <View>
          <Text style={{ fontFamily: "LaOriental" }} className="text-2xl text-mostaza">
            Panel del Metre
          </Text>
          <Text className="text-xs text-amber-100/70">
            Control de mesas y lista de espera
          </Text>
        </View>

        <TouchableOpacity
          onPress={onCerrarSesion}
          className="rounded-xl border border-mostaza/40 bg-black/30 px-3 py-1.5 active:bg-black/50"
        >
          <Text className="text-xs text-terracota">Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>

      {/* Resumen de mesas */}
      <View className="my-4 flex-row gap-2">
        <View className="flex-1 rounded-2xl border border-mostaza/20 bg-black/25 p-3 items-center">
          <Text className="text-lg font-bold text-emerald-400">{mesasLibres.length}</Text>
          <Text className="text-[11px] text-amber-100/80">Mesas Libres</Text>
        </View>
        <View className="flex-1 rounded-2xl border border-mostaza/20 bg-black/25 p-3 items-center">
          <Text className="text-lg font-bold text-calabaza">{clientesEspera.length}</Text>
          <Text className="text-[11px] text-amber-100/80">En Espera</Text>
        </View>
        <View className="flex-1 rounded-2xl border border-mostaza/20 bg-black/25 p-3 items-center">
          <Text className="text-lg font-bold text-amber-300">
            {mesas.filter((m) => m.disponibilidad === "ocupada").length}
          </Text>
          <Text className="text-[11px] text-amber-100/80">Ocupadas</Text>
        </View>
      </View>

      {/* Título de sección */}
      <Text style={{ fontFamily: "LaOriental" }} className="mb-2 text-lg text-mostaza">
        Clientes en Espera ({clientesEspera.length})
      </Text>

      {cargando ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#E5B25D" />
        </View>
      ) : clientesEspera.length === 0 ? (
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-4xl">🍵</Text>
          <Text className="mt-3 text-center text-sm text-amber-100/70">
            No hay clientes en lista de espera en este momento.
          </Text>
        </View>
      ) : (
        <FlatList
          data={clientesEspera}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <View className="mb-3 flex-row items-center rounded-2xl border border-mostaza/30 bg-black/30 p-3 shadow">
              {item.client_photo ? (
                <Image
                  source={{ uri: item.client_photo }}
                  className="h-14 w-14 rounded-full border border-mostaza"
                />
              ) : (
                <View className="h-14 w-14 items-center justify-center rounded-full bg-vino border border-mostaza">
                  <Text className="text-xl">👤</Text>
                </View>
              )}

              <View className="ml-3 flex-1">
                <Text className="text-base font-bold text-amber-100">
                  {item.client_name}
                </Text>
                <Text className="text-[11px] text-amber-200/60">
                  Turno: {item.joined_at ? new Date(item.joined_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Reciente"}
                </Text>
              </View>

              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => {
                    setClienteSeleccionado(item);
                    setModalAsignar(true);
                  }}
                  className="rounded-xl bg-calabaza px-3 py-2 active:bg-calabaza/80"
                >
                  <Text className="text-xs font-bold text-white">Asignar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setClienteAEliminar(item);
                    setModalEliminar(true);
                  }}
                  className="rounded-xl bg-black/40 border border-terracota/60 px-2.5 py-2 active:bg-terracota/30"
                >
                  <Text className="text-xs text-terracota font-bold">✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* 1. MODAL DE CONFIRMACIÓN PARA ELIMINAR CLIENTE */}
      <Modal visible={modalEliminar} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/75 px-6">
          <View className="w-full max-w-sm rounded-3xl border border-mostaza/50 bg-vino p-6 shadow-2xl">
            <Text className="text-center text-4xl">⚠️</Text>
            <Text
              style={{ fontFamily: "LaOriental" }}
              className="mt-2 text-center text-xl text-mostaza"
            >
              ¿Quitar de la lista?
            </Text>
            <Text className="mt-2 text-center text-xs text-amber-100/80 leading-relaxed">
              ¿Estás seguro de que deseas eliminar a{" "}
              <Text className="font-bold text-mostaza">
                {clienteAEliminar?.client_name}
              </Text>{" "}
              de la lista de espera? Su turno será cancelado.
            </Text>

            <View className="mt-6 flex-row gap-3">
              <TouchableOpacity
                disabled={eliminando}
                onPress={() => {
                  setModalEliminar(false);
                  setClienteAEliminar(null);
                }}
                className="flex-1 rounded-xl border border-mostaza/40 bg-black/30 py-3"
              >
                <Text className="text-center text-xs font-semibold text-amber-200">
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={eliminando}
                onPress={confirmarEliminacion}
                className="flex-1 items-center justify-center rounded-xl bg-terracota py-3 shadow"
              >
                {eliminando ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-center text-xs font-bold uppercase text-white">
                    Sí, eliminar
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 2. MODAL SELECCIÓN DE MESA */}
      <Modal visible={modalAsignar} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/75">
          <View className="max-h-[75%] rounded-t-3xl border-t border-mostaza/50 bg-vino p-6">
            <Text style={{ fontFamily: "LaOriental" }} className="text-xl text-mostaza text-center">
              Asignar Mesa a {clienteSeleccionado?.client_name}
            </Text>
            <Text className="text-center text-xs text-amber-100/70 mt-1 mb-4">
              Selecciona una mesa disponible del salón
            </Text>

            {mesasLibres.length === 0 ? (
              <View className="py-8 items-center">
                <Text className="text-3xl">🚫</Text>
                <Text className="mt-2 text-center text-xs text-amber-200">
                  No hay mesas disponibles en este momento.
                </Text>
              </View>
            ) : (
              <ScrollView className="max-h-72">
                {mesasLibres.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    disabled={asignando}
                    onPress={() => confirmarAsignacion(m)}
                    className="mb-2.5 flex-row items-center justify-between rounded-xl border border-mostaza/30 bg-black/30 p-3.5 active:bg-black/50"
                  >
                    <View className="flex-1 mr-3">
                      <Text className="text-base font-bold text-mostaza">
                        Mesa #{m.numero}
                      </Text>
                      <Text className="text-xs text-amber-100/70">
                        Capacidad: {m.comensales} personas • Tipo: {m.tipo}
                      </Text>
                    </View>
                    <Text className="text-xs font-bold uppercase text-emerald-400">
                      Seleccionar →
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              disabled={asignando}
              onPress={() => {
                setModalAsignar(false);
                setClienteSeleccionado(null);
              }}
              className="mt-4 rounded-xl border border-mostaza/40 bg-black/40 py-3"
            >
              <Text className="text-center text-xs font-semibold text-amber-200">
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 3. MODAL INFORMATIVO / MENSAJES */}
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
    </View>
  );
}