import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, PanResponder, View, type ViewStyle } from "react-native";
import { Canvas, BlurMask, LinearGradient, Path, RoundedRect, Skia, vec } from "@shopify/react-native-skia";
import Animated, {
  interpolateColor, runOnJS, useAnimatedStyle, useDerivedValue, useFrameCallback, useSharedValue,
} from "react-native-reanimated";
import {
  WHEEL_COLS, WHEEL_CY, WHEEL_H, WHEEL_SETTLE, WHEEL_SIZES, WHEEL_SLOW, WHEEL_W,
  drumTicks, rowGeom, rowLabel, rowOffset, wheelCreate, wheelFling, wheelGrab, wheelRelease, wheelSettled, wheelStep, wheelValue,
  type WheelState,
} from "./wheelMath";
import {
  WHEEL_BAND, WHEEL_BAND_RADIUS, WHEEL_DRUM_RADIUS, WHEEL_DRUM_W, WHEEL_DRUM_X, WHEEL_SHEET_RADIUS, WHEEL_BAND_H, WHEEL_BAND_W, WHEEL_BAND_X, WHEEL_COLON_X, WHEEL_DRUM_MID, WHEEL_DRUM_TOP,
  WHEEL_FONT_SIZE, WHEEL_INK_DIM, WHEEL_INK_LIT, WHEEL_SHEET, WHEEL_SHEET_EDGE, WHEEL_TITLE, WHEEL_TITLE_Y,
} from "./wheelDesign";

export type WheelTime = { hour: number; minute: number; period: "AM" | "PM" };
export type WheelTimePickerHandle = { spinDemo: () => void; reset: () => void };
export type WheelTimePickerProps = {
  slowMotion?: boolean;
  reducedMotion?: boolean;
  onChange?: (time: WheelTime) => void;
  onFeedback?: (event: "tick" | "settle") => void;
  label?: string;
  /** Font family for every label. Defaults to the platform font; pass your app font once loaded. */
  fontFamily?: string;
  style?: ViewStyle;
};

type Ptr = { d: number; kind: number; dy: number; vy: number; seq: number };
type Shared = { value: WheelState };

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

function Row({ st, frame, d, i, ff }: { st: Shared; frame: { value: number }; d: number; i: number; ff?: string }) {
  const style = useAnimatedStyle(() => {
    frame.value;
    const m = st.value.drums[d];
    const g = rowGeom(rowOffset(m, d, i), Math.abs(m.v));
    if (!g.visible) return { opacity: 0 };
    return {
      opacity: g.a * (1 - g.blur / 9),
      color: interpolateColor(g.lit, [0, 1], [WHEEL_INK_DIM, WHEEL_INK_LIT]),
      textShadowColor: WHEEL_INK_DIM,
      textShadowRadius: g.blur * 1.4,
      transform: [{ translateY: g.y - WHEEL_CY }, { scaleY: Math.max(0.02, g.s) }, { scaleX: 0.92 + 0.08 * g.s }],
    };
  });
  return (
    <Animated.Text
      pointerEvents="none"
      style={[{
        position: "absolute", left: WHEEL_COLS[d] - 40, top: WHEEL_CY - 22, width: 80, height: 44, textAlign: "center",
        fontSize: WHEEL_FONT_SIZE, fontWeight: "500", lineHeight: 44, includeFontPadding: false, fontFamily: ff, opacity: 0,
        color: WHEEL_INK_DIM, textShadowOffset: { width: 0, height: 0 },
      }, style]}
    >
      {rowLabel(d, i)}
    </Animated.Text>
  );
}

function Ticks({ st, frame, d }: { st: Shared; frame: { value: number }; d: number }) {
  const model = useDerivedValue(() => {
    frame.value;
    const m = st.value.drums[d];
    const { ticks, blur } = drumTicks(m.p, Math.abs(m.v));
    const path = Skia.Path.Make();
    for (const t of ticks) {
      path.addRect(Skia.XYWHRect(WHEEL_COLS[d] + 27, t.y - t.w / 2, t.len, t.w));
    }
    return { path, blur, a: ticks.length ? ticks[0].a : 0 };
  });
  const path = useDerivedValue(() => model.value.path);
  const blur = useDerivedValue(() => model.value.blur);
  const sharp = useDerivedValue(() => 0.25 + 0.75 * (1 - Math.min(1, model.value.blur / 2.6)));
  return (
    <Path path={path} color={WHEEL_INK_LIT} opacity={sharp}>
      <BlurMask blur={blur} style="normal" />
    </Path>
  );
}

