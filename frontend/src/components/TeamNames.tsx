import React from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";

type TeamNamesProps = {
  className?: string;
  style?: StyleProp<ViewStyle>;
};

export function TeamNames({ className = "", style }: TeamNamesProps) {
  return (
    <View className={`items-end ${className}`} style={style}>
      <Text className="text-[10px] text-vino/70">Rocío Sanchez</Text>
      <Text className="text-[10px] text-vino/70">Santino Casado</Text>
      <Text className="text-[10px] text-vino/70">Sebastián Andreozzi</Text>
      <Text className="text-[10px] text-vino/70">Valentín Brazanovich</Text>
    </View>
  );
}
