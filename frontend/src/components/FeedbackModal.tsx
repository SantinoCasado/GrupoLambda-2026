// src/components/FeedbackModal.tsx
import React from "react";
import { Modal, View, Text, TouchableOpacity } from "react-native";
import { ChineseFrame } from "./ChineseFrame";

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
    marco: "#10b981",
    fondo: "bg-[#FBE9DF]",
    fondoIcono: "bg-[#10b981]",
    colorIcono: "text-[#FBE9DF]",
    icono: "✓",
    colorTitulo: "text-vino",
    colorMensaje: "text-vino",
    colorButton: "bg-[#10b981]",
    colorButtonText: "text-[#FBE9DF]",
  },
  error: {
    marco: "#c32f27",
    fondo: "bg-[#FBE9DF]",
    fondoIcono: "bg-terracota",
    colorIcono: "text-[#FBE9DF]",
    colorTitulo: "text-vino",
    colorMensaje: "text-vino",
    colorButton: "bg-terracota",
    colorButtonText: "text-[#FBE9DF]",
    icono: "✕",
  },
  informacion: {
    marco: "#f7b538",
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
        <ChineseFrame color={estilos.marco} className={`w-full max-w-sm ${estilos.fondo} shadow-2xl`}>
          <View className={`w-full p-6`}>
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
                <Text style={{ fontFamily: "LaOriental" }} className={`text-center uppercase tracking-wider ${estilos.colorButtonText}`}>
                  Aceptar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ChineseFrame>
      </View>
    </Modal>
  );
}