export const WheelTimePicker = forwardRef<WheelTimePickerHandle, WheelTimePickerProps>(function WheelTimePicker(
  {
    slowMotion = false,
    reducedMotion,
    onChange,
    onFeedback,
    fontFamily: ff,
    label = "Time picker. Three drums for hour, minute and AM or PM. Drag or fling a drum, it coasts and snaps to a row.",
    style,
  },
  ref,
) {
  const [systemReduce, setSystemReduce] = useState(false);
  const reduce = reducedMotion ?? systemReduce;
  const st = useSharedValue<WheelState>(wheelCreate());
  const frame = useSharedValue(0);
  const ptr = useSharedValue<Ptr>({ d: 0, kind: 2, dy: 0, vy: 0, seq: 0 });
  const demo = useSharedValue(0);
  const slowM = useSharedValue(false);
  const reduceM = useSharedValue(false);
  const seen = useSharedValue(0);
  const seenDemo = useSharedValue(0);
  const last = useSharedValue("");
  const latest = useRef({ onChange, onFeedback, seq: 0, demo: 0, reset: 0 });
  latest.current.onChange = onChange;
  latest.current.onFeedback = onFeedback;

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => alive && setSystemReduce(v)).catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setSystemReduce);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  useEffect(() => { slowM.value = slowMotion; }, [slowMotion, slowM]);
  useEffect(() => { reduceM.value = reduce; }, [reduce, reduceM]);

  const emit = (t: WheelTime | null, ticks: number) => {
    if (ticks > 0) latest.current.onFeedback?.("tick");
    if (t) {
      latest.current.onFeedback?.("settle");
      latest.current.onChange?.(t);
    }
  };

  const pans = useMemo(() => [0, 1, 2].map((d) => {
    const send = (kind: number, dy: number, vy: number) => {
      latest.current.seq += 1;
      ptr.value = { d, kind, dy, vy, seq: latest.current.seq };
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => send(0, 0, 0),
      onPanResponderMove: (_e, g) => send(1, g.dy, g.vy),
      onPanResponderRelease: (_e, g) => send(2, g.dy, g.vy),
      onPanResponderTerminate: (_e, g) => send(2, g.dy, 0),
      onPanResponderTerminationRequest: () => false,
    });
  }), [ptr]);

  useFrameCallback((info) => {
    const s = st.value;
    const p = ptr.value;
    if (p.seq !== seen.value) {
      seen.value = p.seq;
      if (p.kind === 2) wheelRelease(s, p.d, p.vy);
      else wheelGrab(s, p.d, p.dy);
    }
    if (demo.value !== seenDemo.value) {
      seenDemo.value = demo.value;
      wheelFling(s, 0, -16);
      wheelFling(s, 1, -58);
      wheelFling(s, 2, -7);
    }
    const dt = Math.min(48, info.timeSincePreviousFrame ?? 16.7) / 1000;
    if (reduceM.value) {
      for (let d = 0; d < 3; d++) {
        const m = s.drums[d];
        if (!m.drag && (m.v !== 0 || m.p !== Math.round(m.p))) {
          const n = WHEEL_SIZES[d];
          let r = Math.round(m.p + m.v * 0.1);
          if (d === 2) r = Math.max(0, Math.min(n - 1, r));
          m.p = r; m.v = 0; m.target = NaN; m.lastRow = r;
        }
      }
    } else {
      wheelStep(s, dt * (slowM.value ? WHEEL_SLOW : 1));
    }
    let ticks = 0;
    for (let d = 0; d < 3; d++) { ticks += s.drums[d].ticks; s.drums[d].ticks = 0; }
    let t: WheelTime | null = null;
    if (wheelSettled(s)) {
      const v = wheelValue(s);
      const key = `${v.hour}:${v.minute}:${v.period}`;
      if (key !== last.value) { last.value = key; t = v; }
    }
    if (ticks > 0 || t) runOnJS(emit)(t, ticks);
    frame.value = frame.value + 1;
  });

  useImperativeHandle(ref, () => ({
    spinDemo: () => { latest.current.demo += 1; demo.value = latest.current.demo; },
    reset: () => { st.value = wheelCreate(); last.value = ""; },
  }));

  const hourRows = useMemo(() => Array.from({ length: WHEEL_SIZES[0] }, (_, i) => i), []);
  const minRows = useMemo(() => Array.from({ length: WHEEL_SIZES[1] }, (_, i) => i), []);
  const perRows = useMemo(() => Array.from({ length: WHEEL_SIZES[2] }, (_, i) => i), []);
  const bandTop = WHEEL_CY - WHEEL_BAND_H / 2;

  return (
    <View
      style={[{ width: WHEEL_W, height: WHEEL_H, borderRadius: WHEEL_SHEET_RADIUS, backgroundColor: WHEEL_SHEET, borderWidth: 1, borderColor: WHEEL_SHEET_EDGE, overflow: "hidden" }, style]}
      accessibilityLabel={label}
    >
      {!reduce ? <CanvasKeepAlive /> : null}
      <Canvas pointerEvents="none" style={{ position: "absolute", left: -1, top: -1, width: WHEEL_W, height: WHEEL_H }}>
        <RoundedRect x={WHEEL_DRUM_X} y={54} width={WHEEL_DRUM_W} height={WHEEL_H - 108} r={WHEEL_DRUM_RADIUS}>
          <LinearGradient start={vec(0, 54)} end={vec(0, WHEEL_H - 54)} colors={[WHEEL_DRUM_TOP, WHEEL_DRUM_MID, WHEEL_DRUM_TOP]} positions={[0, 0.5, 1]} />
        </RoundedRect>
        <RoundedRect x={WHEEL_BAND_X} y={bandTop} width={WHEEL_BAND_W} height={WHEEL_BAND_H} r={WHEEL_BAND_RADIUS} color={WHEEL_BAND} />
        {[0, 1, 2].map((d) => (<Ticks key={d} st={st} frame={frame} d={d} />))}
      </Canvas>
      <Animated.Text pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: WHEEL_TITLE_Y - 11, textAlign: "center", fontSize: 13, letterSpacing: 1.2, color: WHEEL_INK_DIM, includeFontPadding: false, fontFamily: ff }}>{WHEEL_TITLE}</Animated.Text>
      {hourRows.map((i) => (<Row key={`h${i}`} st={st} frame={frame} d={0} i={i} ff={ff} />))}
      {minRows.map((i) => (<Row key={`m${i}`} st={st} frame={frame} d={1} i={i} ff={ff} />))}
      {perRows.map((i) => (<Row key={`p${i}`} st={st} frame={frame} d={2} i={i} ff={ff} />))}
      <Animated.Text pointerEvents="none" style={{ position: "absolute", left: WHEEL_COLON_X, top: WHEEL_CY - 22, width: 12, textAlign: "center", fontSize: WHEEL_FONT_SIZE, lineHeight: 44, color: WHEEL_INK_LIT, includeFontPadding: false, fontFamily: ff }}>:</Animated.Text>
      <Canvas pointerEvents="none" style={{ position: "absolute", left: -1, top: -1, width: WHEEL_W, height: WHEEL_H }}>
        <RoundedRect x={0} y={0} width={WHEEL_W} height={96} r={0}>
          <LinearGradient start={vec(0, 40)} end={vec(0, 96)} colors={[WHEEL_SHEET, "rgba(16,17,20,0)"]} />
        </RoundedRect>
        <RoundedRect x={0} y={WHEEL_H - 96} width={WHEEL_W} height={96} r={0}>
          <LinearGradient start={vec(0, WHEEL_H - 96)} end={vec(0, WHEEL_H - 40)} colors={["rgba(16,17,20,0)", WHEEL_SHEET]} />
        </RoundedRect>
      </Canvas>
      {[0, 1, 2].map((d) => (
        <View key={`g${d}`} {...pans[d].panHandlers} accessibilityLabel={["Hour", "Minute", "AM or PM"][d]} style={{ position: "absolute", left: WHEEL_COLS[d] - 48, width: 96, top: 54, height: WHEEL_H - 108 }} />
      ))}
    </View>
  );
});
