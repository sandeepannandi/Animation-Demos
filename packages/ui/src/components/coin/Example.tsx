import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Coin } from "./Coin";

export default function Example({ onFeedback }: { onFeedback?: (event: "grab" | "release") => void }) {
  const [slow, setSlow] = useState(false);
  const chip = (on: boolean) => ({
    paddingVertical: 9, paddingHorizontal: 13, borderRadius: 24, borderWidth: 1,
    backgroundColor: on ? "#315843" : "#eeeade", borderColor: on ? "#315843" : "#c7caba",
  });
  return (
    <View style={{ alignItems: "center", gap: 10, paddingVertical: 14 }}>
      <Coin slowMotion={slow} onFeedback={onFeedback} />
      <Pressable accessibilityRole="switch" accessibilityState={{ checked: slow }} onPress={() => setSlow((v) => !v)} style={chip(slow)}>
        <Text style={{ fontSize: 12, color: slow ? "#fff" : "#315843", fontFamily: "Geist-Regular" }}>Slow motion: {slow ? "on" : "off"}</Text>
      </Pressable>
      <Text style={{ fontSize: 12, color: "#63705f", fontFamily: "Geist-Regular" }}>Grab the coin and flick it. It spins and wobbles on its own.</Text>
    </View>
  );
}
