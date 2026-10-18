import React, { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Skia, TileMode, vec } from "@shopify/react-native-skia";
import { BlackHoleLens } from "./BlackHoleLens";
import { HOLE_DEFAULTS, makeStars } from "./holeMath";
import { GALAXY, HOLE_H, HOLE_W, NEBULAE, SPACE_BACKGROUND, starColor } from "./holeDesign";

const SCALE = 2;

function drawSpace() {
  const surface = Skia.Surface.MakeOffscreen(HOLE_W * SCALE, HOLE_H * SCALE);
  if (!surface) throw new Error("Unable to prepare the starfield texture");
  const canvas = surface.getCanvas();
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  canvas.clear(Skia.Color(SPACE_BACKGROUND));
  for (const n of NEBULAE) {
    const cx = n.x * HOLE_W * SCALE;
    const cy = n.y * HOLE_H * SCALE;
    const rad = n.r * HOLE_W * SCALE;
    const [r, g, b] = n.color;
    paint.setShader(
      Skia.Shader.MakeRadialGradient(
        vec(cx, cy),
        rad,
        [Skia.Color(`rgba(${r},${g},${b},${n.alpha})`), Skia.Color(`rgba(${r},${g},${b},0)`)],
        null,
        TileMode.Clamp,
      ),
    );
    canvas.drawCircle(cx, cy, rad, paint);
    paint.setShader(null);
  }
  canvas.save();
  canvas.translate(GALAXY.x * HOLE_W * SCALE, GALAXY.y * HOLE_H * SCALE);
  canvas.rotate((GALAXY.angle * 180) / Math.PI, 0, 0);
  paint.setShader(
    Skia.Shader.MakeRadialGradient(
      vec(0, 0),
      GALAXY.rx * SCALE,
      [Skia.Color("rgba(235,238,255,0.85)"), Skia.Color("rgba(150,160,220,0.25)"), Skia.Color("rgba(150,160,220,0)")],
      [0, 0.35, 1],
      TileMode.Clamp,
    ),
  );
  canvas.save();
  canvas.scale(1, GALAXY.ry / GALAXY.rx);
  canvas.drawCircle(0, 0, GALAXY.rx * SCALE, paint);
  canvas.restore();
  paint.setShader(null);
  canvas.restore();
  for (const star of makeStars(HOLE_DEFAULTS.seed, HOLE_W, HOLE_H, HOLE_DEFAULTS.starCount)) {
    const [r, g, b] = starColor(star.tint);
    paint.setColor(Skia.Color(`rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${star.b})`));
    canvas.drawCircle(star.x * SCALE, star.y * SCALE, star.r * SCALE, paint);
  }
  surface.flush();
  const snapshot = surface.makeImageSnapshot();
  const copy = snapshot.makeNonTextureImage();
  snapshot.dispose();
  surface.dispose();
  paint.dispose();
  if (!copy) throw new Error("Unable to copy the starfield texture");
  return copy;
}

export default function Example({ onFeedback }: { onFeedback?: (event: "grab" | "release") => void }) {
  const [slow, setSlow] = useState(false);
  const [reduce, setReduce] = useState(false);
  const [planet, setPlanet] = useState(false);
  const space = useMemo(() => drawSpace(), []);
  useEffect(() => () => space.dispose(), [space]);
  const chip = (on: boolean) => ({
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 24,
    borderWidth: 1,
    backgroundColor: on ? "#315843" : "#eeeade",
    borderColor: on ? "#315843" : "#c7caba",
  });
  return (
    <View style={{ alignItems: "center", gap: 10, paddingVertical: 14 }}>
      <BlackHoleLens background={space} slowMotion={slow} reducedMotion={reduce} planet={planet} onFeedback={onFeedback} />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: slow }} onPress={() => setSlow((v) => !v)} style={chip(slow)}>
          <Text style={{ fontSize: 12, color: slow ? "#fff" : "#315843", fontFamily: "Geist-Regular" }}>Slow motion: {slow ? "on" : "off"}</Text>
        </Pressable>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: reduce }} onPress={() => setReduce((v) => !v)} style={chip(reduce)}>
          <Text style={{ fontSize: 12, color: reduce ? "#fff" : "#315843", fontFamily: "Geist-Regular" }}>Reduce motion: {reduce ? "on" : "off"}</Text>
        </Pressable>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: planet }} onPress={() => setPlanet((v) => !v)} style={chip(planet)}>
          <Text style={{ fontSize: 12, color: planet ? "#fff" : "#315843", fontFamily: "Geist-Regular" }}>Planet: {planet ? "on" : "off"}</Text>
        </Pressable>
      </View>
      <Text style={{ fontSize: 12, color: "#63705f", fontFamily: "Geist-Regular", textAlign: "center", paddingHorizontal: 16 }}>
        Drag the black hole across the starfield. Turn the planet on and drag the hole right up to it: tides stretch it at the Roche limit, then it shreds into a stream that spirals into the disk.
      </Text>
    </View>
  );
}
