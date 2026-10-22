"use client";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  OTP_DEMO_CODE, OTP_H, OTP_SETTLE, OTP_SLOW, OTP_W, otpModel,
} from "../../packages/ui/src/components/otp-verify/otpMath";
import {
  createOtpState, otpCode, otpFocus, otpReset, otpSetText, otpTick, type OtpState,
} from "../../packages/ui/src/components/otp-verify/otpState";
import { drawOtp } from "./otp-verify-draw";
import styles from "./otp-verify.module.css";

export function OtpVerifyPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [slow, setSlow] = useState(false);
  const systemReduce = useReducedMotion();
  const [reducedOverride, setReducedOverride] = useState<boolean | null>(null);
  const reduced = reducedOverride ?? !!systemReduce;
  const latest = useRef({ slow, reduced });
  latest.current = { slow, reduced };
  const sim = useRef<OtpState>(createOtpState());
  const clock = useRef(0);
  const demo = useRef<{ at: number; n: number } | null>(null);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = OTP_W * dpr;
    canvas.height = OTP_H * dpr;
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      const dt = last ? Math.min(48, now - last) / 1000 : 1 / 60;
      last = now;
      const scale = latest.current.reduced ? 1 : latest.current.slow ? OTP_SLOW : 1;
      clock.current += dt * scale;
      const s = sim.current;
      const d = demo.current;
      if (d && clock.current >= d.at) {
        d.n += 1;
        otpSetText(s, OTP_DEMO_CODE.slice(0, d.n), clock.current);
        setTyped(otpCode(s));
        d.at = clock.current + 0.34;
        if (d.n >= OTP_DEMO_CODE.length) demo.current = null;
      }
      otpTick(s, clock.current, "0000");
      let t = clock.current;
      if (latest.current.reduced && s.doneAt >= 0) t = s.doneAt + OTP_SETTLE;
      const model = otpModel(s.typedAt, s.doneAt, s.errAt, otpFocus(s), t);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawOtp(ctx, model, s.digits);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const reset = () => {
    demo.current = null;
    otpReset(sim.current);
    setTyped("");
    if (inputRef.current) inputRef.current.value = "";
  };
  const typeForMe = () => {
    reset();
    demo.current = { at: clock.current + 0.25, n: 0 };
  };

  return (
    <div className={styles.stage}>
      <div className={styles.wrap}>
        <canvas ref={canvasRef} className={styles.canvas} width={OTP_W} height={OTP_H} role="img" aria-label="OTP Verify web preview: type a four digit code, the boxes glow, merge and turn into a checkmark" onClick={() => inputRef.current?.focus()} />
        <input
          ref={inputRef}
          className={styles.input}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={4}
          aria-label="Verification code"
          value={typed}
          onChange={(ev) => {
            demo.current = null;
            otpSetText(sim.current, ev.target.value, clock.current);
            setTyped(otpCode(sim.current));
          }}
        />
        <button type="button" className={styles.resend} aria-label="Resend code" onClick={reset} />
      </div>
      <div className={styles.row}>
        <button type="button" className={styles.chipPrimary} onClick={typeForMe}>Type code for me</button>
        <button type="button" className={slow ? styles.chipPrimary : styles.chip} onClick={() => setSlow((v) => !v)} aria-pressed={slow}>Slow motion: {slow ? "on" : "off"}</button>
        <button type="button" className={reduced ? styles.chipPrimary : styles.chip} onClick={() => setReducedOverride(!reduced)} aria-pressed={reduced}>Reduce motion: {reduced ? "on" : "off"}</button>
      </div>
      <p className={styles.hint}>Type four digits or tap Type code for me. It verifies by itself, then the boxes merge into a check.</p>
    </div>
  );
}
