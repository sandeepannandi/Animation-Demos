import React, { useEffect, useMemo, useState, useRef } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { Skia, matchFont, ClipOp, useFont } from "@shopify/react-native-skia";

const GEIST = require("../text-morph/fonts/Geist-Regular.ttf");
import { PageCurl, type PageCurlHandle } from "./PageCurl";
const COLORS = ["#e6edde", "#dce9eb", "#f0e2ce"];
export default function Example() {
  const [reduce, setReduce] = useState(false),
    [index, setIndex] = useState(0);
  const pager = useRef<PageCurlHandle>(null);
  // Geist (OFL, bundled with Text Morph) for the sans text; the demo renders once the font has loaded.
  const geist17 = useFont(GEIST, 17),
    geist15 = useFont(GEIST, 15);
  const pages = useMemo(
    () =>
      !geist17 || !geist15 ? null : COLORS.map((color, i) => {
        const surface = Skia.Surface.MakeOffscreen(600, 800);
        if (!surface) throw new Error("Unable to prepare page");
        const c = surface.getCanvas(),
          paint = Skia.Paint();
        paint.setAntiAlias(true);
        c.clear(Skia.Color(["#e7edde", "#dce9eb", "#f0e2ce"][i]));
        const serif = Platform.OS === "ios" ? "Georgia" : "serif";
        const small = geist17;
        const head = matchFont({ fontFamily: serif, fontSize: 49 });
        const body = matchFont({ fontFamily: serif, fontSize: 20 });
        const foot = geist15;
        paint.setColor(Skia.Color("#315444"));
        c.drawText("FIELD NOTES", 48, 70, paint, small);
        c.drawText(["Into the green.", "A slower tide.", "Stay curious."][i], 48, 155, paint, head);
        paint.setColor(Skia.Color(["#98b393", "#89afb5", "#cdb18a"][i]));
        c.drawCircle(305, 430, 186, paint);
        c.save();
        const clip = Skia.Path.Make();
        clip.addCircle(305, 430, 186);
        c.clipPath(clip, ClipOp.Intersect, true);
        for (let k = 0; k < 6; k++) {
          paint.setColor(Skia.Color(["#315e49", "#43767f", "#866b49"][i]));
          paint.setAlphaf(0.2 + k * 0.07);
          c.save();
          c.translate(115 + k * 82, 620 - k * 24);
          c.rotate(((-0.5 + k * 0.18) * 180) / Math.PI, 0, 0);
          c.drawOval(Skia.XYWHRect(-125, -200, 250, 400), paint);
          c.restore();
        }
        c.restore();
        paint.setAlphaf(1);
        paint.setColor(Skia.Color("#315444"));
        ["Take the long way home.", "Leave room for quiet.", "Find a little wonder."].forEach((t, k) =>
          c.drawText(t, 48, 665 + k * 29, paint, body),
        );
        c.drawText(`0${i + 1} / 03`, 48, 765, paint, foot);
        c.drawText("NATIVELET JOURNAL", 365, 765, paint, foot);
        surface.flush();
        const snapshot = surface.makeImageSnapshot();
        const image = snapshot.makeNonTextureImage();
        snapshot.dispose();
        surface.dispose();
        paint.dispose();
        if (!image) throw new Error("Unable to copy page image");
        return { image, label: `Field notes ${i + 1}` };
      }),
    [geist17, geist15],
  );
  useEffect(
    () => () => {
      pages?.forEach((p) => p.image.dispose());
    },
    [pages],
  );
  const circle = (disabled: boolean) => ({
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#d9e0d2",
    backgroundColor: "#f6f8f2",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    opacity: disabled ? 0.45 : 1,
  });
  if (!pages) return null;
  return (
    <View style={{ alignItems: "center", gap: 14, paddingVertical: 14 }}>
      <View style={{ width: 320, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 11, letterSpacing: 1.2, color: "#315444", fontFamily: "Geist-Regular" }}>FIELD NOTES</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => setReduce((v) => !v)}
          style={{ paddingVertical: 8, paddingHorizontal: 12, backgroundColor: "#f1f5eb", borderRadius: 20, borderWidth: 1, borderColor: "#d9e0d2" }}
        >
          <Text style={{ fontSize: 11, color: "#315444", fontFamily: "Geist-Regular" }}>Motion: {reduce ? "reduced" : "system"}</Text>
        </Pressable>
      </View>
      <PageCurl
        ref={pager}
        onPageChange={setIndex}
        pages={pages}
        width={320}
        height={426}
        reducedMotion={reduce ? true : undefined}
      />
      <View style={{ width: 320, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous page"
          disabled={index === 0}
          onPress={() => pager.current?.previous()}
          style={circle(index === 0)}
        >
          <Text style={{ color: "#214b3b" }}>←</Text>
        </Pressable>
        <Text style={{ fontSize: 13, color: "#214b3b", fontFamily: "Geist-Medium" }}>
          {String(index + 1).padStart(2, "0")}
          <Text style={{ color: "#8a9c8a" }}> / 03</Text>
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next page"
          disabled={index === 2}
          onPress={() => pager.current?.next()}
          style={circle(index === 2)}
        >
          <Text style={{ color: "#214b3b" }}>→</Text>
        </Pressable>
      </View>
    </View>
  );
}
