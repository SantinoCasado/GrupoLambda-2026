// src/components/OptionModal.tsx
import React from "react";
import { Modal, View, Text, Image, TouchableOpacity } from "react-native";
import { ChineseFrame } from "./ChineseFrame";

interface OptionModalOption {
  etiqueta: string;
  icono?: number;
  onPress: () => void;
}

interface OptionModalProps {
  visible: boolean;
  titulo: string;
  opciones: OptionModalOption[];
  textoCancelar?: string;
  onCancel: () => void;
}

export function OptionModal({
  visible,
  titulo,
  opciones,
  textoCancelar = "Cancelar",
  onCancel,
}: OptionModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-center bg-black/60 px-6">
        <ChineseFrame className="w-full max-w-sm bg-vino shadow-2xl p-3">
          <View className="items-center rounded-xl bg-mostaza/15 px-4 py-6">
            <Text style={{ fontFamily: "LaOriental" }} className="mb-5 text-center text-xl uppercase tracking-wide text-mostaza">
              {titulo}
            </Text>

            {opciones.map((op, index) => (
              <TouchableOpacity
                key={index}
                onPress={op.onPress}
                className="mb-3 w-full items-center rounded-2xl bg-mostaza py-3.5 active:bg-amber-600"
              >
                <View className="flex-row items-center justify-center">
                  {op.icono && (
                    <Image source={op.icono} className="mr-3 h-6 w-6" resizeMode="contain" />
                  )}
                  <Text style={{ fontFamily: "LaOriental" }} className="text-center uppercase tracking-wider text-vino">
                    {op.etiqueta}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              onPress={onCancel}
              className="self-center rounded-2xl border border-vino bg-mostaza/20 px-8 py-3 active:bg-stone-300"
            >
              <Text style={{ fontFamily: "LaOriental" }} className="text-center uppercase tracking-wider text-mostaza">
                {textoCancelar}
              </Text>
            </TouchableOpacity>
          </View>
        </ChineseFrame>
      </View>
    </Modal>
  );
}