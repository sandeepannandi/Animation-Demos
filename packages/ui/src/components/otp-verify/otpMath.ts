// Motion model for OTP Verify. Everything on screen is a pure function of the
// clock, so the React Native component (Skia + Reanimated) and the web
// preview draw the same frame. Springs are the closed-form solution of a
// damped spring, not an integrator, so they are exact at any frame rate and
// slow motion is just a slower clock. Every function is a worklet tag so
// Reanimated can call it on the UI thread; plain JS ignores the tag.
//
// Sequence once the last digit lands (t = 0):
//   0.00  boxes light up (outer glow, warm tint), title starts to fade
//   0.12  boxes tilt and slide toward the middle, outer boxes first, on an
//         underdamped spring so they overshoot and settle into a loose pile
//   0.28  digits fade out
//   0.62  the pile collapses to one point; three boxes fade, one remains
//   0.95  the remaining box squares up, a ripple leaves it, the check draws
//   1.40  "Verified successfully" is fully in, the box keeps a soft halo

export const OTP_W = 320;
export const OTP_H = 292;
export const OTP_LEN = 4;
export const OTP_BOX_W = 54;
export const OTP_BOX_H = 60;
export const OTP_PITCH = 66;
export const OTP_CX = OTP_W / 2;
export const OTP_CY = 156;
export const OTP_CHECK_BOX = 46;
export const OTP_SLOW = 0.25;
export const OTP_DEMO_CODE = "6988";
const TILT = [-13, 9, -7, 12];
const PILE = 13;

export function clamp01(x: number) {
  'worklet';
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
export function smooth(x: number) {
  'worklet';
  const u = clamp01(x);
  return u * u * (3 - 2 * u);
}
export function easeOutCubic(x: number) {
  'worklet';
  const u = 1 - clamp01(x);
  return 1 - u * u * u;
}
// Closed-form damped spring from 0 to 1 with stiffness k and damping c.
export function spring(t: number, k: number, c: number) {
  'worklet';
  if (t <= 0) return 0;
  const w = Math.sqrt(k);
  const z = c / (2 * w);
  if (z < 1) {
    const wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
  }
  const e = Math.exp(-w * t);
  return 1 - e * (1 + w * t);
}

export type OtpBox = {
  x: number; // centre offset from the row centre, px
  y: number;
  rot: number; // degrees
  sx: number;
  sy: number;
  alpha: number; // body opacity
  digitAlpha: number;
  digitScale: number;
  ring: number; // focus / error outline strength 0..1
  err: number; // 0..1, ring turns red
  glow: number; // 0..1 warm glow strength
};
export type OtpModel = {
  boxes: OtpBox[];
  titleOld: number;
  titleNew: number;
  titleNewY: number;
  halo: number;
  rippleR: number;
  rippleA: number;
  check: number; // 0..1 stroke trim
  t: number; // seconds since verification started, -1 while idle
};

export function otpRestX(i: number) {
  'worklet';
  return (i - (OTP_LEN - 1) / 2) * OTP_PITCH;
}

export function otpModel(typedAt: number[], doneAt: number, errAt: number, focus: number, now: number): OtpModel {
  'worklet';
  const t = doneAt >= 0 ? now - doneAt : -1;
  const boxes: OtpBox[] = [];
  const e = errAt >= 0 ? now - errAt : -1;
  const shake = e >= 0 && e < 0.7 ? Math.sin(e * 58) * Math.exp(-e * 6.5) * 9 : 0;
  const errAmt = e >= 0 && e < 0.9 ? 1 - smooth(e / 0.9) : 0;
  for (let i = 0; i < OTP_LEN; i++) {
    const rest = otpRestX(i);
    const a = typedAt[i] >= 0 ? now - typedAt[i] : -1;
    const pop = a >= 0 ? 0.86 + 0.14 * spring(a, 560, 25) : 1;
    const digitA = a >= 0 ? smooth(a / 0.07) : 0;
    const box: OtpBox = {
      x: rest + shake, y: 0, rot: 0, sx: pop, sy: pop, alpha: 1,
      digitAlpha: digitA, digitScale: a >= 0 ? 0.7 + 0.3 * spring(a, 620, 24) : 1,
      ring: 0, err: errAmt, glow: 0,
    };
    if (t < 0) {
      if (i === focus) box.ring = 0.8 + 0.2 * Math.sin(now * 6);
      if (errAmt > 0) box.ring = Math.max(box.ring, errAmt);
    } else {
      const mid = Math.abs(i - (OTP_LEN - 1) / 2);
      const glowIn = smooth(t / 0.22);
      const g = spring(t - 0.12 - 0.035 * (1.5 - mid), 190, 17);
      const m = spring(t - 0.62, 230, 24);
      const pile = (i - (OTP_LEN - 1) / 2) * PILE;
      box.x = rest * (1 - g) + pile * g * (1 - m);
      const tilt = spring(t - 0.05, 150, 15);
      box.rot = TILT[i % 4] * tilt * (1 - clamp01(m));
      box.y = -5 * Math.sin(Math.PI * clamp01((t - 0.1) / 0.5));
      box.ring = glowIn;
      box.glow = glowIn;
      box.digitAlpha *= 1 - smooth((t - 0.28) / 0.3);
      box.digitScale = 1;
      box.sx = 1 + 0.03 * glowIn;
      box.sy = box.sx;
      if (i < OTP_LEN - 1) {
        const f = smooth((t - 0.76) / 0.18);
        box.alpha = 1 - f;
        box.sx *= 1 - 0.12 * f;
        box.sy *= 1 - 0.12 * f;
        box.glow *= 1 - f;
      } else {
        const sq = smooth((t - 0.8) / 0.25);
        box.sx = (1 - sq) * box.sx + sq * (OTP_CHECK_BOX / OTP_BOX_W);
        box.sy = (1 - sq) * box.sy + sq * (OTP_CHECK_BOX / OTP_BOX_H);
        const bump = Math.sin(Math.PI * clamp01((t - 0.92) / 0.4));
        box.sx *= 1 + 0.07 * bump;
        box.sy *= 1 + 0.07 * bump;
        box.glow = 0.55 + 0.45 * (1 - smooth((t - 1.0) / 0.6));
      }
    }
    boxes.push(box);
  }
  const u = (t - 0.95) / 0.9;
  return {
    boxes,
    titleOld: t < 0 ? 1 : 1 - smooth((t - 0.1) / 0.25),
    titleNew: t < 0 ? 0 : smooth((t - 0.4) / 0.4),
    titleNewY: t < 0 ? 8 : 8 * (1 - easeOutCubic((t - 0.4) / 0.6)),
    halo: t < 0 ? 0 : smooth((t - 0.2) / 0.6) * (0.62 + 0.38 * (1 - smooth((t - 1.0) / 0.8))),
    rippleR: u > 0 && u < 1 ? OTP_CHECK_BOX * 0.55 + 46 * easeOutCubic(u) : 0,
    rippleA: u > 0 && u < 1 ? 0.55 * (1 - u) * (1 - u) : 0,
    check: t < 0 ? 0 : easeOutCubic((t - 1.0) / 0.42),
    t,
  };
}

// End of the sequence, in seconds, after which nothing moves.
export const OTP_SETTLE = 2.4;
