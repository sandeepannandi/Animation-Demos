import React, { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Skia, useTypeface, type SkFont, type SkTypeface } from "@shopify/react-native-skia";
import { FoldedPass } from "./FoldedPass";
import { PASS_H, PASS_W, passDesign, type Corners, type Item, type RectItem } from "./passDesign";

const GEIST = require("../text-morph/fonts/Geist-Regular.ttf");
const SCALE = 2;
const BOX_W = 340,
  BOX_H = 430,
  PASS_X = (BOX_W - PASS_W) / 2,
  PASS_Y = 28;
const radii = (it: RectItem): [number, number, number, number] => {
  const r = it.r ?? 0,
    c: Corners = it.corners ?? "all";
  return c === "all" ? [r, r, r, r] : c === "top" ? [r, r, 0, 0] : c === "bottom" ? [0, 0, r, r] : [0, 0, 0, 0];
};
const KAPPA = 0.5523;
function roundedPath(x: number, y: number, w: number, h: number, [tl, tr, br, bl]: number[]) {
  const p = Skia.PathBuilder.Make();
  p.moveTo(x + tl, y);
  p.lineTo(x + w - tr, y);
  p.cubicTo(x + w - tr + tr * KAPPA, y, x + w, y + tr - tr * KAPPA, x + w, y + tr);
  p.lineTo(x + w, y + h - br);
  p.cubicTo(x + w, y + h - br + br * KAPPA, x + w - br + br * KAPPA, y + h, x + w - br, y + h);
  p.lineTo(x + bl, y + h);
  p.cubicTo(x + bl - bl * KAPPA, y + h, x, y + h - bl + bl * KAPPA, x, y + h - bl);
  p.lineTo(x, y + tl);
  p.cubicTo(x, y + tl - tl * KAPPA, x + tl - tl * KAPPA, y, x + tl, y);
  p.close();
  return p.build();
}

// The paper: one atlas, fronts on the left and backs on the right, drawn once with Skia at 2x.
function drawAtlas(typeface: SkTypeface, checkedIn: boolean) {
  const design = passDesign(checkedIn);
  const surface = Skia.Surface.MakeOffscreen(PASS_W * SCALE * 2, PASS_H * SCALE * 3);
  if (!surface) throw new Error("Unable to prepare the pass texture");
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
  const drawItems = (items: Item[], ox: number, oy: number) => {
    for (const it of items) {
      paint.setColor(Skia.Color(it.color));
      if (it.k === "rect") {
        const [tl, tr, br, bl] = radii(it).map((v) => v * SCALE);
        if (tl + tr + br + bl === 0) canvas.drawRect(Skia.XYWHRect(ox + it.x * SCALE, oy + it.y * SCALE, it.w * SCALE, it.h * SCALE), paint);
        else canvas.drawPath(roundedPath(ox + it.x * SCALE, oy + it.y * SCALE, it.w * SCALE, it.h * SCALE, [tl, tr, br, bl]), paint);
      } else {
        const font = fontFor(it.size);
        const width = it.align === "left" || !it.align ? 0 : font.getTextWidth(it.text);
        const x = ox + it.x * SCALE - (it.align === "center" ? width / 2 : it.align === "right" ? width : 0);
        canvas.drawText(it.text, x, oy + it.y * SCALE, paint, font);
      }
    }
  };
  for (let p = 0; p < 3; p++) {
    drawItems(design.fronts[p], 0, p * PASS_H * SCALE);
    drawItems(design.backs[p], PASS_W * SCALE, p * PASS_H * SCALE);
  }
  surface.flush();
  const snapshot = surface.makeImageSnapshot(),
    copy = snapshot.makeNonTextureImage();
  snapshot.dispose();
  surface.dispose();
  paint.dispose();
  if (!copy) throw new Error("Unable to copy the pass texture");
  return copy;
}

