import React, { ReactNode } from "react";
import { Modal, View, Text, Image, TouchableOpacity } from "react-native";
import { ChineseFrame } from "./ChineseFrame";

interface ConfirmModalProps {
  visible: boolean;
  titulo: string;
  mensaje?: string | ReactNode;
  textoConfirmar?: string;
  textoCancelar?: string;
  cargando?: boolean;
  tipo?: "confirmar" | "peligro";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  visible,
  titulo,
  mensaje = "¿Confirmar la acción?",
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
  cargando = false,
  tipo = "confirmar",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const esPeligro = tipo === "peligro";
  const icono = esPeligro
    ? require("../../assets/images/important-y.png")
    : require("../../assets/images/confirm-y.png");
  const colorBoton = "bg-mostaza";
  const colorBotonActivo = esPeligro ? "active:bg-rose-700" : "active:bg-amber-600";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-center bg-black/60 px-6">
        <ChineseFrame className="w-full max-w-sm bg-vino shadow-2xl p-3">
          <View className="items-center rounded-xl bg-mostaza/15 px-4 py-6">
            <Image source={icono} className="mb-4 h-14 w-14" resizeMode="contain" />
            <Text style={{ fontFamily: "LaOriental" }} className="mb-2 text-center text-xl uppercase tracking-wide text-mostaza">
              {titulo}
            </Text>
            <Text className="mb-6 text-center text-sm font-medium leading-5 text-amber-100">
              {mensaje}
            </Text>

            <View className="w-full flex-row gap-3">
              <TouchableOpacity
                onPress={onCancel}
                disabled={cargando}
                className="flex-1 rounded-2xl border border-vino bg-mostaza/20 py-3.5 active:bg-stone-300"
              >
                <Text style={{ fontFamily: "LaOriental" }} className="text-center uppercase tracking-wider text-mostaza">
                  {textoCancelar}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onConfirm}
                disabled={cargando}
                className={`flex-1 rounded-2xl py-3.5 ${colorBoton} ${colorBotonActivo}`}
              >
                <Text style={{ fontFamily: "LaOriental" }} className="text-center uppercase tracking-wider text-vino">
                  {textoConfirmar}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ChineseFrame>
      </View>
    </Modal>
  );
}