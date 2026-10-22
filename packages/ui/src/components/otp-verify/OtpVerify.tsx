import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Pressable, Text, TextInput, View, type ViewStyle } from "react-native";
import {
  BlurMask, Canvas, Circle, Group, Path, RadialGradient, RoundedRect, Skia, vec,
} from "@shopify/react-native-skia";
import Animated, {
  runOnJS, useAnimatedStyle, useDerivedValue, useFrameCallback, useSharedValue,
} from "react-native-reanimated";
import {
  OTP_BOX_H, OTP_BOX_W, OTP_CX, OTP_CY, OTP_DEMO_CODE, OTP_H, OTP_LEN, OTP_SETTLE, OTP_SLOW, OTP_W, otpModel, type OtpModel,
} from "./otpMath";
import {
  createOtpState, otpCode, otpFocus, otpReset, otpSetText, otpTick, type OtpState,
} from "./otpState";
import {
  OTP_ACCENT, OTP_BOX_EDGE, OTP_BOX_FILL, OTP_BOX_RADIUS, OTP_CHECK_PATH, OTP_ERROR, OTP_INK, OTP_MUTED, OTP_RESEND, OTP_RESEND_LEAD,
  OTP_RESEND_Y, OTP_SHEET, OTP_SHEET_EDGE, OTP_SHEET_RADIUS, OTP_SUB1, OTP_SUB1_Y, OTP_SUB2, OTP_SUB2_Y, OTP_TITLE, OTP_TITLE_DONE,
  OTP_TITLE_DONE_Y, OTP_TITLE_Y,
  OTP_GRABBER, OTP_RIM_ALPHA,
} from "./otpDesign";

export type OtpVerifyHandle = { typeDemo: () => void; reset: () => void };
export type OtpVerifyProps = {
  slowMotion?: boolean;
  reducedMotion?: boolean;
  /** The one code the demo treats as wrong (shakes and clears). Default "0000". */
  rejectedCode?: string;
  onVerified?: (code: string) => void;
  onFeedback?: (event: "digit" | "verified" | "error") => void;
  label?: string;
  style?: ViewStyle;
};

type Cmd = { text: string; seq: number; reset: number };
const BOXES = Array.from({ length: OTP_LEN }, (_, i) => i);
const CHECK = (() => {
  const p = Skia.Path.Make();
  p.moveTo(OTP_CHECK_PATH[0][0], OTP_CHECK_PATH[0][1]);
  p.lineTo(OTP_CHECK_PATH[1][0], OTP_CHECK_PATH[1][1]);
  p.lineTo(OTP_CHECK_PATH[2][0], OTP_CHECK_PATH[2][1]);
  return p;
})();

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

type Model = { value: OtpModel };

function boxTransform(m: OtpModel, i: number) {
  'worklet';
  const b = m.boxes[i];
  return [
    { translateX: OTP_CX + b.x }, { translateY: OTP_CY + b.y },
    { rotate: (b.rot * Math.PI) / 180 }, { scaleX: b.sx }, { scaleY: b.sy },
  ];
}

