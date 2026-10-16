import React, { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Skia, type SkImage } from "@shopify/react-native-skia";
import { GLTransitionPager } from "./GLTransitionPager";
import { EFFECT_LABELS, effectForTransition } from "./transitionMath";
import { SCENES, ridgePath, type Scene } from "./scenes";

const SCALE = 2;
const BOX_W = 340,
  CANVAS_H = 340;
const W = BOX_W * SCALE,
  H = CANVAS_H * SCALE;

// One landscape to one texture, drawn once with Skia at 2x: sky gradient, a sun or moon with its halo,
// then the ridges back to front.
function drawScene(scene: Scene): SkImage {
  const surface = Skia.Surface.MakeOffscreen(W, H);
  if (!surface) throw new Error("Unable to prepare the gallery texture");
  const canvas = surface.getCanvas();
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  const sky = Skia.Shader.MakeLinearGradient(
    { x: 0, y: 0 },
    { x: 0, y: H },
    [Skia.Color(scene.sky[0]), Skia.Color(scene.sky[1])],
    null,
    0,
  );
  paint.setShader(sky);
  canvas.drawRect(Skia.XYWHRect(0, 0, W, H), paint);
  paint.setShader(null);
  paint.setColor(Skia.Color(scene.body.halo));
  canvas.drawCircle(scene.body.x * W, scene.body.y * H, scene.body.r * W * 1.9, paint);
  paint.setColor(Skia.Color(scene.body.color));
  canvas.drawCircle(scene.body.x * W, scene.body.y * H, scene.body.r * W, paint);
  for (const ridge of scene.ridges) {
    const pts = ridgePath(ridge, W, H);
    const path = Skia.PathBuilder.Make();
    path.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) path.lineTo(pts[i].x, pts[i].y);
    path.close();
    paint.setColor(Skia.Color(ridge.color));
    canvas.drawPath(path.build(), paint);
  }
  surface.flush();
  const snapshot = surface.makeImageSnapshot(),
    copy = snapshot.makeNonTextureImage();
  snapshot.dispose();
  surface.dispose();
  paint.dispose();
  if (!copy) throw new Error("Unable to copy the gallery texture");
  return copy;
}

export default function Example({ onSnap }: { onSnap?: () => void } = {}) {
  const [index, setIndex] = useState(0);
  const [slow, setSlow] = useState(false);
  const [reduce, setReduce] = useState(false);
  const pages = useMemo(() => SCENES.map(drawScene), []);
  useEffect(() => () => pages.forEach((p) => p.dispose()), [pages]);
  const chip = (on: boolean) => ({
    paddingVertical: 9, paddingHorizontal: 13, borderRadius: 24, borderWidth: 1,
    backgroundColor: on ? "#315843" : "#eeeade", borderColor: on ? "#315843" : "#c7caba",
  });
  const arrow = { paddingVertical: 12, paddingHorizontal: 22, backgroundColor: "#315843", borderRadius: 24 };
  const go = (next: number) => setIndex(Math.max(0, Math.min(SCENES.length - 1, next)));
  return (
    <View style={{ alignItems: "center", gap: 10, paddingVertical: 14 }}>
      <View style={{ width: BOX_W, borderRadius: 18, backgroundColor: "#f4f1e9", paddingVertical: 18, alignItems: "center", gap: 12 }}>
        <GLTransitionPager
          pages={pages}
          labels={SCENES.map((s) => s.title)}
          width={BOX_W - 36}
          height={CANVAS_H}
          radius={16}
          index={index}
          onIndexChange={setIndex}
          slowMotion={slow}
          reducedMotion={reduce}
          label="Landscape gallery"
          onFeedback={onSnap}
        />
        <View style={{ flexDirection: "row", justifyContent: "space-between", width: BOX_W - 44 }}>
          <Text style={{ fontSize: 15, color: "#315843", fontFamily: "Geist-Regular", fontWeight: "600" }}>{SCENES[index].title}</Text>
          <Text accessibilityLiveRegion="polite" style={{ fontSize: 13, color: "#63705f", fontFamily: "Geist-Regular" }}>
            {index + 1} of {SCENES.length}
            {index < SCENES.length - 1 ? ` · next: ${EFFECT_LABELS[effectForTransition(index)]}` : ""}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {SCENES.map((s, i) => (
            <Pressable
              key={s.title}
              accessibilityRole="button"
              accessibilityLabel={`Go to ${s.title}`}
              accessibilityState={{ selected: i === index }}
              onPress={() => go(i)}
              style={{ width: 22, height: 22, alignItems: "center", justifyContent: "center" }}
            >
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: i === index ? "#315843" : "#c7caba" }} />
            </Pressable>
          ))}
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous photo" onPress={() => go(index - 1)} style={arrow}>
          <Text style={{ color: "#fff", fontSize: 14, fontFamily: "Geist-Regular" }}>← Prev</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Next photo" onPress={() => go(index + 1)} style={arrow}>
          <Text style={{ color: "#fff", fontSize: 14, fontFamily: "Geist-Regular" }}>Next →</Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: slow }} onPress={() => setSlow((v) => !v)} style={chip(slow)}>
          <Text style={{ fontSize: 12, color: slow ? "#fff" : "#315843", fontFamily: "Geist-Regular" }}>Slow motion: {slow ? "on" : "off"}</Text>
        </Pressable>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: reduce }} onPress={() => setReduce((v) => !v)} style={chip(reduce)}>
          <Text style={{ fontSize: 12, color: reduce ? "#fff" : "#315843", fontFamily: "Geist-Regular" }}>Reduce motion: {reduce ? "on" : "off"}</Text>
        </Pressable>
      </View>
      <Text style={{ fontSize: 12, color: "#63705f", fontFamily: "Geist-Regular" }}>
        Drag slowly to scrub the transition, flick to fly through. Each hop plays the next effect.
      </Text>
    </View>
  );
}
