import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import qrcode from "qrcode-generator";
import { OrbitQR } from "./OrbitQR";

// Any QR encoder works. This one is MIT licensed and has no native code.
function encode(text: string) {
  const q = qrcode(0, "M");
  q.addData(text);
  q.make();
  const n = q.getModuleCount();
  return Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => q.isDark(r, c)),
  );
}

export default function Example() {
  const [showCode, setShowCode] = useState(false);
  const [slow, setSlow] = useState(false);
  const modules = useMemo(() => encode("https://nativelet.netlify.app/"), []);
  return (
    <View style={{ alignItems: "center", gap: 18 }}>
      <View style={{ width: "100%", flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20 }}><Text style={{ fontSize: 10, letterSpacing: 1.5, color: "#315444" }}>ORBIT QR</Text><Pressable accessibilityRole="switch" accessibilityState={{ checked: slow }} accessibilityLabel="Slow motion" onPress={() => setSlow((v) => !v)} style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: "center", borderRadius: 20, borderWidth: 1, borderColor: "#dce5d6", backgroundColor: "#f3f6ee" }}><Text style={{ fontSize: 10, color: "#315444" }}>Slow motion: {slow ? "on" : "off"}</Text></Pressable></View>
      <View style={{ borderRadius: 16, backgroundColor: "#eef3e8", overflow: "hidden" }}>
      <OrbitQR
        slowMotion={slow}
        modules={modules}
        size={300}
        showCode={showCode}
        label="QR code for nativelet.netlify.app"
      />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={showCode ? "Back to sphere" : "Turn into QR code"}
        onPress={() => setShowCode((v) => !v)}
        style={{
          backgroundColor: "#14231b",
          paddingHorizontal: 22,
          paddingVertical: 12,
          borderRadius: 999,
        }}
      >
        <Text style={{ color: "#f4f7ef", fontWeight: "600" }}>
          {showCode ? "Back to sphere" : "Turn into QR"}
        </Text>
      </Pressable>
    </View>
  );
}