function BoxSkia({ model, i }: { model: Model; i: number }) {
  const transform = useDerivedValue(() => boxTransform(model.value, i));
  const alpha = useDerivedValue(() => model.value.boxes[i].alpha);
  const glow = useDerivedValue(() => model.value.boxes[i].glow * 0.62);
  const tint = useDerivedValue(() => model.value.boxes[i].glow * 0.1);
  const ring = useDerivedValue(() => model.value.boxes[i].ring);
  const rim = useDerivedValue(() => model.value.boxes[i].glow * OTP_RIM_ALPHA);
  const ringColor = useDerivedValue(() => (model.value.boxes[i].err > 0.5 ? OTP_ERROR : OTP_ACCENT));
  const x = -OTP_BOX_W / 2;
  const y = -OTP_BOX_H / 2;
  return (
    <Group transform={transform} opacity={alpha}>
      <RoundedRect x={x} y={y} width={OTP_BOX_W} height={OTP_BOX_H} r={OTP_BOX_RADIUS} color={OTP_ACCENT} opacity={glow}>
        <BlurMask blur={12} style="normal" />
      </RoundedRect>
      <RoundedRect x={x} y={y} width={OTP_BOX_W} height={OTP_BOX_H} r={OTP_BOX_RADIUS} color={OTP_BOX_FILL} />
      <RoundedRect x={x} y={y} width={OTP_BOX_W} height={OTP_BOX_H} r={OTP_BOX_RADIUS} color={OTP_ACCENT} opacity={tint} />
      <RoundedRect x={x} y={y} width={OTP_BOX_W} height={OTP_BOX_H} r={OTP_BOX_RADIUS} color={OTP_BOX_EDGE} style="stroke" strokeWidth={1.5} />
      <RoundedRect x={x} y={y} width={OTP_BOX_W} height={OTP_BOX_H} r={OTP_BOX_RADIUS} color={ringColor} style="stroke" strokeWidth={1.8} opacity={ring} />
      <RoundedRect x={x} y={y} width={OTP_BOX_W} height={OTP_BOX_H} r={OTP_BOX_RADIUS} color={OTP_ACCENT} style="stroke" strokeWidth={1.6} opacity={rim} />
    </Group>
  );
}

function BoxDigit({ model, i, digit }: { model: Model; i: number; digit: string }) {
  const style = useAnimatedStyle(() => {
    const b = model.value.boxes[i];
    return {
      opacity: b.digitAlpha * b.alpha,
      transform: [
        { translateX: b.x }, { translateY: b.y }, { rotate: `${b.rot}deg` },
        { scaleX: b.digitScale * b.sx }, { scaleY: b.digitScale * b.sy },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: "absolute", left: OTP_CX - OTP_BOX_W / 2, top: OTP_CY - OTP_BOX_H / 2, width: OTP_BOX_W, height: OTP_BOX_H, alignItems: "center", justifyContent: "center" }, style]}
    >
      <Text style={{ color: OTP_INK, fontSize: 26, fontWeight: "600", includeFontPadding: false }}>{digit}</Text>
    </Animated.View>
  );
}

function Label({ model, y, size, weight, color, text, kind }: { model: Model; y: number; size: number; weight: "400" | "600"; color: string; text: string; kind: "old" | "new" }) {
  const style = useAnimatedStyle(() => {
    const m = model.value;
    return kind === "old" ? { opacity: m.titleOld } : { opacity: m.titleNew, transform: [{ translateY: m.titleNewY }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, right: 0, top: y - 16, height: 32, alignItems: "center", justifyContent: "center" }, style]}>
      <Text style={{ color, fontSize: size, fontWeight: weight, includeFontPadding: false }}>{text}</Text>
    </Animated.View>
  );
}

