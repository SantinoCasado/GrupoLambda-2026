// src/screens/CarritoScreen.tsx
import React from "react";
import { View, Text, FlatList, TouchableOpacity, Image, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCart, ItemCarrito } from "../context/carritoContext";

interface CarritoScreenProps {
  onVolver: () => void;
  onConfirmarPedido: () => void;
}

export function CarritoScreen({ onVolver, onConfirmarPedido }: CarritoScreenProps) {
  const {
    carrito,
    eliminarDelCarrito,
    agregarAlCarrito,
    restarDelCarrito,
    total,
    tiempoEstimadoTotal,
    vaciarCarrito,
  } = useCart();

  const handleConfirmar = () => {
    if (carrito.length === 0) {
      Alert.alert("Carrito Vacío", "Agrega productos antes de confirmar el pedido.");
      return;
    }
    onConfirmarPedido();
  };

  const renderItem = ({ item }: { item: ItemCarrito }) => {
    const fotoPrincipal = item.fotos && item.fotos.length > 0 ? item.fotos[0] : null;

    return (
      <View className="mb-3 flex-row items-center rounded-2xl bg-white p-3 shadow-md border border-mostaza/30">
        {/* Foto miniatura o fallback con emoji */}
        {fotoPrincipal ? (
          <Image
            source={{ uri: fotoPrincipal }}
            className="h-16 w-16 rounded-xl"
            resizeMode="cover"
          />
        ) : (
          <View className="h-16 w-16 rounded-xl bg-stone-100 items-center justify-center border border-stone-200">
            <Text className="text-2xl">{item.categoria === "dish" ? "🍲" : "🍹"}</Text>
          </View>
        )}

        {/* Detalles del ítem */}
        <View className="ml-3 flex-1 justify-between">
          <Text className="font-bold text-vino text-sm" numberOfLines={1}>
            {item.nombre}
          </Text>
          <Text className="text-[11px] text-stone-500">⏱ {item.tiempoElaboracion} min</Text>
          
          <Text className="text-xs font-semibold text-stone-700 mt-1">
            ${item.precio} x {item.cantidad} ={" "}
            <Text className="font-black text-calabaza">${item.precio * item.cantidad}</Text>
          </Text>
        </View>

        {/* Controles: Botón quitar directo + Control [- cant +] */}
        <View className="items-end justify-between pl-2">
          <TouchableOpacity
            onPress={() => eliminarDelCarrito(item.id)}
            className="rounded-lg bg-terracota/20 px-2 py-0.5 mb-2 active:bg-terracota/40"
          >
            <Text className="text-[10px] font-bold text-terracota">✕ Quitar</Text>
          </TouchableOpacity>

          <View className="flex-row items-center bg-stone-100 rounded-xl px-1 py-1 border border-stone-200">
            {/* Botón Restar */}
            <TouchableOpacity
              onPress={() => restarDelCarrito(item.id)}
              className="h-6 w-6 items-center justify-center rounded-lg bg-stone-200 active:bg-stone-300"
            >
              <Text className="text-sm font-black text-stone-700">−</Text>
            </TouchableOpacity>

            {/* Cantidad */}
            <Text className="text-xs font-black text-vino px-2.5">
              {item.cantidad}
            </Text>

            {/* Botón Sumar */}
            <TouchableOpacity
              onPress={() => agregarAlCarrito(item)}
              className="h-6 w-6 items-center justify-center rounded-lg bg-vino active:bg-terracota"
            >
              <Text className="text-sm font-black text-mostaza">＋</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-amber-50 px-4 pt-2">
      {/* Encabezado */}
      <View className="flex-row items-center justify-between border-b border-mostaza/30 pb-3 mb-4">
        <TouchableOpacity onPress={onVolver} className="px-2 py-1">
          <Text className="text-vino font-bold">← Volver</Text>
        </TouchableOpacity>
        
        <Text style={{ fontFamily: "LaOriental" }} className="text-xl uppercase text-vino">
          Mi Pedido
        </Text>

        {carrito.length > 0 ? (
          <TouchableOpacity onPress={vaciarCarrito} className="px-2 py-1">
            <Text className="text-terracota text-xs font-bold">Vaciar</Text>
          </TouchableOpacity>
        ) : (
          <View className="w-12" />
        )}
      </View>

      {/* Lista de productos en la comanda */}
      <FlatList
        data={carrito}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="items-center justify-center py-24">
            <Text className="text-5xl mb-3">🛒</Text>
            <Text style={{ fontFamily: "LaOriental" }} className="text-lg uppercase text-vino">
              Tu carrito está vacío
            </Text>
            <Text className="text-xs text-stone-500 mt-1">
              Agregá platos o bebidas desde la carta para armar tu pedido.
            </Text>
          </View>
        }
      />

      {/* Resumen final y botón de envío de comanda */}
      {carrito.length > 0 && (
        <View className="border-t border-mostaza/30 pt-3 pb-4 bg-amber-50">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-xs font-medium text-stone-600">Tiempo de cocina estimado:</Text>
            <Text className="text-xs font-bold text-vino">⏱ {tiempoEstimadoTotal} min</Text>
          </View>

          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-base font-bold text-stone-800">Total comanda:</Text>
            <Text className="text-2xl font-black text-calabaza">${total}</Text>
          </View>

          <TouchableOpacity
            onPress={handleConfirmar}
            className="rounded-2xl bg-vino py-3.5 items-center active:bg-terracota shadow-md border-2 border-mostaza"
          >
            <Text style={{ fontFamily: "LaOriental" }} className="text-mostaza uppercase tracking-wider text-base font-bold">
              Confirmar Comanda
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}