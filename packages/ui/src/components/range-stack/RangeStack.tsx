import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { AccessibilityInfo, Pressable, Text, View, type ViewStyle } from "react-native";
import {
  Canvas, Circle, Group, LinearGradient, Path, RoundedRect, Shadow, Skia, rect, rrect, vec,
} from "@shopify/react-native-skia";
import Animated, {
  interpolateColor, useAnimatedStyle, useDerivedValue, useFrameCallback, useSharedValue,
} from "react-native-reanimated";
import {
  RS_DAYS, RS_DOT_R, RS_H, RS_MAX_HOMES, RS_SETTLE, RS_SLOW, RS_STRIP_H, RS_STRIP_W, RS_STRIP_X, RS_STRIP_Y, RS_TILE, RS_W, RS_X0,
  RS_CELL_X, RS_CELL_Y, rsCellX, rsCellY, rsCreate, rsModel, rsReset, rsTap, type RsModel, type RsSel, type RsTile,
} from "./rangeMath";
import {
  RS_BAND, RS_DOT, RS_INK, RS_MUTED, RS_ROOMS, RS_SHEET, RS_SHEET_EDGE, RS_SKELETON, RS_SKELETON_HI, RS_STRIP, RS_WEEKDAYS, rsLabel,
  type RsFill, type RsPrim,
} from "./rangeDesign";

export type RangeStackHandle = { pickDemo: () => void; reset: () => void };
export type RangeStackProps = {
  slowMotion?: boolean;
  reducedMotion?: boolean;
  onFeedback?: (event: "select" | "reset") => void;
  onSave?: (range: { start: number; end: number; homes: number } | null) => void;
  label?: string;
  /** Font family for every label. Defaults to the platform font; pass your app font (for example "Geist-Medium" once loaded). */
  fontFamily?: string;
  style?: ViewStyle;
};

const DAYS = Array.from({ length: RS_DAYS }, (_, i) => i + 1);
const RS_DOT_R_CORNER = 9;
const SLOTS4 = [0, 1, 2, 3];
const SLOTS5 = Array.from({ length: RS_MAX_HOMES }, (_, i) => i);
const SLOTS3 = [0, 1, 2];
const BORDER = RS_TILE + 6;
const TILE_RRECT = rrect(rect(-RS_TILE / 2, -RS_TILE / 2, RS_TILE, RS_TILE), 6, 6);

// Android stops presenting a canvas whose only change is internal on an idle
// screen. A 1 px layout change every frame keeps it drawing.
function CanvasKeepAlive() {
  const [beat, setBeat] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      setBeat((b) => b + 1);
      requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, []);
  return <View pointerEvents="none" style={{ position: "absolute", width: 1, height: 1, opacity: 0, transform: [{ translateX: beat % 2 }] }} />;
}

type Model = { value: RsModel };

function gradientChild(f: RsFill) {
  if (typeof f === "string") return null;
  const colors = f.stops.map((s) => s[1]);
  const positions = f.stops.map((s) => s[0]);
  if ("lin" in f) return <LinearGradient start={vec(f.lin[0], f.lin[1])} end={vec(f.lin[2], f.lin[3])} colors={colors} positions={positions} />;
  return null;
}

function RoomPrim({ p }: { p: RsPrim }) {
  if (p.k === "rect") {
    const solid = typeof p.fill === "string" ? p.fill : undefined;
    return <RoundedRect x={p.x} y={p.y} width={p.w} height={p.h} r={p.r ?? 0} color={solid}>{gradientChild(p.fill)}</RoundedRect>;
  }
  if (p.k === "circle") {
    if (typeof p.fill === "string") return <Circle cx={p.x} cy={p.y} r={p.r} color={p.fill} />;
    // Radial fills are approximated by their outer colour with an inner disc.
    const f = p.fill;
    const outer = f.stops[f.stops.length - 1][1];
    const inner = f.stops[0][1];
    return (
      <>
        <Circle cx={p.x} cy={p.y} r={p.r} color={outer} />
        <Circle cx={p.x} cy={p.y} r={p.r * 0.62} color={inner} opacity={0.75} />
      </>
    );
  }
  return <RoundedRect x={Math.min(p.x1, p.x2) - (p.y1 === p.y2 ? 0 : p.w / 2)} y={Math.min(p.y1, p.y2) - (p.x1 === p.x2 ? 0 : p.w / 2)} width={Math.abs(p.x2 - p.x1) + (p.x1 === p.x2 ? p.w : 0)} height={Math.abs(p.y2 - p.y1) + (p.y1 === p.y2 ? p.w : 0)} r={p.w / 2} color={p.color} />;
}

