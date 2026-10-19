import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Prism } from "./Prism";

export default function Example({ onFeedback }: { onFeedback?: (event: "touch" | "release") => void }) {
  const [mono, setMono] = useState(false);
  const chip = (on: boolean) => ({
    paddingVertical: 9, paddingHorizontal: 13, borderRadius: 24, borderWidth: 1,
    backgroundColor: on ? "#315843" : "#eeeade", borderColor: on ? "#315843" : "#c7caba",
  });
  return (
    <View style={{ alignItems: "center", gap: 10, paddingVertical: 14 }}>
      <Prism monochromatic={mono} onFeedback={onFeedback} />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: mono }} onPress={() => setMono((v) => !v)} style={chip(mono)}>
          <Text style={{ fontSize: 12, color: mono ? "#fff" : "#315843", fontFamily: "Geist-Regular" }}>Light: {mono ? "sodium 589 nm" : "white"}</Text>
        </Pressable>
      </View>
      <Text style={{ fontSize: 12, color: "#63705f", fontFamily: "Geist-Regular" }}>Drag the prism into the beam. White light splits; a single colour only bends.</Text>
    </View>
  );
}
