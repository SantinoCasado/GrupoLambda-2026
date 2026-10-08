import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Vibration,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { supabase } from "../config/supabase";
import { ChineseFrame } from "../components/ChineseFrame";
import { ConfirmModal } from "../components/ConfirmModal";
import { FeedbackModal } from "../components/FeedbackModal";
import {
  obtenerTicketsCocinaApi,
  obtenerTicketsBarApi,
  obtenerMetadatosProductosApi,
  marcarItemListoApi,
  eliminarPedidoApi,
  obtenerEstadoPedidoApi,
  ProductoMetadatos,
  TicketsPedido,
} from "../services/pedidosService";

interface Props {
  rol: "cocinero" | "cantinero";
}

interface Temporizador {
  inicio: number;
  duracionSeg: number;
}

export default function PreparacionScreen({ rol }: Props) {
  const esBar = rol === "cantinero";
  const titulo = esBar ? "Bar" : "Cocina";

  const [tickets, setTickets] = useState<TicketsPedido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [metadatos, setMetadatos] = useState<Record<string, ProductoMetadatos>>({});
  const [temporizadores, setTemporizadores] = useState<Record<string, Temporizador>>({});
  const [ahora, setAhora] = useState(Date.now());
  const [pagina, setPagina] = useState(0);
  const [altoPagina, setAltoPagina] = useState(0);
  const [espera, setEspera] = useState<Record<string, TicketsPedido>>({});
  const [completos, setCompletos] = useState<TicketsPedido[]>([]);
  const [marcandoId, setMarcandoId] = useState<string | null>(null);
  const [confirmandoEliminar, setConfirmandoEliminar] = useState<TicketsPedido | null>(null);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    visible: boolean;
    tipo: "exito" | "error" | "informacion";
    titulo: string;
    mensaje: string;
  }>({ visible: false, tipo: "exito", titulo: "", mensaje: "" });
  const scrollRef = useRef<ScrollView>(null);

  const completosVisibles = completos.filter(
    (c) => !tickets.some((t) => t.id === c.id)
  );
  const totalPaginas = tickets.length + completosVisibles.length;

  const avisadosRef = useRef<Set<string>>(new Set());

  const cargarTickets = useCallback(async () => {
    try {
      setCargando(true);
      const [data, mapa] = await Promise.all([
        esBar ? obtenerTicketsBarApi() : obtenerTicketsCocinaApi(),
        obtenerMetadatosProductosApi(),
      ]);
      setTickets(data);
      setMetadatos(mapa);
    } catch (err: any) {
      console.warn("Error cargando tickets de preparación:", err?.message);
    } finally {
      setCargando(false);
    }
  }, [esBar]);

  useEffect(() => {
    cargarTickets();

    const canal = supabase
      .channel(`preparacion_${rol}_channel`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => cargarTickets()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [cargarTickets, rol]);

  useEffect(() => {
    setTemporizadores((prev) => {
      const ids = new Set(tickets.map((t) => t.id));
      const entradas = Object.entries(prev).filter(([id]) => ids.has(id));
      if (entradas.length === Object.keys(prev).length) return prev;
      return Object.fromEntries(entradas);
    });
  }, [tickets]);

  useEffect(() => {
    if (totalPaginas > 0 && pagina >= totalPaginas) {
      setPagina(totalPaginas - 1);
    }
  }, [totalPaginas, pagina]);

  const hayActivos = Object.values(temporizadores).some(
    (t) => t.inicio + t.duracionSeg * 1000 > ahora
  );

  useEffect(() => {
    if (!hayActivos) return;
    const intervalo = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(intervalo);
  }, [hayActivos]);

  useEffect(() => {
    for (const [id, t] of Object.entries(temporizadores)) {
      const terminado = t.inicio + t.duracionSeg * 1000 <= ahora;
      if (terminado && !avisadosRef.current.has(id)) {
        avisadosRef.current.add(id);
        Vibration.vibrate([0, 60]);
      }
    }
  }, [ahora, temporizadores]);

  const minutosPreparacion = (ticket: TicketsPedido): number => {
    let max = 0;
    for (const it of ticket.order_items || []) {
      const minutos =
        Number(it.products?.prep_time) || metadatos[it.products?.id ?? ""]?.prepTime || 0;
      if (minutos > max) max = minutos;
    }
    return Math.max(1, max);
  };

  const fotoProducto = (productId: string | undefined) =>
    metadatos[productId ?? ""]?.fotos[0] || undefined;

  const empezarPreparar = (ticket: TicketsPedido) => {
    Vibration.vibrate([0, 40]);
    avisadosRef.current.delete(ticket.id);
    setAhora(Date.now());
    setTemporizadores((prev) => ({
      ...prev,
      [ticket.id]: {
        inicio: Date.now(),
        duracionSeg: minutosPreparacion(ticket) * 60,
      },
    }));
  };

  const marcarListo = async (ticket: TicketsPedido) => {
    setEspera((prev) => ({ ...prev, [ticket.id]: ticket }));
    setMarcandoId(ticket.id);
    try {
      for (const it of ticket.order_items || []) {
        await marcarItemListoApi(it.id);
      }
      const pedido = await obtenerEstadoPedidoApi(ticket.id);
      if (pedido.status === "ready" || pedido.status === "delivered") {
        setEspera((prev) => {
          const copia = { ...prev };
          const snap = copia[ticket.id];
          delete copia[ticket.id];
          if (snap) {
            setCompletos((c) =>
              c.some((t) => t.id === snap.id) ? c : [...c, snap]
            );
          }
          return copia;
        });
        Vibration.vibrate([0, 60]);
      }
    } catch (err: any) {
      setEspera((prev) => {
        const copia = { ...prev };
        delete copia[ticket.id];
        return copia;
      });
      setFeedback({
        visible: true,
        tipo: "error",
        titulo: "Error",
        mensaje: err?.message || "No se pudo marcar el ticket como listo.",
      });
    } finally {
      setMarcandoId(null);
    }
  };

  const solicitarEliminar = (ticket: TicketsPedido) => {
    setConfirmandoEliminar(ticket);
  };

  const ejecutarEliminar = async () => {
    const ticket = confirmandoEliminar;
    if (!ticket) return;
    setEliminandoId(ticket.id);
    try {
      await eliminarPedidoApi(ticket.id);
      setCompletos((prev) => prev.filter((t) => t.id !== ticket.id));
      setConfirmandoEliminar(null);
      setFeedback({
        visible: true,
        tipo: "exito",
        titulo: "Pedido eliminado",
        mensaje: `El pedido de la Mesa #${
          ticket.restaurant_tables?.table_number ?? "S/N"
        } se eliminó de la base de datos.`,
      });
    } catch (err: any) {
      setConfirmandoEliminar(null);
      setFeedback({
        visible: true,
        tipo: "error",
        titulo: "No se pudo eliminar",
        mensaje: err?.message || "Ocurrió un error al eliminar el pedido.",
      });
    } finally {
      setEliminandoId(null);
    }
  };

  useEffect(() => {
    const idsEspera = Object.keys(espera);
    if (idsEspera.length === 0) return;
    const idsEnLista = new Set(tickets.map((t) => t.id));
    const faltantes = idsEspera.filter((id) => !idsEnLista.has(id));
    if (faltantes.length === 0) return;

    for (const id of faltantes) {
      const snap = espera[id];
      if (!snap) continue;
      obtenerEstadoPedidoApi(id)
        .then((pedido) => {
          if (pedido.status === "ready" || pedido.status === "delivered") {
            setEspera((prev) => {
              const copia = { ...prev };
              delete copia[id];
              return copia;
            });
            setCompletos((prev) =>
              prev.some((t) => t.id === id) ? prev : [...prev, snap]
            );
            Vibration.vibrate([0, 60]);
          } else if (pedido.status === "cancelled" || pedido.status === "received") {
            setEspera((prev) => {
              const copia = { ...prev };
              delete copia[id];
              return copia;
            });
          }
        })
        .catch(() => {});
    }
  }, [tickets, espera]);

  const restanteSeg = (t: Temporizador): number =>
    Math.max(0, Math.ceil((t.inicio + t.duracionSeg * 1000 - ahora) / 1000));

  const formatoReloj = (seg: number): string => {
    const m = Math.floor(seg / 60);
    const s = seg % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <View className="flex-1">
      <StatusBar style="light" />

      <View className="px-6 pt-5">
        <Image
          source={require("../../assets/images/logo-name.png")}
          className="h-20 w-auto self-center"
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
              Inicio
            </Text>
            <Text className="mt-1 text-xs font-semibold text-amber-100">
              Seleccione una opción para comenzar
            </Text>
          </View>
        </ChineseFrame>
      </View>

      <View className="mt-4 flex-1 px-5">
        <Text
          className="mb-1 text-xs font-bold text-vino uppercase"
        >
          Tickets de {titulo}
        </Text>

        <View
          className="flex-1"
          onLayout={(e) => setAltoPagina(Math.round(e.nativeEvent.layout.height))}
        >
        {cargando ? (
          <View className="items-center justify-center py-20">
            <ActivityIndicator size="large" color="#8B1A1A" />
            <Text className="mt-3 text-xs font-bold text-vino">Cargando tickets...</Text>
          </View>
        ) : totalPaginas === 0 ? (
          <View className="mt-6 items-center justify-center bg-transparent p-8">
            <Image
              source={require("../../assets/images/yoga-y.png")}
              className="mb-3 h-12 w-12"
              resizeMode="contain"
            />
            <Text
              style={{ fontFamily: "LaOriental" }}
              className="text-base uppercase text-vino text-center"
            >
              No hay tickets pendientes
            </Text>
            <Text className="mt-1 text-center text-xs text-stone-600">
              Cuando el mozo confirme una comanda, aparecerá aquí el ticket para preparar.
            </Text>
            <TouchableOpacity
              onPress={cargarTickets}
              className="mt-3 rounded-xl border border-calabaza bg-caramelo/10 px-4 py-2"
            >
              <Text className="text-xs font-bold text-calabaza">Actualizar Tickets</Text>
            </TouchableOpacity>
          </View>
        ) : !altoPagina ? null : (
          <ScrollView
            ref={scrollRef}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
            onMomentumScrollEnd={(e) => {
              setPagina(
                Math.round(e.nativeEvent.contentOffset.y / (altoPagina || 1))
              );
            }}
          >
            {tickets.concat(completosVisibles).map((ticket) => {
              const completo = completosVisibles.some((c) => c.id === ticket.id);
              const enEspera = !completo && !!espera[ticket.id];
              const numMesa = ticket.restaurant_tables?.table_number ?? "S/N";
              const items = ticket.order_items || [];
              const temporizador = completo ? undefined : temporizadores[ticket.id];
              const restante = temporizador ? restanteSeg(temporizador) : 0;
              const terminado = temporizador ? restante <= 0 : false;

              return (
                <View key={ticket.id} style={{ height: altoPagina }} className="py-2">
                <View className="flex-1 rounded-2xl border-2 border-caramelo bg-[#FFFDF9] p-4">
                  <View className="mb-2 flex-row items-center justify-between">
                    <Text className="text-2xl text-vino" style={{ fontFamily: "LaOriental" }}>Mesa #{numMesa}</Text>
                    <View className="items-end">
                      <Text className="text-sm font-semibold text-stone-500">
                        {ticket.created_at
                          ? `${new Date(ticket.created_at).toLocaleDateString([], {
                              day: "2-digit",
                              month: "2-digit",
                            })} ${new Date(ticket.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}`
                          : ""}
                      </Text>
                      <Text className="mt-0.5 text-sm font-semibold text-caramelo">
                        ⏱ ~{minutosPreparacion(ticket)} min
                      </Text>
                      {completo ? (
                        <Text className="mt-0.5 text-xs font-bold text-emerald-700">
                          ✓ Pedido completo
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <View
                    className={`mt-2 border-b border-calabaza border-dashed pb-3 ${
                      completo ? "opacity-60" : ""
                    }`}
                  >
                    {items.map((it) => {
                      const foto = fotoProducto(it.products?.id);
                      return (
                        <View key={it.id} className="mt-1.5 flex-row items-center">
                          <View className="h-2.5 w-2.5 rounded-full bg-calabaza mb-2" />
                          <Text
                            className="ml-3 text-2xl text-calabaza"
                            numberOfLines={1}
                            ellipsizeMode="tail"
                            style={{ fontFamily: "LaOriental" }}
                          >
                            {it.quantity}x 
                          </Text>
                          {foto ? (
                            <Image
                              source={{ uri: foto }}
                              className="h-20 w-20 mx-4 rounded-lg border border-calabaza border-2 bg-stone-100"
                              resizeMode="cover"
                            />
                          ) : (
                            <View className="h-20 w-20  flex row items-center justify-center rounded-lg bg-stone-100">
                              <Text className="text-base">{esBar ? "🍹" : "🍲"}</Text>
                            </View>
                          )}
<Text
                            className="min-w-0 flex-1 text-lg text-stone-700"
                            numberOfLines={2}
                            ellipsizeMode="tail"
                          >
                            {it.products?.name || "Producto"}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  <View className="mt-auto pt-3">
                  {completo ? (
                    <TouchableOpacity
                      onPress={() => solicitarEliminar(ticket)}
                      disabled={confirmandoEliminar !== null || eliminandoId !== null}
                      className={`mt-3 w-full rounded-2xl border-2 border-terracota bg-terracota/10 py-2.5 active:bg-terracota/20 ${
                        confirmandoEliminar !== null || eliminandoId !== null ? "opacity-50" : ""
                      }`}
                    >
                      <Text
                        style={{ fontFamily: "LaOriental" }}
                        className="text-center text-sm uppercase tracking-wide text-terracota"
                      >
                        Delete
                      </Text>
                    </TouchableOpacity>
                  ) : enEspera ? (
                    <View className="mt-3 w-full items-center rounded-2xl border-2 border-caramelo bg-caramelo/10 px-4 py-3">
                      <View className="flex-row items-center">
                        <ActivityIndicator size="small" color="#8B1A1A" />
                        <Text className="ml-2 text-sm font-bold text-caramelo">
                          Esperando la otra parte...
                        </Text>
                      </View>
                      <Text className="mt-1 text-center text-[10px] font-semibold text-stone-500">
                        Se habilitará cuando la otra área termine su parte del pedido.
                      </Text>
                    </View>
                  ) : !temporizador ? (
                    <TouchableOpacity
                      onPress={() => empezarPreparar(ticket)}
                      className="mt-3 w-full rounded-2xl border-2 border-vino bg-mostaza py-2.5 active:bg-mostaza/80"
                    >
                      <Text
                        style={{ fontFamily: "LaOriental" }}
                        className="text-center text-sm uppercase tracking-wide text-vino"
                      >
                        Empezar a preparar
                      </Text>
                    </TouchableOpacity>
                  ) : terminado ? (
                    <TouchableOpacity
                      onPress={() => marcarListo(ticket)}
                      disabled={marcandoId !== null}
                      className={`mt-3 w-full rounded-2xl bg-emerald-600 py-2.5 active:bg-emerald-700 ${
                        marcandoId !== null ? "opacity-50" : ""
                      }`}
                    >
                      <Text
                        style={{ fontFamily: "LaOriental" }}
                        className="text-center text-sm uppercase tracking-wide text-white"
                      >
                        {marcandoId === ticket.id ? "Marcando..." : "Listo!"}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View className="mt-3 w-full items-center rounded-2xl border-2 border-calabaza bg-calabaza/10 py-2.5">
                      <Text className="text-lg font-black text-calabaza">
                        ⏱ {formatoReloj(restante)}
                      </Text>
                      <Text className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
                        Preparando...
                      </Text>
                    </View>
                  )}
                  </View>
                </View>
                </View>
              );
            })}
          </ScrollView>
        )}
        </View>

        <ConfirmModal
          visible={confirmandoEliminar !== null}
          titulo="Eliminar Pedido (Test)"
          mensaje={
            <>
              ¿Eliminar el pedido de la{" "}
              <Text className="font-bold text-mostaza">
                Mesa #{confirmandoEliminar?.restaurant_tables?.table_number}
              </Text>{" "}
              de la base de datos? Esta acción no se puede deshacer.
            </>
          }
          textoConfirmar="Eliminar"
          textoCancelar="Cancelar"
          tipo="peligro"
          cargando={eliminandoId !== null}
          onConfirm={ejecutarEliminar}
          onCancel={() => setConfirmandoEliminar(null)}
        />

        <FeedbackModal
          visible={feedback.visible}
          tipo={feedback.tipo}
          titulo={feedback.titulo}
          mensaje={feedback.mensaje}
          onClose={() => setFeedback((prev) => ({ ...prev, visible: false }))}
        />
      </View>
    </View>
  );
}
