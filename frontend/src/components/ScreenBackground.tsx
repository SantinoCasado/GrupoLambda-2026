import React from "react";
import { View, Image } from "react-native";

export default function ScreenBackground() {
  return (
    <>
      <View
        style={{ position: "absolute", width: "100%", height: "100%", backgroundColor: "#FFF6EC" }}
      />
      <Image
        source={require("../../assets/images/background-test-3.png")}
        style={{ position: "absolute", width: "100%", height: "100%" }}
        resizeMode="cover"
      />
    </>
  );
}