import React, { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, PanResponder, View, type ViewStyle } from "react-native";
import { Canvas, Fill, Shader, Skia } from "@shopify/react-native-skia";
import { useDerivedValue, useFrameCallback, useSharedValue } from "react-native-reanimated";
import {
  REVEAL_DEFAULTS,
  brushDown,
  brushMove,
  brushPresetPatch,
  brushRelease,
  brushStep,
  createBrush,
  type RevealBrush,
  type RevealPointer,
} from "./revealMath";
import { REVEAL_BACKGROUND, REVEAL_H, REVEAL_STAMPS, REVEAL_W } from "./revealDesign";
import { REVEAL_SHADER } from "./revealShader";

export type CodeRevealProps = {
  colorGlyphs?: boolean;
  slowMotion?: boolean;
  reducedMotion?: boolean;
  onFeedback?: (event: "touch" | "release") => void;
  label?: string;
  style?: ViewStyle;
};

const SKSL = `${REVEAL_SHADER}
half4 main(float2 p) {
  return half4(half3(codeRevealColor(p)), 1.0);
}
`;

let cachedEffect: ReturnType<typeof Skia.RuntimeEffect.Make> | undefined;
function getEffect() {
  if (cachedEffect === undefined) cachedEffect = Skia.RuntimeEffect.Make(SKSL);
  return cachedEffect;
}

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
  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", width: 1, height: 1, opacity: 0, transform: [{ translateX: beat % 2 }] }}
    />
  );
}

export function CodeReveal({
  colorGlyphs = false,
  slowMotion = false,
  reducedMotion,
  onFeedback,
  label = "Image that turns into glyphs under your finger",
  style,
}: CodeRevealProps) {
  const [systemReduce, setSystemReduce] = useState(false);
  const reduce = reducedMotion ?? systemReduce;
  const opts = useMemo(() => REVEAL_DEFAULTS, []);
  const effect = useMemo(() => getEffect(), []);
  const brush = useSharedValue<RevealBrush>(createBrush(opts));
  const frame = useSharedValue(0);
  const pointer = useSharedValue<RevealPointer>({ x: 0, y: 0, down: 0, seq: 0 });
  const slowM = useSharedValue(false);
  const colorM = useSharedValue(false);
  const reduceM = useSharedValue(false);
  const latest = useRef({ reduce, onFeedback, seq: 0 });
  latest.current.reduce = reduce;
  latest.current.onFeedback = onFeedback;

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (alive) setSystemReduce(v);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setSystemReduce);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  useEffect(() => {
    slowM.value = slowMotion;
  }, [slowMotion, slowM]);
  useEffect(() => {
    colorM.value = colorGlyphs;
    frame.value = frame.value + 1;
  }, [colorGlyphs, colorM, frame]);
  useEffect(() => {
    reduceM.value = reduce;
    const fresh = createBrush(opts);
    if (reduce) brushPresetPatch(fresh, REVEAL_W * 0.5, REVEAL_H * 0.55, 80, opts);
    brush.value = fresh;
    frame.value = frame.value + 1;
  }, [reduce, reduceM, brush, frame, opts]);

  const pan = useMemo(() => {
    const send = (x: number, y: number, down: number) => {
      latest.current.seq += 1;
      pointer.value = { x, y, down, seq: latest.current.seq };
    };
    return PanResponder.create({
        onStartShouldSetPanResponder: () => !latest.current.reduce,
        onPanResponderGrant: (evt) => {
          send(evt.nativeEvent.locationX, evt.nativeEvent.locationY, 1);
          latest.current.onFeedback?.("touch");
        },
        onPanResponderMove: (evt) => {
          send(evt.nativeEvent.locationX, evt.nativeEvent.locationY, 1);
        },
        onPanResponderRelease: () => {
          send(pointer.value.x, pointer.value.y, 0);
          latest.current.onFeedback?.("release");
        },
        onPanResponderTerminate: () => {
          send(pointer.value.x, pointer.value.y, 0);
        },
        onPanResponderTerminationRequest: () => false,
    });
  }, [pointer]);

  useFrameCallback((info) => {
    if (reduceM.value) return;
    const b = brush.value;
    const p = pointer.value;
    if (p.seq !== b.seq) {
      if (p.down && !b.down) brushDown(b, p.x, p.y, info.timestamp, opts);
      else if (p.down) brushMove(b, p.x, p.y, info.timestamp, opts);
      else brushRelease(b);
      b.seq = p.seq;
    }
    const dt = Math.min(48, info.timeSincePreviousFrame ?? 16.7) / 1000;
    brushStep(b, dt * (slowM.value ? 0.25 : 1), opts);
    frame.value = frame.value + 1;
  });

  const uniforms = useDerivedValue(() => {
    frame.value;
    const d = brush.value.data;
    const u: Record<string, number | number[]> = { size: [REVEAL_W, REVEAL_H], mode: colorM.value ? 1 : 0 };
    for (let i = 0; i < REVEAL_STAMPS; i++) u["s" + i] = [d[i * 4], d[i * 4 + 1], d[i * 4 + 2], d[i * 4 + 3]];
    return u;
  });

  return (
    <View
      style={[{ width: REVEAL_W, height: REVEAL_H, borderRadius: 18, overflow: "hidden", backgroundColor: REVEAL_BACKGROUND }, style]}
      accessibilityLabel={label}
      accessibilityRole="image"
      {...pan.panHandlers}
    >
      {!reduce ? <CanvasKeepAlive /> : null}
      <Canvas pointerEvents="none" style={{ width: REVEAL_W, height: REVEAL_H }}>
        <Fill color={REVEAL_BACKGROUND} />
        {effect ? (
          <Fill>
            <Shader source={effect} uniforms={uniforms} />
          </Fill>
        ) : null}
      </Canvas>
    </View>
  );
}