// The same description rendered as real React Native views: live, selectable, pressable text at rest.
function RestItem({ it }: { it: Item }) {
  if (it.k === "rect") {
    const [tl, tr, br, bl] = radii(it);
    return (
      <View
        pointerEvents="none"
        style={{
          position: "absolute", left: it.x, top: it.y, width: it.w, height: it.h, backgroundColor: it.color,
          borderTopLeftRadius: tl, borderTopRightRadius: tr, borderBottomRightRadius: br, borderBottomLeftRadius: bl,
        }}
      />
    );
  }
  const box = 240;
  const left = it.align === "center" ? it.x - box / 2 : it.align === "right" ? it.x - box : it.x;
  return (
    <Text
      selectable={false}
      allowFontScaling={false}
      numberOfLines={1}
      style={{
        position: "absolute", left, top: it.y - it.size * 0.94, width: box, color: it.color, fontSize: it.size,
        lineHeight: Math.round(it.size * 1.2), userSelect: "none", textAlign: it.align ?? "left", includeFontPadding: false,
        fontFamily: "Geist-Regular",
        fontWeight: "400",
      }}
    >
      {it.text}
    </Text>
  );
}

export default function Example() {
  const [expanded, setExpanded] = useState(false),
    [slow, setSlow] = useState(false),
    [reduce, setReduce] = useState(false),
    [checkedIn, setCheckedIn] = useState(false);
  const typeface = useTypeface(GEIST);
  const atlas = useMemo(() => (typeface ? drawAtlas(typeface, checkedIn) : null), [typeface, checkedIn]);
  useEffect(() => () => atlas?.dispose(), [atlas]);
  const design = useMemo(() => passDesign(checkedIn), [checkedIn]);
  if (!atlas) return null;
  const chip = (on: boolean) => ({
    paddingVertical: 9, paddingHorizontal: 13, borderRadius: 24, borderWidth: 1,
    backgroundColor: on ? "#315843" : "#eeeade", borderColor: on ? "#315843" : "#c7caba",
  });
  return (
    <View style={{ alignItems: "center", gap: 10, paddingVertical: 14 }}>
      <View style={{ width: BOX_W, height: BOX_H, borderRadius: 18, backgroundColor: "#f4f1e9", overflow: "visible" }}>
        <FoldedPass
          style={{ position: "absolute", left: PASS_X, top: PASS_Y }}
          atlas={atlas}
          width={PASS_W}
          panelHeight={PASS_H}
          expanded={expanded}
          onExpandedChange={setExpanded}
          slowMotion={slow}
          reducedMotion={reduce}
        >
          <View style={{ width: PASS_W, height: PASS_H * 3 }}>
            {design.fronts.map((items, p) => (
              <View key={p} style={{ position: "absolute", left: 0, top: p * PASS_H, width: PASS_W, height: PASS_H }}>
                {items.map((it, i) => <RestItem key={i} it={it} />)}
              </View>
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={expanded ? "Fold pass" : "Open pass"}
              onPress={() => setExpanded((v) => !v)}
              style={{ position: "absolute", left: 0, top: 0, width: PASS_W, height: 52 }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={checkedIn ? "Checked in" : "Check in"}
              onPress={() => setCheckedIn(true)}
              style={{ position: "absolute", left: design.check.x, top: PASS_H + design.check.y, width: design.check.w, height: design.check.h }}
            />
          </View>
        </FoldedPass>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => setExpanded((v) => !v)}
        style={{ paddingVertical: 12, paddingHorizontal: 22, backgroundColor: "#315843", borderRadius: 24 }}
      >
        <Text style={{ color: "#fff", fontSize: 14, fontFamily: "Geist-Regular" }}>{expanded ? "Fold pass" : "Unfold pass"}</Text>
      </Pressable>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: slow }} onPress={() => setSlow((v) => !v)} style={chip(slow)}>
          <Text style={{ fontSize: 12, color: slow ? "#fff" : "#315843", fontFamily: "Geist-Regular" }}>Slow motion: {slow ? "on" : "off"}</Text>
        </Pressable>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: reduce }} onPress={() => setReduce((v) => !v)} style={chip(reduce)}>
          <Text style={{ fontSize: 12, color: reduce ? "#fff" : "#315843", fontFamily: "Geist-Regular" }}>Reduce motion: {reduce ? "on" : "off"}</Text>
        </Pressable>
      </View>
      <Text style={{ fontSize: 12, color: "#63705f", fontFamily: "Geist-Regular" }}>Drag the pass down to unfold it. Drag up to fold it.</Text>
    </View>
  );
}
