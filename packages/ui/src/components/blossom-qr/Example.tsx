import React, { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import qrcode from "qrcode-generator";
import { BlossomQR } from "./BlossomQR";

// Any QR encoder works. This one is MIT licensed and has no native code.
function encode(text: string) {
  const q = qrcode(0, "M");
  q.addData(text || " ");
  q.make();
  const n = q.getModuleCount();
  return Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => q.isDark(r, c)),
  );
}

export default function Example() {
  const [showCode, setShowCode] = useState(false);
  const [slow, setSlow] = useState(false);
  const [text, setText] = useState("https://nativelet.netlify.app/");
  const modules = useMemo(() => encode(text.slice(0, 120)), [text]);
  return (
    <View style={{ alignItems: "center", gap: 16 }}>
      <View style={{ width: "100%", flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20 }}><Text style={{ fontSize: 10, letterSpacing: 1.5, color: "#315444" }}>BLOSSOM QR</Text><Pressable accessibilityRole="switch" accessibilityState={{ checked: slow }} accessibilityLabel="Slow motion" onPress={() => setSlow((v) => !v)} style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: "center", borderRadius: 20, borderWidth: 1, borderColor: "#dce5d6", backgroundColor: "#f3f6ee" }}><Text style={{ fontSize: 10, color: "#315444" }}>Slow motion: {slow ? "on" : "off"}</Text></Pressable></View>
      <BlossomQR
        slowMotion={slow}
        modules={modules}
        size={320}
        showCode={showCode}
        label={`QR code for ${text}`}
      />
      <TextInput
        accessibilityLabel="QR content"
        value={text}
        onChangeText={setText}
        autoCapitalize="none"
        autoCorrect={false}
        style={{
          width: 300,
          borderWidth: 1,
          borderColor: "#c9b8ad",
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 10,
          color: "#3b1d28",
          backgroundColor: "#fffaf4",
        }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={showCode ? "Back to tree" : "Turn into QR code"}
        onPress={() => setShowCode((v) => !v)}
        style={{
          backgroundColor: "#7f1f4a",
          paddingHorizontal: 22,
          paddingVertical: 12,
          borderRadius: 999,
        }}
      >
        <Text style={{ color: "#fff4ee", fontWeight: "600" }}>
          {showCode ? "Back to tree" : "Turn into QR"}
        </Text>
      </Pressable>
    </View>
  );
}