export const OtpVerify = forwardRef<OtpVerifyHandle, OtpVerifyProps>(function OtpVerify(
  {
    slowMotion = false,
    reducedMotion,
    rejectedCode = "0000",
    onVerified,
    onFeedback,
    label = "Verification code. Type the four digits you received. The boxes light up, merge into one and show a check mark.",
    style,
  },
  ref,
) {
  const [systemReduce, setSystemReduce] = useState(false);
  const reduce = reducedMotion ?? systemReduce;
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const st = useSharedValue<OtpState>(createOtpState());
  const now = useSharedValue(0);
  const frame = useSharedValue(0);
  const cmd = useSharedValue<Cmd>({ text: "", seq: 0, reset: 0 });
  const slowM = useSharedValue(false);
  const reduceM = useSharedValue(false);
  const rejectM = useSharedValue(rejectedCode);
  const seen = useSharedValue({ seq: 0, reset: 0 });
  const latest = useRef({ onVerified, onFeedback, seq: 0, reset: 0 });
  latest.current.onVerified = onVerified;
  latest.current.onFeedback = onFeedback;
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
  useEffect(() => { rejectM.value = rejectedCode; }, [rejectedCode, rejectM]);

  const sync = (nextCode: string, isBusy: boolean, event: number) => {
    setCode(nextCode);
    setBusy(isBusy);
    if (event === 1) latest.current.onFeedback?.("digit");
    if (event === 2) {
      latest.current.onFeedback?.("verified");
      latest.current.onVerified?.(nextCode);
    }
    if (event === 3) latest.current.onFeedback?.("error");
  };

  useFrameCallback((info) => {
    const dt = Math.min(48, info.timeSincePreviousFrame ?? 16.7) / 1000;
    now.value += dt * (slowM.value && !reduceM.value ? OTP_SLOW : 1);
    const s = st.value;
    const c = cmd.value;
    let event = 0;
    let changed = false;
    if (c.reset !== seen.value.reset) {
      seen.value = { seq: c.seq, reset: c.reset };
      otpReset(s);
      changed = true;
    } else if (c.seq !== seen.value.seq) {
      seen.value = { seq: c.seq, reset: c.reset };
      const before = otpCode(s).length;
      otpSetText(s, c.text, now.value);
      if (otpCode(s).length > before) event = 1;
      changed = true;
    }
    const r = otpTick(s, now.value, rejectM.value);
    if (r === 2) { event = 2; changed = true; }
    if (r === 1) { changed = true; if (s.errAt >= 0 && s.clearAt >= 0 && now.value - s.errAt < 0.05) event = 3; }
    if (changed) runOnJS(sync)(otpCode(s), s.doneAt >= 0 || s.pendingAt >= 0, event);
    frame.value = frame.value + 1;
  });

  const model = useDerivedValue<OtpModel>(() => {
    frame.value;
    const s = st.value;
    const t = reduceM.value && s.doneAt >= 0 ? s.doneAt + OTP_SETTLE : now.value;
    return otpModel(s.typedAt, s.doneAt, s.errAt, otpFocus(s), t);
  });

  const send = (text: string) => {
    latest.current.seq += 1;
    cmd.value = { text, seq: latest.current.seq, reset: latest.current.reset };
  };
  const onText = (t: string) => {
    const clean = t.replace(/\D/g, "").slice(0, OTP_LEN);
    setCode(clean);
    send(clean);
  };
  const doReset = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    latest.current.reset += 1;
    cmd.value = { text: "", seq: latest.current.seq, reset: latest.current.reset };
    setCode("");
  };
  useImperativeHandle(ref, () => ({
    reset: doReset,
    typeDemo: () => {
      doReset();
      for (let n = 1; n <= OTP_DEMO_CODE.length; n++) {
        timers.current.push(setTimeout(() => send(OTP_DEMO_CODE.slice(0, n)), 250 + (n - 1) * 340));
      }
    },
  }));

  const halo = useDerivedValue(() => model.value.halo);
  const rippleR = useDerivedValue(() => model.value.rippleR);
  const rippleA = useDerivedValue(() => model.value.rippleA);
  const checkEnd = useDerivedValue(() => model.value.check);
  const checkTransform = useDerivedValue(() => {
    const b = model.value.boxes[OTP_LEN - 1];
    return [{ translateX: OTP_CX + b.x }, { translateY: OTP_CY + b.y }];
  });
  const checkOpacity = useDerivedValue(() => (model.value.check > 0.002 ? 1 : 0));
  const checkGlow = useDerivedValue(() => (model.value.check > 0.002 ? 0.45 : 0));
  const grabberStyle = useAnimatedStyle(() => ({ opacity: model.value.titleOld }));
  const resendStyle = useAnimatedStyle(() => ({ opacity: model.value.titleOld }));
  const digits = useMemo(() => code.split(""), [code]);

  return (
    <View
      style={[{ width: OTP_W, height: OTP_H, borderRadius: OTP_SHEET_RADIUS, backgroundColor: OTP_SHEET, borderWidth: 1, borderColor: OTP_SHEET_EDGE, overflow: "hidden" }, style]}
      accessibilityLabel={label}
    >
      {!reduce ? <CanvasKeepAlive /> : null}
      <Canvas pointerEvents="none" style={{ position: "absolute", left: -1, top: -1, width: OTP_W, height: OTP_H }}>
        <Circle cx={OTP_CX} cy={OTP_CY} r={120} opacity={halo}>
          <RadialGradient c={vec(OTP_CX, OTP_CY)} r={120} colors={["rgba(255, 90, 31, 0.2)", "rgba(255, 90, 31, 0)"]} />
        </Circle>
        <Circle cx={OTP_CX} cy={OTP_CY} r={rippleR} color={OTP_ACCENT} style="stroke" strokeWidth={2} opacity={rippleA} />
        {BOXES.map((i) => (<BoxSkia key={i} model={model} i={i} />))}
        <Group transform={checkTransform} opacity={checkOpacity}>
          <Path path={CHECK} color={OTP_ACCENT} style="stroke" strokeWidth={3.4} strokeCap="round" strokeJoin="round" start={0} end={checkEnd} opacity={checkGlow}>
            <BlurMask blur={4} style="normal" />
          </Path>
          <Path path={CHECK} color={OTP_ACCENT} style="stroke" strokeWidth={3.4} strokeCap="round" strokeJoin="round" start={0} end={checkEnd} />
        </Group>
      </Canvas>
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: OTP_CX - OTP_GRABBER.w / 2, top: OTP_GRABBER.y, width: OTP_GRABBER.w, height: OTP_GRABBER.h, borderRadius: 2, backgroundColor: OTP_GRABBER.color }, grabberStyle]} />
      <Label model={model} y={OTP_TITLE_Y} size={22} weight="600" color={OTP_INK} text={OTP_TITLE} kind="old" />
      <Label model={model} y={OTP_SUB1_Y} size={13} weight="400" color={OTP_MUTED} text={OTP_SUB1} kind="old" />
      <Label model={model} y={OTP_SUB2_Y} size={13} weight="400" color={OTP_MUTED} text={OTP_SUB2} kind="old" />
      <Label model={model} y={OTP_TITLE_DONE_Y} size={22} weight="600" color={OTP_INK} text={OTP_TITLE_DONE} kind="new" />
      {BOXES.map((i) => (<BoxDigit key={i} model={model} i={i} digit={digits[i] ?? ""} />))}
      <Animated.View style={[{ position: "absolute", left: 0, right: 0, top: OTP_RESEND_Y - 16, height: 32, alignItems: "center", justifyContent: "center" }, resendStyle]} pointerEvents={busy ? "none" : "auto"}>
        <Pressable onPress={doReset} accessibilityRole="button" accessibilityLabel="Resend code" hitSlop={8}>
          <Text style={{ color: OTP_MUTED, fontSize: 13, includeFontPadding: false }}>
            {OTP_RESEND_LEAD}
            <Text style={{ color: OTP_INK, fontWeight: "600" }}>{OTP_RESEND}</Text>
          </Text>
        </Pressable>
      </Animated.View>
      <TextInput
        value={code}
        onChangeText={onText}
        editable={!busy}
        keyboardType="number-pad"
        maxLength={OTP_LEN}
        caretHidden
        autoComplete="sms-otp"
        textContentType="oneTimeCode"
        accessibilityLabel="Verification code"
        style={{ position: "absolute", left: 0, right: 0, top: OTP_CY - OTP_BOX_H / 2 - 12, height: OTP_BOX_H + 24, opacity: 0.02, color: "transparent", fontSize: 16 }}
      />
    </View>
  );
});
