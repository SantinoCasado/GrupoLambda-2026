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
  exito: {
    borde: "border-vino",
    fondo: "bg-mostaza",
    fondoIcono: "bg-vino",
    colorIcono: "text-mostaza",
    icono: "✓",
    colorTitulo: "text-vino",
    colorMensaje: "text-vino",
    colorButton: "bg-vino",
    colorButtonText: "text-mostaza",
  },
  error: {
    borde: "border-mostaza",
    fondo: "bg-vino",
    fondoIcono: "bg-mostaza",
    colorIcono: "text-vino",
    colorTitulo: "text-mostaza",
    colorMensaje: "text-mostaza",
    colorButton: "bg-mostaza",
    colorButtonText: "text-vino",
    icono: "✕",
  },
  informacion: {
    borde: "border-caramelo",
    fondo: "bg-terracota",
    fondoIcono: "bg-calabaza",
    colorIcono: "text-mostaza",
    colorTitulo: "text-mostaza",
    colorMensaje: "text-mostaza",
    icono: "ℹ",
  },
}[tipo];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 items-center justify-center  px-6">
        <View className={`w-full max-w-sm rounded-3xl border-2 p-6 shadow-2xl ${estilos.borde} ${estilos.fondo}`}>
          <View className="items-center">
            <View className={`mb-4 h-16 w-16 items-center justify-center rounded-full ${estilos.fondoIcono}`}>
              <Text className={`text-3xl font-black ${estilos.colorIcono}`}>{estilos.icono}</Text>
            </View>
            <Text className={`mb-2 text-center text-xl font-black tracking-wide ${estilos.colorTitulo}`}>
              {titulo}
            </Text>
            <Text className={`mb-6 text-center text-sm font-medium leading-5 ${estilos.colorMensaje}`}>
              {mensaje}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className={`w-full rounded-2xl ${estilos.colorButton} py-3.5 shadow-md active:bg-caramelo`}
            >
              <Text className={`text-center font-black uppercase tracking-wider ${estilos.colorButtonText}`}>
                Aceptar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}