import React, { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { Skia, matchFont, useFont } from "@shopify/react-native-skia";

const GEIST = require("../text-morph/fonts/Geist-Regular.ttf");
import { GenieDismiss } from "./GenieDismiss";
const card = { x: 24, y: 20, width: 292, height: 290 };
export default function Example() {
  const [minimized, setMinimized] = useState(false),
    [slow, setSlow] = useState(false),
    [left, setLeft] = useState(false);
  const target = { x: left ? 52 : 288, y: 382 };
  // Geist (OFL, bundled with Text Morph) for the sans text; the demo renders once the font has loaded.
  const geist16 = useFont(GEIST, 16),
    geist18 = useFont(GEIST, 18);
  const image = useMemo(() => {
    if (!geist16 || !geist18) return null;
    const surface = Skia.Surface.MakeOffscreen(584, 580);
    if (!surface) throw new Error("Unable to prepare card texture");
    const c = surface.getCanvas(),
      paint = Skia.Paint();
    paint.setAntiAlias(true);
    c.clear(Skia.Color("transparent"));
    paint.setColor(Skia.Color("#e9e6db"));
    c.drawRRect(Skia.RRectXY(Skia.XYWHRect(0, 0, 584, 580), 30, 30), paint);
    const serif = Platform.OS === "ios" ? "Georgia" : "serif";
    const label = geist16;
    const title = matchFont({ fontFamily: serif, fontSize: 50, fontWeight: "600" });
    const note = geist18;
    paint.setColor(Skia.Color("#315843"));
    c.drawText("FIELD NOTES / 019", 36, 50, paint, label);
    c.drawText("A little room", 36, 124, paint, title);
    c.drawText("to wander.", 36, 180, paint, title);
    paint.setColor(Skia.Color("#ae8655"));
    c.drawCircle(392, 355, 142, paint);
    paint.setColor(Skia.Color("#315843"));
    c.drawCircle(240, 396, 108, paint);
    paint.setColor(Skia.Color("#b7c7a0"));
    c.drawCircle(432, 406, 80, paint);
    paint.setColor(Skia.Color("#315843"));
    c.drawText("Take the long way home.", 36, 544, paint, note);
    surface.flush();
    const snapshot = surface.makeImageSnapshot(),
      copy = snapshot.makeNonTextureImage();
    snapshot.dispose();
    surface.dispose();
    paint.dispose();
    if (!copy) throw new Error("Unable to copy card texture");
    return copy;
  }, [geist16, geist18]);
  useEffect(() => () => image?.dispose(), [image]);
  if (!image) return null;
  return (
    <View style={{ alignItems: "center", gap: 10, paddingVertical: 14 }}>
      <View style={{ width: 340, height: 430, borderRadius: 18, overflow: "hidden", backgroundColor: "#f4f1e9" }}>
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
          <Text style={{ color: "#fff", fontSize: 22 }}>↓</Text>
        </View>
        <GenieDismiss
          image={image}
          width={340}
          height={430}
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
        style={{ paddingVertical: 12, paddingHorizontal: 22, backgroundColor: "#315843", borderRadius: 24 }}
      >
        <Text style={{ color: "#fff", fontSize: 14, fontFamily: "Geist-Regular" }}>
          {minimized ? "Restore card" : "Minimize card"}
        </Text>
      </Pressable>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: slow }}
          onPress={() => setSlow((v) => !v)}
          style={{ paddingVertical: 9, paddingHorizontal: 13, borderRadius: 24, backgroundColor: "#eeeade", borderWidth: 1, borderColor: "#c7caba" }}
        >
          <Text style={{ fontSize: 12, color: "#315843", fontFamily: "Geist-Regular" }}>Slow motion: {slow ? "on" : "off"}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setMinimized(false);
            setLeft((v) => !v);
          }}
          style={{ paddingVertical: 9, paddingHorizontal: 13, borderRadius: 24, backgroundColor: "#eeeade", borderWidth: 1, borderColor: "#c7caba" }}
        >
          <Text style={{ fontSize: 12, color: "#315843", fontFamily: "Geist-Regular" }}>Target: {left ? "left" : "right"}</Text>
        </Pressable>
      </View>
      <Text style={{ fontSize: 12, color: "#63705f", fontFamily: "Geist-Regular" }}>
        Drag down to tuck away. Drag up to bring it back.
      </Text>
    </View>
  );
}
