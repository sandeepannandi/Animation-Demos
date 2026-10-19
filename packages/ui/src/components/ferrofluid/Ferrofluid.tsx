import React, { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, PanResponder, View, type ViewStyle } from "react-native";
import { Canvas, Fill, Shader, Skia } from "@shopify/react-native-skia";
import { useDerivedValue, useFrameCallback, useSharedValue } from "react-native-reanimated";
import {
  FERRO_DEFAULTS,
  createFerro,
  ferroDown,
  ferroMove,
  ferroRelease,
  ferroStep,
  type FerroState,
} from "./ferroMath";
import { FERRO_BACKGROUND, FERRO_H, FERRO_W } from "./ferroDesign";
import { FERRO_SHADER } from "./ferroShader";

export type FerrofluidProps = {
  slowMotion?: boolean;
  reducedMotion?: boolean;
  onFeedback?: (event: "touch" | "release") => void;
  label?: string;
  style?: ViewStyle;
};

type Pointer = { x: number; y: number; down: number; seq: number };

const SKSL = `${FERRO_SHADER}
half4 main(float2 p) {
  return half4(half3(ferrofluidColor(p)), 1.0);
}
`;

let cachedEffect: ReturnType<typeof Skia.RuntimeEffect.Make> | undefined;
function getEffect() {
  if (cachedEffect === undefined) cachedEffect = Skia.RuntimeEffect.Make(SKSL);
  return cachedEffect;
}

// Android stops presenting a canvas whose only change is a shader uniform on an
// idle screen. A 1 px layout change every frame keeps it drawing.
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

export function Ferrofluid({
  slowMotion = false,
  reducedMotion,
  onFeedback,
  label = "Black ferrofluid that grows spikes toward your finger",
  style,
}: FerrofluidProps) {
  const [systemReduce, setSystemReduce] = useState(false);
  const reduce = reducedMotion ?? systemReduce;
  const opts = useMemo(() => FERRO_DEFAULTS, []);
  const effect = useMemo(() => getEffect(), []);
  const st = useSharedValue<FerroState>(createFerro(FERRO_W / 2, FERRO_H * 0.5));
  const frame = useSharedValue(0);
  const pointer = useSharedValue<Pointer>({ x: 0, y: 0, down: 0, seq: 0 });
  const slowM = useSharedValue(false);
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
    reduceM.value = reduce;
    const fresh = createFerro(FERRO_W / 2, FERRO_H * 0.5);
    if (reduce) fresh.s = 1; // still picture: spikes standing under the middle
    st.value = fresh;
    frame.value = frame.value + 1;
  }, [reduce, reduceM, st, frame]);

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
    const s = st.value;
    const p = pointer.value;
    if (p.seq !== s.seq) {
      if (p.down && !s.down) ferroDown(s, p.x, p.y);
      else if (p.down) ferroMove(s, p.x, p.y);
      else ferroRelease(s);
      s.seq = p.seq;
    }
    const dt = Math.min(48, info.timeSincePreviousFrame ?? 16.7) / 1000;
    ferroStep(s, dt * (slowM.value ? 0.25 : 1), opts);
    frame.value = frame.value + 1;
  });

  const uniforms = useDerivedValue(() => {
    frame.value;
    const s = st.value;
    return { size: [FERRO_W, FERRO_H], mag: [s.mx, s.my, s.s, 0] };
  });

  return (
    <View
      style={[{ width: FERRO_W, height: FERRO_H, borderRadius: 18, overflow: "hidden", backgroundColor: FERRO_BACKGROUND }, style]}
      accessibilityLabel={label}
      accessibilityRole="image"
      {...pan.panHandlers}
    >
      {!reduce ? <CanvasKeepAlive /> : null}
      <Canvas pointerEvents="none" style={{ width: FERRO_W, height: FERRO_H }}>
        <Fill color={FERRO_BACKGROUND} />
        {effect ? (
          <Fill>
            <Shader source={effect} uniforms={uniforms} />
          </Fill>
        ) : null}
      </Canvas>
    </View>
  );
}
