import React, { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Skia } from "@shopify/react-native-skia";
import { GenieDismiss } from "./GenieDismiss";
const card = { x: 24, y: 20, width: 272, height: 280 };
export default function Example() {
  const [minimized, setMinimized] = useState(false),
    [slow, setSlow] = useState(false),
    [left, setLeft] = useState(false);
  const target = { x: left ? 50 : 270, y: 365 };
  const image = useMemo(() => {
    const surface = Skia.Surface.MakeOffscreen(544, 560);
    if (!surface) throw new Error("Unable to prepare card texture");
    const c = surface.getCanvas(),
      paint = Skia.Paint();
    c.clear(Skia.Color("#e9e6db"));
    paint.setColor(Skia.Color("#315843"));
    c.drawRect(Skia.XYWHRect(36, 40, 210, 12), paint);
    c.drawRect(Skia.XYWHRect(36, 80, 350, 24), paint);
    paint.setColor(Skia.Color("#ae8655"));
    c.drawCircle(340, 290, 150, paint);
    paint.setColor(Skia.Color("#315843"));
    c.drawCircle(195, 350, 110, paint);
    paint.setColor(Skia.Color("#b7c7a0"));
    c.drawCircle(385, 340, 80, paint);
    paint.setColor(Skia.Color("#315843"));
    c.drawRect(Skia.XYWHRect(36, 505, 160, 10), paint);
    surface.flush();
    const snapshot = surface.makeImageSnapshot(),
      copy = snapshot.makeNonTextureImage();
    snapshot.dispose();
    surface.dispose();
    paint.dispose();
    if (!copy) throw new Error("Unable to copy card texture");
    return copy;
  }, []);
  useEffect(() => () => image.dispose(), [image]);
  return (
    <View style={{ alignItems: "center", gap: 12 }}>
      <View>
        <View
          style={{
            position: "absolute",
            left: target.x - 22,
            top: target.y - 22,
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: "#315843",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#fff" }}>↓</Text>
        </View>
        <GenieDismiss
          image={image}
          width={320}
          height={410}
          card={card}
          target={target}
          minimized={minimized}
          onMinimizedChange={setMinimized}
          slowMotion={slow}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => setMinimized((v) => !v)}
        style={{ padding: 12, backgroundColor: "#315843", borderRadius: 24 }}
      >
        <Text style={{ color: "#fff" }}>
          {minimized ? "Restore card" : "Minimize card"}
        </Text>
      </Pressable>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: slow }}
          onPress={() => setSlow((v) => !v)}
          style={{ padding: 10 }}
        >
          <Text>Slow motion: {slow ? "on" : "off"}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setMinimized(false);
            setLeft((v) => !v);
          }}
          style={{ padding: 10 }}
        >
          <Text>Target: {left ? "left" : "right"}</Text>
        </Pressable>
      </View>
      <Text style={{ fontSize: 12, color: "#63705f" }}>
        Drag down to tuck away. Drag up to bring it back.
      </Text>
    </View>
  );
}
