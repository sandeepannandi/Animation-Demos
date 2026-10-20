import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SandHourglass } from "./SandHourglass";

export default function Example({ onFeedback }: { onFeedback?: (event: "touch" | "release" | "flip") => void }) {
  const [slow, setSlow] = useState(false);
  const [flips, setFlips] = useState(0);
  const chip = (on: boolean) => ({
    paddingVertical: 9, paddingHorizontal: 13, borderRadius: 24, borderWidth: 1,
    backgroundColor: on ? "#315843" : "#eeeade", borderColor: on ? "#315843" : "#c7caba",
  });
  return (
    <View style={{ alignItems: "center", gap: 10, paddingVertical: 14 }}>
      <SandHourglass slowMotion={slow} flipSignal={flips} onFeedback={onFeedback} />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Flip the hourglass" onPress={() => { setFlips((v) => v + 1); onFeedback?.("flip"); }} style={chip(false)}>
          <Text style={{ fontSize: 12, color: "#315843", fontFamily: "Geist-Regular" }}>Flip</Text>
        </Pressable>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: slow }} onPress={() => setSlow((v) => !v)} style={chip(slow)}>
          <Text style={{ fontSize: 12, color: slow ? "#fff" : "#315843", fontFamily: "Geist-Regular" }}>Slow motion: {slow ? "on" : "off"}</Text>
        </Pressable>
      </View>
      <Text style={{ fontSize: 12, color: "#63705f", fontFamily: "Geist-Regular" }}>Drag sideways to tilt gravity. Fling up or down, or tap Flip, to turn it over.</Text>
    </View>
  );
}
