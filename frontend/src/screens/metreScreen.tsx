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
import { ChineseFrame } from "../components/ChineseFrame";
import { ConfirmModal } from "../components/ConfirmModal";
import { CompanySpinner } from "../components/CompanySpinner";
import { FeedbackModal } from "../components/FeedbackModal";
import {
  obtenerMesas,
  obtenerListaEspera,
  asignarMesa,
  eliminarDeListaEspera,
  Mesa,
  ClienteEnEspera,
} from "../services/mesasService";

const TIPO_MESA_INFO = {
  estandar: { icono: require("../../assets/images/table-y.png"), etiqueta: "ESTANDAR" },
  vip: { icono: require("../../assets/images/vip-y.png"), etiqueta: "VIP" },
  movilidad_reducida: {
    icono: require("../../assets/images/wheel-chair-y.png"),
    etiqueta: "MOV. REDUCIDA",
  },
} as const;

interface Props {
  onCerrarSesion: () => void;
}

interface ModalFeedbackInfo {
  visible: boolean;
  tipo: "exito" | "error" | "informacion";
  titulo: string;
  mensaje: string;
}

const MESAS_POR_PAGINA = 4;
const ALTO_PAGINA_MESAS = 288;

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
  const [modalFeedback, setModalFeedback] = useState<ModalFeedbackInfo>({
    visible: false,
    tipo: "informacion",
    titulo: "",
    mensaje: "",
  });

  const mostrarMensaje = (
    tipo: "exito" | "error" | "informacion",
    titulo: string,
    mensaje: string
  ) => {
    setModalFeedback({
      visible: true,
      tipo,
      titulo,
      mensaje,
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

    const cliente = clienteAEliminar;
    setModalEliminar(false);
    setEliminando(true);
    const ok = await eliminarDeListaEspera(cliente.id);
    setEliminando(false);

    if (ok) {
      setClientesEspera((prev) => prev.filter((c) => c.id !== cliente.id));
      mostrarMensaje(
        "exito",
        "Cliente Removido",
        `${cliente.client_name} fue quitado de la lista de espera.`
      );
    } else {
      mostrarMensaje(
        "error",
        "Error",
        "No se pudo eliminar al cliente de la lista de espera."
      );
    }
    setClienteAEliminar(null);
  };

  // Asignación de mesa
  const confirmarAsignacion = async (mesa: Mesa) => {
    if (!clienteSeleccionado || !mesa.id) return;

    const cliente = clienteSeleccionado;
    const numMesa = mesa.numero;
    setModalAsignar(false);
    setAsignando(true);
    const res = await asignarMesa(cliente.id, mesa.id);
    setAsignando(false);

    if (res.exito) {
      mostrarMensaje(
        "exito",
        "¡Mesa Asignada!",
        `Mesa #${numMesa} asignada a ${cliente.client_name}.`
      );
      setClienteSeleccionado(null);
      cargarDatos();
    } else {
      mostrarMensaje("error", "Error al asignar", res.mensaje);
    }
  };

  const mesasLibres = mesas.filter((m) => m.disponibilidad === "vacia");

  const mesasPorPagina: Mesa[][] = [];
  for (let i = 0; i < mesasLibres.length; i += MESAS_POR_PAGINA) {
    mesasPorPagina.push(mesasLibres.slice(i, i + MESAS_POR_PAGINA));
  }

  return (
    <View className="flex-1">

      {/* Cabecera */}
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
              <Text style={{ fontFamily: "LaOriental" }} className="text-2xl text-mostaza uppercase">
                Gestión de Mesas
              </Text>
              <Text className="mt-1 text-xs font-semibold text-amber-100">
                Control de mesas y lista de espera
              </Text>
            </View>
          </ChineseFrame>
        </View>
      </View>

      <View className="flex-1 px-4">
      {/* Resumen de mesas */}
      <View className="my-4 flex-row gap-2">
        <View className="flex-1 rounded-2xl border-2 border-[#10b981] bg-caramelo/20 p-3 items-center">
          <Text className="text-lg font-bold text-[#10b981]">{mesasLibres.length}</Text>
          <Text className="text-sm font-bold text-[#10b981]">Mesas Libres</Text>
        </View>
        <View className="flex-1 rounded-2xl border-2 border-[#c32f27] bg-caramelo/20 p-3 items-center">
          <Text className="text-lg font-bold text-[#c32f27]">
            {mesas.filter((m) => m.disponibilidad === "ocupada").length}
          </Text>
          <Text className="text-sm font-bold text-[#c32f27]">Ocupadas</Text>
        </View>
      </View>

      {/* Título de sección */}
      <Text style={{ fontFamily: "LaOriental" }} className="mb-2 text-lg text-vino">
        Clientes en Espera ({clientesEspera.length})
      </Text>

      {cargando ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#E5B25D" />
        </View>
      ) : clientesEspera.length === 0 ? (
        <View className="items-center justify-center px-8 pt-16 pb-8">
          <Image
            source={require("../../assets/images/yoga-y.png")}
            className="mb-3 h-12 w-12"
            resizeMode="contain"
          />
          <Text
            style={{ fontFamily: "LaOriental" }}
            className="text-base uppercase text-vino text-center"
          >
            No hay clientes en espera
          </Text>
          <Text className="mt-1 text-center text-xs text-stone-600">
            La lista de espera se encuentra vacía en este momento.
          </Text>
        </View>
      ) : (
        <FlatList
          data={clientesEspera}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <View className="mb-3 flex-row items-center rounded-2xl border-2 border-calabaza/30 bg-white p-3">
              {item.client_photo ? (
                <Image
                  source={{ uri: item.client_photo }}
                  className="h-14 w-14 rounded-full border-2 border-mostaza"
                />
              ) : (
                <Image
                  source={require("../../assets/images/no-photo.jpg")}
                  className="h-14 w-14 rounded-full border-2 border-mostaza"
                />
              )}

              <View className="ml-3 flex-1">
                <Text className="text-base font-bold text-vino">
                  {item.client_name}
                </Text>
                <Text className="text-[11px] text-vino/60">
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
                  className="flex-row items-center justify-center rounded-xl bg-white/80 border border-terracota/70 px-2.5 py-2 active:bg-terracota/30"
                >
                  <Image source={require("../../assets/images/cross-t.png")} className="h-2.5 w-2.5" resizeMode="contain" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
      </View>

      {/* 1. CONFIRMACIÓN PARA ELIMINAR CLIENTE */}
      <ConfirmModal
        visible={modalEliminar}
        tipo="peligro"
        titulo="¿Quitar de la lista?"
        mensaje={
          <>
            ¿Estás seguro de que deseas eliminar a{" "}
            <Text className="font-bold text-mostaza">{clienteAEliminar?.client_name}</Text> de la
            lista de espera? Su turno será cancelado.
          </>
        }
        textoConfirmar="Sí, eliminar"
        textoCancelar="Cancelar"
        cargando={eliminando}
        onConfirm={confirmarEliminacion}
        onCancel={() => {
          setModalEliminar(false);
          setClienteAEliminar(null);
        }}
      />

      {/* 2. MODAL SELECCIÓN DE MESA */}
      <Modal visible={modalAsignar} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/75">
          <View className="max-h-[75%] rounded-t-3xl border-t border-mostaza/50 bg-vino p-6">
<View className="mb-1 items-center">
              <Text style={{ fontFamily: "LaOriental" }} className="text-xl text-mostaza text-center">
                Asignar una Mesa a :
              </Text>
              <Text style={{ fontFamily: "LaOriental" }} className="text-lg text-amber-100 text-center">
                {clienteSeleccionado?.client_name}
              </Text>
            </View>
            <Text className="text-center text-xs text-amber-100/70 mt-1 mb-4">
              Selecciona una mesa disponible
            </Text>

            {mesasLibres.length === 0 ? (
              <View className="py-8 items-center">
                <Image
                  source={require("../../assets/images/important-y.png")}
                  className="h-10 w-10"
                  resizeMode="contain"
                />
                <Text className="mt-2 text-center text-xs text-amber-200">
                  No hay mesas disponibles en este momento.
                </Text>
              </View>
            ) : (
              <>
              <ScrollView
                pagingEnabled
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: ALTO_PAGINA_MESAS }}
              >
                {mesasPorPagina.map((grupo, index) => (
                  <View key={index} style={{ height: ALTO_PAGINA_MESAS }} className="px-1 pt-1">
                    <View className="gap-2.5">
                      {grupo.map((m) => (
                        <TouchableOpacity
                          key={m.id}
                          disabled={asignando}
                          onPress={() => confirmarAsignacion(m)}
                          className="flex-row items-center justify-between rounded-xl border border-mostaza/30 bg-black/30 p-3.5 active:bg-black/50"
                        >
                          <View className="flex-1 mr-3">
                            <View className="flex-row items-center">
                              <Text className="text-base font-bold text-mostaza">
                                Mesa #{m.numero}
                              </Text>
                              <Text className="mx-1 text-base font-bold text-mostaza">•</Text>
                              <Image
                                source={TIPO_MESA_INFO[m.tipo].icono}
                                className="h-4 w-4"
                                resizeMode="contain"
                              />
                            </View>
                            <Text className="mt-0.5 text-xs text-amber-100/70">
                              {TIPO_MESA_INFO[m.tipo].etiqueta} • {m.comensales} personas
                            </Text>
                          </View>
                          <Text className="text-xs font-bold uppercase text-emerald-400">
                            Seleccionar →
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
              </ScrollView>
              </>
            )}

            <TouchableOpacity
              disabled={asignando}
              onPress={() => {
                setModalAsignar(false);
                setClienteSeleccionado(null);
              }}
              className="mt-4 self-center rounded-xl bg-mostaza px-8 py-3"
            >
              <Text style={{ fontFamily: "LaOriental" }} className="text-center text-xs text-vino">
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 3. MODAL INFORMATIVO / FEEDBACK */}
      <FeedbackModal
        visible={modalFeedback.visible}
        tipo={modalFeedback.tipo}
        titulo={modalFeedback.titulo}
        mensaje={modalFeedback.mensaje}
        onClose={() => setModalFeedback((prev) => ({ ...prev, visible: false }))}
      />

      {/* SPINNER */}
      <CompanySpinner visible={asignando} mensaje="Asignando mesa y notificando al cliente..." />
      <CompanySpinner visible={eliminando} mensaje="Quitando cliente de la lista de espera..." />
    </View>
  );
}