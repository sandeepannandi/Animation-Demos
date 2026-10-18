import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Skia, useTypeface, vec, TileMode, type SkTypeface } from "@shopify/react-native-skia";
import { FoggedGlass } from "./FoggedGlass";
import { PANE_H, PANE_W, sceneDesign, type Item } from "./sceneDesign";

const GEIST = require("../text-morph/fonts/Geist-Regular.ttf");
const SCALE = 2;

// The scene behind the glass: one texture drawn once with Skia at 2x.
function drawScene(typeface: SkTypeface) {
  const surface = Skia.Surface.MakeOffscreen(PANE_W * SCALE, PANE_H * SCALE);
  if (!surface) throw new Error("Unable to prepare the scene texture");
  const canvas = surface.getCanvas();
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  canvas.clear(Skia.Color("#131828"));
  for (const it of sceneDesign() as Item[]) {
    if (it.k === "vgrad") {
      paint.setShader(
        Skia.Shader.MakeLinearGradient(
          vec(it.x * SCALE, it.y * SCALE),
          vec(it.x * SCALE, (it.y + it.h) * SCALE),
          [Skia.Color(it.from), Skia.Color(it.to)],
          null,
          TileMode.Clamp,
        ),
      );
      canvas.drawRect(Skia.XYWHRect(it.x * SCALE, it.y * SCALE, it.w * SCALE, it.h * SCALE), paint);
      paint.setShader(null);
    } else if (it.k === "rect") {
      paint.setColor(Skia.Color(it.color));
      if (!it.r) canvas.drawRect(Skia.XYWHRect(it.x * SCALE, it.y * SCALE, it.w * SCALE, it.h * SCALE), paint);
      else canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(it.x * SCALE, it.y * SCALE, it.w * SCALE, it.h * SCALE), it.r * SCALE, it.r * SCALE), paint);
    } else if (it.k === "circle") {
      paint.setColor(Skia.Color(it.color));
      canvas.drawCircle(it.x * SCALE, it.y * SCALE, it.r * SCALE, paint);
    } else if (it.k === "poly") {
      paint.setColor(Skia.Color(it.color));
      const path = Skia.Path.Make();
      path.moveTo(it.points[0] * SCALE, it.points[1] * SCALE);
      for (let i = 2; i < it.points.length; i += 2) path.lineTo(it.points[i] * SCALE, it.points[i + 1] * SCALE);
      path.close();
      canvas.drawPath(path, paint);
    } else {
      paint.setColor(Skia.Color(it.color));
      const font = Skia.Font(typeface, it.size * SCALE);
      const width = it.align === "left" || !it.align ? 0 : font.getTextWidth(it.text);
      const x = it.x * SCALE - (it.align === "center" ? width / 2 : it.align === "right" ? width : 0);
      canvas.drawText(it.text, x, it.y * SCALE, paint, font);
    }
  }
  surface.flush();
  const snapshot = surface.makeImageSnapshot();
  const copy = snapshot.makeNonTextureImage();
  snapshot.dispose();
  surface.dispose();
  paint.dispose();
  if (!copy) throw new Error("Unable to copy the scene texture");
  return copy;
}

// The foggy read of the scene: the 2x texture drawn tiny and read back, so
// upsampling with linear filtering blurs it. No image filters needed.
function drawBlurred(scene: ReturnType<typeof drawScene>) {
  const w = 48, h = 64;
  const surface = Skia.Surface.MakeOffscreen(w, h);
  if (!surface) throw new Error("Unable to prepare the blurred texture");
  const canvas = surface.getCanvas();
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  canvas.drawImageRect(scene, Skia.XYWHRect(0, 0, scene.width(), scene.height()), Skia.XYWHRect(0, 0, w, h), paint);
  surface.flush();
  const snapshot = surface.makeImageSnapshot();
  const copy = snapshot.makeNonTextureImage();
  snapshot.dispose();
  surface.dispose();
  paint.dispose();
  if (!copy) throw new Error("Unable to copy the blurred texture");
  return copy;
}

export default function Example({ onFeedback }: { onFeedback?: (event: "wipe" | "release") => void }) {
  const [slow, setSlow] = useState(false);
  const [reduce, setReduce] = useState(false);
  const typeface = useTypeface(GEIST);
  const scene = useMemo(() => (typeface ? drawScene(typeface) : null), [typeface]);
  const blurred = useMemo(() => (scene ? drawBlurred(scene) : null), [scene]);
  React.useEffect(() => () => {
    scene?.dispose();
    blurred?.dispose();
  }, [scene, blurred]);
  if (!scene || !blurred) return null;
  const chip = (on: boolean) => ({
    paddingVertical: 9, paddingHorizontal: 13, borderRadius: 24, borderWidth: 1,
    backgroundColor: on ? "#315843" : "#eeeade", borderColor: on ? "#315843" : "#c7caba",
  });
  return (
    <View style={{ alignItems: "center", gap: 10, paddingVertical: 14 }}>
      <View style={{ borderRadius: 18, backgroundColor: "#f4f1e9" }}>
        <FoggedGlass image={scene} blurred={blurred} width={PANE_W} height={PANE_H} slowMotion={slow} reducedMotion={reduce} onFeedback={onFeedback} />
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: slow }} onPress={() => setSlow((v) => !v)} style={chip(slow)}>
          <Text style={{ fontSize: 12, color: slow ? "#fff" : "#315843", fontFamily: "Geist-Regular" }}>Slow motion: {slow ? "on" : "off"}</Text>
        </Pressable>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: reduce }} onPress={() => setReduce((v) => !v)} style={chip(reduce)}>
          <Text style={{ fontSize: 12, color: reduce ? "#fff" : "#315843", fontFamily: "Geist-Regular" }}>Reduce motion: {reduce ? "on" : "off"}</Text>
        </Pressable>
      </View>
      <Text style={{ fontSize: 12, color: "#63705f", fontFamily: "Geist-Regular" }}>A misted window at dusk. Wipe the glass; the fog creeps back.</Text>
    </View>
  );
}
