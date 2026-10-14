import React, { useState } from "react";
import { Text, View } from "react-native";
import { LightPainting } from "./LightPainting";

export default function Example() {
  const [name, setName] = useState("Night Window");
  return (
    <View style={{ alignItems: "center", gap: 16 }}>
      <Text style={{ fontSize: 10, letterSpacing: 2, color: "#52695a" }}>LIGHT ON PAINTING  <Text style={{ fontStyle: "italic", letterSpacing: 0, fontSize: 11, color: "#7a6a52" }}>{name}</Text></Text>
      <LightPainting size={320} onPaintingChange={(_, n) => setName(n)} />
      <Text style={{ color: "#61705a", fontSize: 12 }}>
        Drag the bulb to move the light. Swipe for the next painting.
      </Text>
    </View>
  );
}
