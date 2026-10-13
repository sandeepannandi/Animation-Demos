import React from "react";
import { Text, View } from "react-native";
import { LightPainting } from "./LightPainting";

export default function Example() {
  return (
    <View style={{ alignItems: "center", gap: 16 }}>
      <LightPainting size={320} />
      <Text style={{ color: "#61705a", fontSize: 12 }}>
        Drag the bulb to move the light. Swipe for the next painting.
      </Text>
    </View>
  );
}
