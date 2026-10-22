import React, { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { OtpVerify, type OtpVerifyHandle } from "./OtpVerify";

export default function Example({ onFeedback }: { onFeedback?: (event: "digit" | "verified" | "error") => void }) {
  const ref = useRef<OtpVerifyHandle>(null);
  const [slow, setSlow] = useState(false);
  const chip = (on: boolean) => ({
    paddingVertical: 9, paddingHorizontal: 13, borderRadius: 24, borderWidth: 1,
    backgroundColor: on ? "#315843" : "#eeeade", borderColor: on ? "#315843" : "#c7caba",
  });
  return (
    <View style={{ alignItems: "center", gap: 12, paddingVertical: 14 }}>
      <OtpVerify ref={ref} slowMotion={slow} onFeedback={onFeedback} />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable accessibilityRole="button" onPress={() => ref.current?.typeDemo()} style={chip(true)}>
          <Text style={{ fontSize: 12, color: "#fff" }}>Type code for me</Text>
        </Pressable>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: slow }} onPress={() => setSlow((v) => !v)} style={chip(slow)}>
          <Text style={{ fontSize: 12, color: slow ? "#fff" : "#315843" }}>Slow motion: {slow ? "on" : "off"}</Text>
        </Pressable>
      </View>
      <Text style={{ fontSize: 12, color: "#63705f" }}>Type four digits. It verifies by itself. 0000 is the one wrong code.</Text>
    </View>
  );
}