const ROOM_ELEMENTS = RS_ROOMS.map((prims, r) => (
  <Group key={r} transform={[{ translateX: -RS_TILE / 2 }, { translateY: -RS_TILE / 2 }, { scale: RS_TILE / 100 }]}>
    {prims.map((p, i) => <RoomPrim key={i} p={p} />)}
  </Group>
));

function pickTile(m: RsModel, kind: "old" | "new" | "skel", i: number): RsTile {
  'worklet';
  return kind === "old" ? m.oldTiles[i] : kind === "new" ? m.newTiles[i] : m.skelTiles[i];
}

function TileShape({ model, kind, i }: { model: Model; kind: "old" | "new" | "skel"; i: number }) {
  const transform = useDerivedValue(() => {
    const t = pickTile(model.value, kind, i);
    return [{ translateX: t.x }, { translateY: t.y }, { rotate: (t.rot * Math.PI) / 180 }, { scale: Math.max(0.001, t.scale) }];
  });
  const opacity = useDerivedValue(() => {
    const m = model.value;
    if (kind === "skel") return Math.max(m.skeleton, m.idleGhost * 0.7);
    return pickTile(m, kind, i).alpha;
  });
  return (
    <Group transform={transform} opacity={opacity}>
      <RoundedRect x={-BORDER / 2} y={-BORDER / 2} width={BORDER} height={BORDER} r={8} color="#ffffff">
        <Shadow dx={0} dy={3} blur={4} color="rgba(40, 32, 20, 0.28)" />
      </RoundedRect>
      {kind === "skel" ? (
        <RoundedRect x={-RS_TILE / 2} y={-RS_TILE / 2} width={RS_TILE} height={RS_TILE} r={6} color={RS_SKELETON} />
      ) : (
        <Group clip={TILE_RRECT}>{ROOM_ELEMENTS[i % ROOM_ELEMENTS.length]}</Group>
      )}
    </Group>
  );
}

// Animated rounded shapes are built as Paths on the UI thread. Emulator CI
// showed the native RoundedRect rejecting the animated rect/size props the
// moment the screen mounted ("Invalid properties for rounded rect"); a Path
// has no such validation and draws the same rounded square.
function roundedPath(x: number, y: number, w: number, h: number, r: number) {
  'worklet';
  const p = Skia.Path.Make();
  const ww = Number.isFinite(w) ? Math.max(0.5, w) : 0.5;
  const hh = Number.isFinite(h) ? Math.max(0.5, h) : 0.5;
  const rr = Math.max(0, Math.min(r, ww / 2, hh / 2));
  p.addRRect(Skia.RRectXY(Skia.XYWHRect(Number.isFinite(x) ? x : 0, Number.isFinite(y) ? y : 0, ww, hh), rr, rr));
  return p;
}

function BandShape({ model, i }: { model: Model; i: number }) {
  const path = useDerivedValue(() => {
    const b = model.value.bands[i];
    const x0 = b ? b.x0 : 0;
    const x1 = b ? b.x1 : 0;
    const y = b ? b.y : 0;
    return roundedPath(x0, y - RS_DOT_R, x1 - x0, RS_DOT_R * 2, RS_DOT_R_CORNER);
  });
  const o = useDerivedValue(() => (model.value.bands[i] ? model.value.bands[i].alpha : 0));
  return <Path path={path} color={RS_BAND} opacity={o} />;
}

function DotShape({ model, i }: { model: Model; i: number }) {
  const path = useDerivedValue(() => {
    const d = model.value.dots[i];
    const k = d ? Math.max(0.001, d.scale) : 0.001;
    const h = RS_DOT_R * k;
    const cx = d ? rsCellX(d.day) : 0;
    const cy = d ? rsCellY(d.day) : 0;
    return roundedPath(cx - h, cy - h, h * 2, h * 2, RS_DOT_R_CORNER * k);
  });
  return <Path path={path} color={RS_DOT} />;
}

