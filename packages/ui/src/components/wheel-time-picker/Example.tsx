import React, { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { WheelTimePicker, type WheelTime, type WheelTimePickerHandle } from "./WheelTimePicker";

export default function Example({ onFeedback }: { onFeedback?: (event: "tick" | "settle") => void }) {
  const ref = useRef<WheelTimePickerHandle>(null);
  const [slow, setSlow] = useState(false);
  const [time, setTime] = useState<WheelTime>({ hour: 7, minute: 30, period: "AM" });
  const chip = (on: boolean) => ({
    paddingVertical: 9, paddingHorizontal: 13, borderRadius: 24, borderWidth: 1,
    backgroundColor: on ? "#1c212b" : "#eeeade", borderColor: on ? "#1c212b" : "#c7caba",
  });
  return (
    <View style={{ alignItems: "center", gap: 12, paddingVertical: 14 }}>
      <WheelTimePicker ref={ref} slowMotion={slow} onFeedback={onFeedback} onChange={setTime} />
      <Text style={{ fontSize: 14, color: "#2a2f3a" }}>{time.hour}:{String(time.minute).padStart(2, "0")} {time.period}</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable accessibilityRole="button" onPress={() => ref.current?.spinDemo()} style={chip(true)}>
          <Text style={{ fontSize: 12, color: "#fff" }}>Spin for me</Text>
        </Pressable>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: slow }} onPress={() => setSlow((v) => !v)} style={chip(slow)}>
          <Text style={{ fontSize: 12, color: slow ? "#fff" : "#2a2f3a" }}>Slow motion: {slow ? "on" : "off"}</Text>
        </Pressable>
      </View>
      <Text style={{ fontSize: 12, color: "#63705f" }}>Drag or fling a drum. It coasts and snaps to a row.</Text>
    </View>
  );
}
