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
  const modules = useMemo(() => encode("https://nativelet.netlify.app/"), []);
  return (
    <View style={{ alignItems: "center", gap: 18 }}>
      <OrbitQR
        modules={modules}
        size={300}
        showCode={showCode}
        label="QR code for nativelet.netlify.app"
      />
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
