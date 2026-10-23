import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { supabase } from "../config/supabase";
import { ChineseFrame } from "../components/ChineseFrame";
import {
  obtenerTicketsCocinaApi,
  obtenerTicketsBarApi,
  TicketsPedido,
} from "../services/pedidosService";

interface Props {
  rol: "cocinero" | "cantinero";
}

export function TicketsScreen({ rol }: Props) {
  const [tickets, setTickets] = useState<TicketsPedido[]>([]);
  const [cargando, setCargando] = useState(true);

  const esBar = rol === "cantinero";

  const cargarTickets = async () => {
    try {
      setCargando(true);
      const data = esBar ? await obtenerTicketsBarApi() : await obtenerTicketsCocinaApi();
      setTickets(data);
    } catch (err: any) {
      console.warn("Error cargando tickets:", err?.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarTickets();

    // Escucha en tiempo real de nuevos tickets
    const canal = supabase
      .channel(`tickets_${rol}_channel`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => cargarTickets()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [rol]);

  const titulo = esBar ? "Bar" : "Cocina";
  const subtitulo = esBar
    ? "Tickets de bebidas en preparación"
    : "Tickets de platos en preparación";

  return (
    <View className="flex-1">
      <StatusBar style="light" />

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
                Tickets de {titulo}
              </Text>
              <Text className="mt-1 text-xs font-semibold text-amber-100">
                {subtitulo}
              </Text>
            </View>
          </ChineseFrame>
        </View>
      </View>

      {/* Contenido */}
      <View className="flex-1 px-5">
        {cargando ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color="#8B1A1A" />
            <Text className="mt-3 text-xs font-bold text-vino">Cargando tickets...</Text>
          </View>
        ) : tickets.length === 0 ? (
          <View className="items-center justify-center bg-transparent p-8 mt-6">
            <Image source={require("../../assets/images/yoga-y.png")} className="mb-3 h-12 w-12" resizeMode="contain" />
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
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            {tickets.map((ticket) => {
              const numMesa = ticket.restaurant_tables?.table_number ?? "S/N";
              const items = ticket.order_items || [];

              return (
                <View
                  key={ticket.id}
                  className="mb-4 rounded-2xl border-2 border-caramelo bg-[#FFFDF9] p-4"
                >
                  {/* Cabecera del ticket */}
                  <View className="flex-row justify-between items-center mb-2">
                    <View className="flex-row items-center">
                      <View className="h-2.5 w-2.5 rounded-full bg-amber-500 mr-2" />
                      <Text className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">
                        Ticket en {titulo}
                      </Text>
                    </View>
                    <Text className="text-[10px] text-stone-500 font-semibold">
                      {ticket.created_at
                        ? new Date(ticket.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </Text>
                  </View>

                  {/* Mesa */}
                  <Text className="text-lg font-black text-vino">Mesa #{numMesa}</Text>

                  {/* Productos */}
                  <View className="mt-2">
                    <Text className="text-[10px] font-bold text-terracota tracking-wide">
                      {esBar ? "Bebidas:" : "Platos:"}
                    </Text>
                    {items.map((it) => (
                      <Text
                        key={it.id}
                        className="text-sm text-stone-700"
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        – {it.quantity}x {it.products?.name || "Producto"}
                      </Text>
                    ))}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    </View>
  );
}