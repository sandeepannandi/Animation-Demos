import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFont } from "@shopify/react-native-skia";
import { TextMorph } from "./TextMorph";
import { PICTURE_PRESETS } from "./scene";
import { LIGHTHOUSE_TEXT } from "./lighthouseText";

export default function Example() {
  const [morphed, setMorphed] = useState(false);
  const [selected, setSelected] = useState(0);
  const image = useMemo(() => PICTURE_PRESETS[selected].image(192), [selected]);
  // Any .ttf works. This one is Geist (SIL OFL), kept next to the component.
  const font = useFont(require("./fonts/Geist-Regular.ttf"), 12);
  return (
    <View style={{ alignItems: "center", gap: 16 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
        {PICTURE_PRESETS.map((picture, index) => (
          <Pressable key={picture.id} accessibilityRole="button"
            accessibilityState={{ selected: selected === index }}
            onPress={() => { if (selected !== index) { setMorphed(false); setSelected(index); } }}
            style={{ padding: 10, borderRadius: 20, backgroundColor: selected === index ? "#345441" : "#e8e4db" }}>
            <Text style={{ color: selected === index ? "#fff" : "#345441" }}>{picture.name}</Text>
          </Pressable>
        ))}
      </View>
      <TextMorph
        key={selected}
        text={LIGHTHOUSE_TEXT}
        image={image}
        size={320}
        font={font}
        morphed={morphed}
        onMorphedChange={setMorphed}
        label={PICTURE_PRESETS[selected].label}
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
