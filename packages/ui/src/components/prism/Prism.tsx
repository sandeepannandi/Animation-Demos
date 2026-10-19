import React, { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, PanResponder, View, type ViewStyle } from "react-native";
import { Canvas, Fill, Shader, Skia } from "@shopify/react-native-skia";
import { useDerivedValue, useFrameCallback, useSharedValue } from "react-native-reanimated";
import {
  PRISM_DEFAULTS,
  createPrism,
  prismDown,
  prismMove,
  prismRelease,
  prismStep,
  prismVertices,
  tracePrism,
  type PrismState,
  type PrismTrace,
} from "./prismMath";
import { BEAM_W, BEAM_Y, DRAG_MARGIN, PRISM_BACKGROUND, PRISM_H, PRISM_REST_X, PRISM_REST_Y, PRISM_SIDE, PRISM_W } from "./prismDesign";
import { PRISM_SHADER } from "./prismShader";

export type PrismProps = {
  monochromatic?: boolean;
  reducedMotion?: boolean;
  onFeedback?: (event: "touch" | "release") => void;
  label?: string;
  style?: ViewStyle;
};

type Pointer = { x: number; y: number; down: number; seq: number };

const SKSL = `${PRISM_SHADER}
half4 main(float2 p) {
  return half4(half3(prismColor(p)), 1.0);
}
`;

let cachedEffect: ReturnType<typeof Skia.RuntimeEffect.Make> | undefined;
function getEffect() {
  if (cachedEffect === undefined) cachedEffect = Skia.RuntimeEffect.Make(SKSL);
  return cachedEffect;
}

function stillTrace(mono: boolean): PrismTrace {
  return tracePrism(0, BEAM_Y, 1, 0, PRISM_REST_X, BEAM_Y, PRISM_DEFAULTS.restTilt, PRISM_SIDE, mono);
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

export function Prism({
  monochromatic = false,
  reducedMotion,
  onFeedback,
  label = "A glass prism you can drag through a light beam, splitting it into a rainbow",
  style,
}: PrismProps) {
  const [systemReduce, setSystemReduce] = useState(false);
  const reduce = reducedMotion ?? systemReduce;
  const opts = useMemo(() => PRISM_DEFAULTS, []);
  const effect = useMemo(() => getEffect(), []);
  const st = useSharedValue<PrismState>(createPrism(PRISM_REST_X, PRISM_REST_Y));
  const tr = useSharedValue<PrismTrace>(stillTrace(false));
  const frame = useSharedValue(0);
  const pointer = useSharedValue<Pointer>({ x: 0, y: 0, down: 0, seq: 0 });
  const monoM = useSharedValue(false);
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
    monoM.value = monochromatic;
  }, [monochromatic, monoM]);
  useEffect(() => {
    reduceM.value = reduce;
    if (reduce) {
      // Still picture: the prism sits in the beam with the spectrum showing.
      st.value = createPrism(PRISM_REST_X, BEAM_Y);
      tr.value = stillTrace(monoM.value);
      frame.value = frame.value + 1;
    } else {
      st.value = createPrism(PRISM_REST_X, PRISM_REST_Y);
    }
  }, [reduce, reduceM, st, tr, frame, monoM]);

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
      if (p.down && !s.down) prismDown(s, p.x, p.y, PRISM_W, PRISM_H, DRAG_MARGIN);
      else if (p.down) prismMove(s, p.x, p.y, PRISM_W, PRISM_H, DRAG_MARGIN);
      else prismRelease(s);
      s.seq = p.seq;
    }
    const dt = Math.min(48, info.timeSincePreviousFrame ?? 16.7) / 1000;
    prismStep(s, dt, opts);
    tr.value = tracePrism(0, BEAM_Y, 1, 0, s.x, s.y, s.tilt, PRISM_SIDE, monoM.value, opts);
    frame.value = frame.value + 1;
  });

  const uniforms = useDerivedValue(() => {
    frame.value;
    const s = st.value;
    const t = tr.value;
    const v = prismVertices(s.x, s.y, s.tilt, PRISM_SIDE);
    const lut = t.lut.length === 16 ? t.lut : new Array(16).fill(550);
    const seg = t.internal;
    return {
      size: [PRISM_W, PRISM_H],
      beam: [BEAM_Y, BEAM_W],
      triA: [v[0], v[1], v[2], v[3]],
      triC: [v[4], v[5]],
      incident: t.hit ? [0, BEAM_Y, t.entryX, t.entryY] : [0, BEAM_Y, PRISM_W, BEAM_Y],
      seg1: seg.length >= 4 ? [seg[0], seg[1], seg[2], seg[3]] : [0, 0, 0, 0],
      seg2: seg.length >= 6 ? [seg[2], seg[3], seg[4], seg[5]] : [0, 0, 0, 0],
      meta: [Math.max(0, seg.length / 2 - 1), t.hit ? 1 : 0],
      refl: [t.entryX, t.entryY, t.reflX, t.reflY],
      fan: [t.fanX, t.fanY, t.phi0, t.phi1],
      fanRef: [t.refDX, t.refDY],
      fanCfg: [t.fanOn ? 1 : 0, t.mono ? 1 : 0],
      lut0: [lut[0], lut[1], lut[2], lut[3]],
      lut1: [lut[4], lut[5], lut[6], lut[7]],
      lut2: [lut[8], lut[9], lut[10], lut[11]],
      lut3: [lut[12], lut[13], lut[14], lut[15]],
    };
  });

  return (
    <View
      style={[{ width: PRISM_W, height: PRISM_H, borderRadius: 18, overflow: "hidden", backgroundColor: PRISM_BACKGROUND }, style]}
      accessibilityLabel={label}
      accessibilityRole="image"
      {...pan.panHandlers}
    >
      {!reduce ? <CanvasKeepAlive /> : null}
      <Canvas pointerEvents="none" style={{ width: PRISM_W, height: PRISM_H }}>
        <Fill color={PRISM_BACKGROUND} />
        {effect ? (
          <Fill>
            <Shader source={effect} uniforms={uniforms} />
          </Fill>
        ) : null}
      </Canvas>
    </View>
  );
}
