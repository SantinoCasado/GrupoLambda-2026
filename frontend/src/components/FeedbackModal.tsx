// src/components/FeedbackModal.tsx
import React from "react";
import { Modal, View, Text, TouchableOpacity } from "react-native";

interface FeedbackModalProps {
  visible: boolean;
  tipo: "exito" | "error" | "informacion";
  titulo: string;
  mensaje: string;
  onClose: () => void;
}

export function FeedbackModal({ visible, tipo, titulo, mensaje, onClose }: FeedbackModalProps) {
  const estilos = {
    exito: { borde: "border-mostaza", fondoIcono: "bg-caramelo", icono: "✓" },
    error: { borde: "border-terracota", fondoIcono: "bg-terracota", icono: "✕" },
    informacion: { borde: "border-caramelo", fondoIcono: "bg-calabaza", icono: "ℹ" },
  }[tipo];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 items-center justify-center bg-vino/85 px-6">
        <View className={`w-full max-w-sm rounded-3xl border-2 bg-vino p-6 shadow-2xl ${estilos.borde}`}>
          <View className="items-center">
            <View className={`mb-4 h-16 w-16 items-center justify-center rounded-full ${estilos.fondoIcono}`}>
              <Text className="text-3xl font-black text-mostaza">{estilos.icono}</Text>
            </View>
            <Text className="mb-2 text-center text-xl font-black tracking-wide text-mostaza">
              {titulo}
            </Text>
            <Text className="mb-6 text-center text-sm font-medium leading-5 text-amber-100">
              {mensaje}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="w-full rounded-2xl bg-mostaza py-3.5 shadow-md active:bg-caramelo"
            >
              <Text className="text-center font-black uppercase tracking-wider text-vino">
                Aceptar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}