function DayLabel({ model, day, ff }: { model: Model; day: number; ff?: string }) {
  const style = useAnimatedStyle(() => ({ color: interpolateColor(model.value.ink[day], [0, 1], [RS_INK, "#ffffff"]) }));
  return (
    <Animated.Text
      pointerEvents="none"
      style={[{ position: "absolute", left: rsCellX(day) - 20, top: rsCellY(day) - 10, width: 40, height: 20, textAlign: "center", fontSize: 15, fontWeight: "500", lineHeight: 20, includeFontPadding: false, fontFamily: ff }, style]}
    >
      {day}
    </Animated.Text>
  );
}

export const RangeStack = forwardRef<RangeStackHandle, RangeStackProps>(function RangeStack(
  {
    slowMotion = false,
    reducedMotion,
    onFeedback,
    onSave,
    fontFamily: ff,
    label = "Date range picker. Tap a start and an end day: a skeleton appears and a fanned stack of home photos springs in.",
    style,
  },
  ref,
) {
  const [systemReduce, setSystemReduce] = useState(false);
  const reduce = reducedMotion ?? systemReduce;
  const sel = useSharedValue<RsSel>(rsCreate());
  const now = useSharedValue(0);
  const frame = useSharedValue(0);
  const slowM = useSharedValue(false);
  const reduceM = useSharedValue(false);
  const [labels, setLabels] = useState({ old: rsLabel(0), cur: rsLabel(0), live: false });
  const latest = useRef({ onFeedback, onSave });
  latest.current.onFeedback = onFeedback;
  latest.current.onSave = onSave;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => alive && setSystemReduce(v)).catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setSystemReduce);
    return () => {
      alive = false;
      sub.remove();
      timers.current.forEach(clearTimeout);
    };
  }, []);
  useEffect(() => { slowM.value = slowMotion; }, [slowMotion, slowM]);
  useEffect(() => { reduceM.value = reduce; }, [reduce, reduceM]);

  useFrameCallback((info) => {
    const dt = Math.min(48, info.timeSincePreviousFrame ?? 16.7) / 1000;
    now.value += dt * (slowM.value && !reduceM.value ? RS_SLOW : 1);
    frame.value = frame.value + 1;
  });

  const model = useDerivedValue<RsModel>(() => {
    frame.value;
    return rsModel(sel.value, now.value + (reduceM.value ? RS_SETTLE : 0));
  });

  const publish = (s: RsSel) => {
    sel.value = s;
    setLabels({ old: rsLabel(s.fFrom), cur: rsLabel(s.homes), live: s.homes > 0 });
  };
  const tap = (day: number) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    publish(rsTap(sel.value, day, now.value));
    latest.current.onFeedback?.("select");
  };
  const doReset = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    publish(rsReset(now.value, sel.value));
    latest.current.onFeedback?.("reset");
  };
  useImperativeHandle(ref, () => ({
    reset: doReset,
    pickDemo: () => {
      doReset();
      timers.current.push(setTimeout(() => tap(9), 450));
      timers.current.push(setTimeout(() => tap(13), 1350));
    },
  }));

  const labelOldStyle = useAnimatedStyle(() => ({ opacity: model.value.labelOld }));
  const labelNewStyle = useAnimatedStyle(() => ({ opacity: model.value.labelNew, transform: [{ translateY: model.value.labelNewY }] }));
  const barX = useDerivedValue(() => 36 + model.value.shimmer * 190 - 60);
  const barEnd = useDerivedValue(() => 36 + model.value.shimmer * 190 + 60);
  const barStart = useDerivedValue(() => vec(barX.value, 0));
  const barStop = useDerivedValue(() => vec(barEnd.value, 0));
  const barOpacity = useDerivedValue(() => model.value.skeleton);
  const cy = RS_STRIP_Y + RS_STRIP_H / 2;

  return (
    <View
      style={[{ width: RS_W, height: RS_H, borderRadius: 16, backgroundColor: RS_SHEET, borderWidth: 1, borderColor: RS_SHEET_EDGE, overflow: "hidden" }, style]}
      accessibilityLabel={label}
    >
      {!reduce ? <CanvasKeepAlive /> : null}
      <Canvas pointerEvents="none" style={{ position: "absolute", left: -1, top: -1, width: RS_W, height: RS_H }}>
        {SLOTS4.map((i) => <BandShape key={`b${i}`} model={model} i={i} />)}
        {SLOTS4.map((i) => <DotShape key={`d${i}`} model={model} i={i} />)}
        <RoundedRect x={RS_STRIP_X} y={RS_STRIP_Y} width={RS_STRIP_W} height={RS_STRIP_H} r={10} color={RS_STRIP} />
        <RoundedRect x={0} y={318} width={RS_W} height={1} color={RS_SHEET_EDGE} />
        <RoundedRect x={20} y={349} width={38} height={1} color={RS_INK} />
        <RoundedRect x={220} y={322} width={80} height={34} r={8} color={RS_DOT} />
        {SLOTS3.map((i) => <TileShape key={`s${i}`} model={model} kind="skel" i={i} />)}
        <RoundedRect x={36} y={cy - 6} width={92} height={12} r={4} color={RS_SKELETON} opacity={barOpacity}>
          <LinearGradient start={barStart} end={barStop} colors={[RS_SKELETON, RS_SKELETON_HI, RS_SKELETON]} />
        </RoundedRect>
        {SLOTS5.map((i) => <TileShape key={`o${i}`} model={model} kind="old" i={i} />)}
        {SLOTS5.map((i) => <TileShape key={`n${i}`} model={model} kind="new" i={i} />)}
      </Canvas>
      {RS_WEEKDAYS.map((w, c) => (
        <Text key={c} pointerEvents="none" style={{ position: "absolute", left: RS_X0 + c * RS_CELL_X - 20, top: 31, width: 40, textAlign: "center", fontSize: 12, fontWeight: "500", color: RS_MUTED, includeFontPadding: false, fontFamily: ff }}>{w}</Text>
      ))}
      {DAYS.map((d) => <DayLabel key={d} model={model} day={d} ff={ff} />)}
      {DAYS.map((d) => (
        <Pressable
          key={d}
          onPress={() => tap(d)}
          accessibilityRole="button"
          accessibilityLabel={`Day ${d}`}
          style={{ position: "absolute", left: rsCellX(d) - RS_CELL_X / 2, top: rsCellY(d) - RS_CELL_Y / 2, width: RS_CELL_X, height: RS_CELL_Y }}
        />
      ))}
      <Animated.Text pointerEvents="none" style={[{ position: "absolute", left: 36, top: cy - 10, height: 20, lineHeight: 20, fontSize: 14, fontWeight: "500", color: RS_INK, includeFontPadding: false, fontFamily: ff }, labelOldStyle]}>{labels.old}</Animated.Text>
      <Animated.Text pointerEvents="none" style={[{ position: "absolute", left: 36, top: cy - 10, height: 20, lineHeight: 20, fontSize: 14, fontWeight: "500", color: labels.live ? RS_INK : RS_MUTED, includeFontPadding: false, fontFamily: ff }, labelNewStyle]}>{labels.cur}</Animated.Text>
      <Pressable onPress={doReset} accessibilityRole="button" accessibilityLabel="Reset" hitSlop={8} style={{ position: "absolute", left: 14, top: 322, width: 60, height: 34, justifyContent: "center", alignItems: "flex-start", paddingLeft: 6 }}>
        <Text style={{ fontSize: 14, fontWeight: "500", color: RS_INK, includeFontPadding: false, fontFamily: ff }}>Reset</Text>
      </Pressable>
      <Pressable
        onPress={() => {
          const s = sel.value;
          latest.current.onSave?.(s.start > 0 && s.end > 0 ? { start: s.start, end: s.end, homes: s.homes } : null);
        }}
        accessibilityRole="button"
        accessibilityLabel="Save"
        style={{ position: "absolute", left: 220, top: 322, width: 80, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ fontSize: 14, fontWeight: "600", color: "#ffffff", includeFontPadding: false, fontFamily: ff }}>Save</Text>
      </Pressable>
    </View>
  );
});
