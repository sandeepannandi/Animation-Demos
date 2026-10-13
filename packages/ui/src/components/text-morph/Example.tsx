import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFont } from "@shopify/react-native-skia";
import { TextMorph } from "./TextMorph";
import { lighthouseImage } from "./scene";
import { LIGHTHOUSE_TEXT } from "./lighthouseText";

export default function Example() {
  const [morphed, setMorphed] = useState(false);
  const image = useMemo(() => lighthouseImage(192), []);
  // Any .ttf works. This one is Geist (SIL OFL), kept next to the component.
  const font = useFont(require("./fonts/Geist-Regular.ttf"), 12);
  return (
    <View style={{ alignItems: "center", gap: 16 }}>
      <TextMorph
        text={LIGHTHOUSE_TEXT}
        image={image}
        size={320}
        font={font}
        morphed={morphed}
        onMorphedChange={setMorphed}
        label="A lighthouse under a full moon, made of letters"
      />
      <Pressable
        accessibilityRole="button"
        onPress={() => setMorphed((v) => !v)}
        style={{
          backgroundColor: "#1c1b19",
          paddingHorizontal: 22,
          paddingVertical: 12,
          borderRadius: 999,
        }}
      >
        <Text style={{ color: "#f6f3ec", fontWeight: "600" }}>
          {morphed ? "Back to the page" : "Turn into a picture"}
        </Text>
      </Pressable>
      <Text style={{ color: "#6b665c", fontSize: 12 }}>
        Tap the page, or drag sideways to scrub.
      </Text>
    </View>
  );
}
