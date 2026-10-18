import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { CodeReveal } from "./CodeReveal";

export default function Example({ onFeedback }: { onFeedback?: (event: "touch" | "release") => void }) {
  const [color, setColor] = useState(false);
  const [slow, setSlow] = useState(false);
  const chip = (on: boolean) => ({
    paddingVertical: 9, paddingHorizontal: 13, borderRadius: 24, borderWidth: 1,
    backgroundColor: on ? "#315843" : "#eeeade", borderColor: on ? "#315843" : "#c7caba",
  });
  return (
    <View style={{ alignItems: "center", gap: 10, paddingVertical: 14 }}>
      <CodeReveal colorGlyphs={color} slowMotion={slow} onFeedback={onFeedback} />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: color }} onPress={() => setColor((v) => !v)} style={chip(color)}>
          <Text style={{ fontSize: 12, color: color ? "#fff" : "#315843", fontFamily: "Geist-Regular" }}>Color glyphs: {color ? "on" : "off"}</Text>
        </Pressable>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: slow }} onPress={() => setSlow((v) => !v)} style={chip(slow)}>
          <Text style={{ fontSize: 12, color: slow ? "#fff" : "#315843", fontFamily: "Geist-Regular" }}>Slow motion: {slow ? "on" : "off"}</Text>
        </Pressable>
      </View>
      <Text style={{ fontSize: 12, color: "#63705f", fontFamily: "Geist-Regular" }}>Drag a finger across the picture. Move faster for a bigger brush.</Text>
    </View>
  );
}
