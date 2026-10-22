// Input state for OTP Verify: which digits are typed, when each landed, and
// when verification starts. Plain data, stepped by the caller's clock, so the
// React Native component and the web preview run the same logic.
const OTP_LEN = 4;

export type OtpState = {
  digits: string[];
  typedAt: number[]; // clock time each digit landed, -1 when empty
  doneAt: number; // clock time verification started, -1 while idle
  errAt: number; // clock time of a wrong code, -1 when none
  pendingAt: number; // verification starts at this time (a beat after the last digit)
  clearAt: number; // digits clear at this time after a wrong code
};

export const OTP_VERIFY_DELAY = 0.16;
export const OTP_ERROR_CLEAR = 0.75;

export function createOtpState(): OtpState {
  return { digits: ["", "", "", ""], typedAt: [-1, -1, -1, -1], doneAt: -1, errAt: -1, pendingAt: -1, clearAt: -1 };
}

export function otpCode(s: OtpState) {
  'worklet';
  return s.digits.join("");
}

// Index of the box that takes the next digit.
export function otpFocus(s: OtpState) {
  'worklet';
  const n = otpCode(s).length;
  return n >= OTP_LEN ? OTP_LEN - 1 : n;
}

export function otpBusy(s: OtpState) {
  'worklet';
  return s.doneAt >= 0 || s.pendingAt >= 0;
}

// Replace the typed text. Digits that stay keep their landing time, new
// digits are stamped now, removed digits are dropped.
export function otpSetText(s: OtpState, text: string, now: number) {
  'worklet';
  if (otpBusy(s) || s.clearAt >= 0) return;
  const clean = text.replace(/\D/g, "").slice(0, OTP_LEN);
  for (let i = 0; i < OTP_LEN; i++) {
    const ch = clean[i] ?? "";
    if (ch !== s.digits[i]) s.typedAt[i] = ch ? now : -1;
    s.digits[i] = ch;
  }
  if (s.errAt >= 0 && clean.length < OTP_LEN) s.errAt = -1;
  if (clean.length === OTP_LEN) s.pendingAt = now + OTP_VERIFY_DELAY;
}

// Advance the state machine. Returns 0 when nothing changed, 1 when state
// changed, 2 when the code was accepted and verification just started.
// `rejected` is the one code the demo treats as wrong.
export function otpTick(s: OtpState, now: number, rejected: string) {
  'worklet';
  if (s.pendingAt >= 0 && now >= s.pendingAt) {
    const at = s.pendingAt;
    s.pendingAt = -1;
    if (otpCode(s) !== rejected) {
      s.doneAt = at;
      return 2;
    }
    s.errAt = at;
    s.clearAt = at + OTP_ERROR_CLEAR;
    return 1;
  }
  if (s.clearAt >= 0 && now >= s.clearAt) {
    s.clearAt = -1;
    s.digits = ["", "", "", ""];
    s.typedAt = [-1, -1, -1, -1];
    return 1;
  }
  return 0;
}

export function otpReset(s: OtpState) {
  'worklet';
  s.digits = ["", "", "", ""];
  s.typedAt = [-1, -1, -1, -1];
  s.doneAt = -1;
  s.errAt = -1;
  s.pendingAt = -1;
  s.clearAt = -1;
}
