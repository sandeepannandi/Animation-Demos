import React, { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, PanResponder, View, type ViewStyle } from "react-native";
import { Canvas, Circle, Fill, Shader, Skia } from "@shopify/react-native-skia";
import { useDerivedValue, useFrameCallback, useSharedValue } from "react-native-reanimated";
import {
  COIN_DEFAULTS,
  coinAxes,
  createCoin,
  restCoin,
  stepCoinFixed,
  type CoinPointer,
  type CoinState,
} from "./coinMath";
import {
  COIN_BACKDROP_BOTTOM,
  COIN_BACKDROP_TOP,
  COIN_BACKGROUND,
  COIN_CAMERA,
  COIN_CENTER_X,
  COIN_CENTER_Y,
  COIN_H,
  COIN_METAL,
  COIN_PX_PER_UNIT,
  COIN_W,
} from "./coinDesign";
import { COIN_SHADER } from "./coinShader";

export type CoinProps = {
  slowMotion?: boolean;
  reducedMotion?: boolean;
  onFeedback?: (event: "grab" | "release") => void;
  label?: string;
  style?: ViewStyle;
};

const SKSL = `${COIN_SHADER}
half4 main(float2 p) {
  return half4(coinColor(p));
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

export function Coin({ slowMotion = false, reducedMotion, onFeedback, label = "Metal coin", style }: CoinProps) {
  const [systemReduce, setSystemReduce] = useState(false);
  const reduce = reducedMotion ?? systemReduce;
  const opts = useMemo(() => COIN_DEFAULTS, []);
  const effect = useMemo(() => getEffect(), []);
  const sim = useSharedValue<CoinState>(createCoin(opts));
  const frame = useSharedValue(0);
  const pointer = useSharedValue<CoinPointer>({ x: 0, y: 0, active: 0 });
  const slowM = useSharedValue(false);
  const reduceM = useSharedValue(false);
  const latest = useRef({ reduce, onFeedback });
  latest.current = { reduce, onFeedback };

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
    const fresh = createCoin(opts);
    if (reduce) restCoin(fresh, 0.7);
    sim.value = fresh;
    frame.value = frame.value + 1;
  }, [reduce, reduceM, sim, frame, opts]);

  const toWorld = (x: number, y: number): CoinPointer => ({
    x: (x - COIN_CENTER_X) / COIN_PX_PER_UNIT,
    y: -(y - COIN_CENTER_Y) / COIN_PX_PER_UNIT,
    active: 1,
  });
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !latest.current.reduce,
        onPanResponderGrant: (evt) => {
          pointer.value = toWorld(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
          latest.current.onFeedback?.("grab");
        },
        onPanResponderMove: (evt) => {
          pointer.value = toWorld(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
        },
        onPanResponderRelease: () => {
          pointer.value = { x: 0, y: 0, active: 0 };
          latest.current.onFeedback?.("release");
        },
        onPanResponderTerminate: () => {
          pointer.value = { x: 0, y: 0, active: 0 };
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [pointer],
  );

  useFrameCallback((info) => {
    if (reduceM.value) return;
    const dt = Math.min(48, info.timeSincePreviousFrame ?? 16.7) / 1000;
    stepCoinFixed(sim.value, dt * (slowM.value ? 0.25 : 1), pointer.value, opts);
    frame.value = frame.value + 1;
  });

  const uniforms = useDerivedValue(() => {
    frame.value;
    const a = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    coinAxes(sim.value, a);
    return {
      size: [COIN_W, COIN_H],
      center: [COIN_CENTER_X, COIN_CENTER_Y],
      ppu: COIN_PX_PER_UNIT,
      camD: COIN_CAMERA,
      ax: [a[0], a[1], a[2]],
      ay: [a[3], a[4], a[5]],
      az: [a[6], a[7], a[8]],
      metal: COIN_METAL,
      bgTop: COIN_BACKDROP_TOP,
      bgBottom: COIN_BACKDROP_BOTTOM,
    };
  });

  return (
    <View
      style={[{ width: COIN_W, height: COIN_H, borderRadius: 18, overflow: "hidden", backgroundColor: COIN_BACKGROUND }, style]}
      accessibilityLabel={label}
      accessibilityRole="image"
      {...pan.panHandlers}
    >
      {!reduce ? <CanvasKeepAlive /> : null}
      <Canvas pointerEvents="none" style={{ width: COIN_W, height: COIN_H }}>
        {effect ? (
          <Fill>
            <Shader source={effect} uniforms={uniforms} />
          </Fill>
        ) : (
          <Circle cx={COIN_CENTER_X} cy={COIN_CENTER_Y} r={COIN_PX_PER_UNIT} color="#c9ccd2" />
        )}
      </Canvas>
    </View>
  );
}
