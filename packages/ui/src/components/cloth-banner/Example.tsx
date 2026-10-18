import React, { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Skia, useTypeface, type SkFont, type SkTypeface } from "@shopify/react-native-skia";
import { ClothBanner } from "./ClothBanner";
import { BANNER_H, BANNER_W, bannerDesign, type Item } from "./bannerDesign";

const GEIST = require("../text-morph/fonts/Geist-Regular.ttf");
const SCALE = 2;

// The banner artwork: one texture drawn once with Skia at 2x.
function drawBanner(typeface: SkTypeface) {
  const design = bannerDesign();
  const surface = Skia.Surface.MakeOffscreen(BANNER_W * SCALE, BANNER_H * SCALE);
  if (!surface) throw new Error("Unable to prepare the banner texture");
  const canvas = surface.getCanvas(),
    paint = Skia.Paint();
  paint.setAntiAlias(true);
  canvas.clear(Skia.Color("transparent"));
  const fonts = new Map<string, SkFont>();
  const fontFor = (size: number) => {
    let f = fonts.get(String(size));
    if (!f) {
      f = Skia.Font(typeface, size * SCALE);
      fonts.set(String(size), f);
    }
    return f;
  };
  for (const it of design as Item[]) {
    paint.setColor(Skia.Color(it.color));
    if (it.k === "rect") {
      if (!it.r) canvas.drawRect(Skia.XYWHRect(it.x * SCALE, it.y * SCALE, it.w * SCALE, it.h * SCALE), paint);
      else canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(it.x * SCALE, it.y * SCALE, it.w * SCALE, it.h * SCALE), it.r * SCALE, it.r * SCALE), paint);
    } else {
      const font = fontFor(it.size);
      const width = it.align === "left" || !it.align ? 0 : font.getTextWidth(it.text);
      const x = it.x * SCALE - (it.align === "center" ? width / 2 : it.align === "right" ? width : 0);
      canvas.drawText(it.text, x, it.y * SCALE, paint, font);
    }
  }
  surface.flush();
  const snapshot = surface.makeImageSnapshot(),
    copy = snapshot.makeNonTextureImage();
  snapshot.dispose();
  surface.dispose();
  paint.dispose();
  if (!copy) throw new Error("Unable to copy the banner texture");
  return copy;
}

export default function Example({ onFeedback }: { onFeedback?: (event: "grab" | "release") => void }) {
  const [slow, setSlow] = useState(false),
    [reduce, setReduce] = useState(false);
  const typeface = useTypeface(GEIST);
  const banner = useMemo(() => (typeface ? drawBanner(typeface) : null), [typeface]);
  useEffect(() => () => banner?.dispose(), [banner]);
  if (!banner) return null;
  const chip = (on: boolean) => ({
    paddingVertical: 9, paddingHorizontal: 13, borderRadius: 24, borderWidth: 1,
    backgroundColor: on ? "#315843" : "#eeeade", borderColor: on ? "#315843" : "#c7caba",
  });
  return (
    <View style={{ alignItems: "center", gap: 10, paddingVertical: 14 }}>
      <View style={{ borderRadius: 18, backgroundColor: "#f4f1e9" }}>
        <ClothBanner image={banner} width={BANNER_W} height={BANNER_H} slowMotion={slow} reducedMotion={reduce} onFeedback={onFeedback} />
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: slow }} onPress={() => setSlow((v) => !v)} style={chip(slow)}>
          <Text style={{ fontSize: 12, color: slow ? "#fff" : "#315843", fontFamily: "Geist-Regular" }}>Slow motion: {slow ? "on" : "off"}</Text>
        </Pressable>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: reduce }} onPress={() => setReduce((v) => !v)} style={chip(reduce)}>
          <Text style={{ fontSize: 12, color: reduce ? "#fff" : "#315843", fontFamily: "Geist-Regular" }}>Reduce motion: {reduce ? "on" : "off"}</Text>
        </Pressable>
      </View>
      <Text style={{ fontSize: 12, color: "#63705f", fontFamily: "Geist-Regular" }}>The banner hangs from two pins in a light breeze. Grab a corner and let go.</Text>
    </View>
  );
}
