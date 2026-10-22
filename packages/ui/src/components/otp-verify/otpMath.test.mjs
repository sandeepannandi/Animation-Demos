import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  OTP_BOX_H, OTP_BOX_W, OTP_CHECK_BOX, OTP_LEN, OTP_SETTLE, OTP_PITCH,
  otpModel, otpRestX, smooth, spring,
} from './otpMath.ts';

const empty = [-1, -1, -1, -1];
const full = [0, 0.2, 0.4, 0.6];

test('spring starts at 0, settles at 1 and overshoots when underdamped', () => {
  assert.equal(spring(0, 190, 17), 0);
  assert.ok(Math.abs(spring(3, 190, 17) - 1) < 1e-4);
  let peak = 0;
  for (let t = 0; t < 1; t += 1 / 240) peak = Math.max(peak, spring(t, 190, 17));
  assert.ok(peak > 1.02 && peak < 1.25, `peak ${peak}`);
  // Matches the closed form: damping ratio of 1 never overshoots.
  for (let t = 0; t < 2; t += 0.01) assert.ok(spring(t, 100, 20) <= 1 + 1e-9);
});

test('spring obeys its own differential equation', () => {
  const k = 230, c = 24, h = 1e-4;
  for (const t of [0.05, 0.2, 0.5]) {
    const x = (s) => spring(s, k, c);
    const v = (x(t + h) - x(t - h)) / (2 * h);
    const a = (x(t + h) - 2 * x(t) + x(t - h)) / (h * h);
    // x'' + c x' + k (x - 1) = 0 for a spring to target 1
    assert.ok(Math.abs(a + c * v + k * (x(t) - 1)) < 0.5, `residual at ${t}`);
  }
});

test('idle: boxes sit in a row, only the focused box has a ring', () => {
  const m = otpModel(empty, -1, -1, 2, 1);
  assert.equal(m.t, -1);
  m.boxes.forEach((b, i) => {
    assert.equal(b.x, otpRestX(i));
    assert.equal(b.alpha, 1);
    assert.equal(b.glow, 0);
    assert.equal(b.digitAlpha, 0);
    assert.equal(b.ring > 0, i === 2);
  });
  assert.equal(m.titleOld, 1);
  assert.equal(m.titleNew, 0);
  assert.equal(m.check, 0);
});

test('a typed digit pops in: scale starts small and settles at 1', () => {
  const m0 = otpModel([1, -1, -1, -1], -1, -1, 1, 1.0);
  const m1 = otpModel([1, -1, -1, -1], -1, -1, 1, 2.0);
  assert.ok(m0.boxes[0].sx < 0.9 && m0.boxes[0].digitAlpha < 0.1);
  assert.ok(Math.abs(m1.boxes[0].sx - 1) < 1e-3 && m1.boxes[0].digitAlpha === 1);
});

test('verification ends as one checked box and the new title', () => {
  const m = otpModel(full, 0, -1, 3, OTP_SETTLE);
  for (let i = 0; i < OTP_LEN - 1; i++) assert.ok(m.boxes[i].alpha < 1e-6);
  const last = m.boxes[OTP_LEN - 1];
  assert.ok(Math.abs(last.x) < 0.2, `x ${last.x}`);
  assert.ok(Math.abs(last.rot) < 0.05);
  assert.ok(Math.abs(last.sx * OTP_BOX_W - OTP_CHECK_BOX) < 0.3);
  assert.ok(Math.abs(last.sy * OTP_BOX_H - OTP_CHECK_BOX) < 0.3);
  assert.equal(last.digitAlpha, 0);
  assert.equal(m.check, 1);
  assert.equal(m.titleNew, 1);
  assert.equal(m.titleOld, 0);
  assert.ok(m.halo > 0.55);
});

test('sequence order: tilt, gather, digits fade, collapse, check', () => {
  const at = (t) => otpModel(full, 0, -1, 3, t);
  assert.ok(Math.abs(at(0.01).boxes[0].x - otpRestX(0)) < 1, 'nothing moves in the first frame');
  assert.ok(at(0.2).boxes[0].glow > 0.9, 'glow comes first');
  const t5 = at(0.5);
  assert.ok(Math.abs(t5.boxes[0].rot) > 4, 'boxes are tilted mid sequence');
  const gap = t5.boxes[1].x - t5.boxes[0].x;
  assert.ok(gap < OTP_BOX_W * 0.5 && gap > 0, `boxes overlap into a pile, gap ${gap}`);
  assert.ok(at(0.65).boxes[0].digitAlpha < 0.02, 'digits are gone before the collapse');
  assert.equal(at(0.7).check, 0);
  assert.ok(at(1.2).check > 0.2 && at(1.2).check < 1);
  assert.ok(at(1.5).check > at(1.2).check);
});

test('motion is continuous at 60 fps: no box jumps more than 12 px a frame', () => {
  let prev = otpModel(full, 0, -1, 3, 0);
  let worst = 0;
  for (let f = 1; f <= 160; f++) {
    const m = otpModel(full, 0, -1, 3, f / 60);
    for (let i = 0; i < OTP_LEN; i++) worst = Math.max(worst, Math.abs(m.boxes[i].x - prev.boxes[i].x));
    prev = m;
  }
  assert.ok(worst < 12, `largest per-frame step ${worst}`);
});

test('title cross-fades monotonically', () => {
  let a = 1, b = 0;
  for (let f = 0; f <= 150; f++) {
    const m = otpModel(full, 0, -1, 3, f / 60);
    assert.ok(m.titleOld <= a + 1e-9 && m.titleNew >= b - 1e-9);
    a = m.titleOld;
    b = m.titleNew;
  }
});

test('the ripple lives only while the check is drawn and fades out', () => {
  assert.equal(otpModel(full, 0, -1, 3, 0.5).rippleA, 0);
  const mid = otpModel(full, 0, -1, 3, 1.3);
  assert.ok(mid.rippleA > 0 && mid.rippleR > OTP_CHECK_BOX * 0.5);
  assert.equal(otpModel(full, 0, -1, 3, 2.3).rippleA, 0);
});

test('wrong code: boxes shake sideways and the error ring fades', () => {
  const at = (t) => otpModel(full, -1, 0, 3, t);
  let swing = 0;
  for (let f = 0; f < 40; f++) swing = Math.max(swing, Math.abs(at(f / 60).boxes[1].x - otpRestX(1)));
  assert.ok(swing > 4 && swing < 12, `swing ${swing}`);
  assert.ok(at(0.05).boxes[0].err > 0.9);
  assert.equal(at(1.2).boxes[0].err, 0);
  assert.equal(at(1.2).boxes[0].x, otpRestX(0));
});

test('smooth is a clamped smoothstep', () => {
  assert.equal(smooth(-1), 0);
  assert.equal(smooth(2), 1);
  assert.equal(smooth(0.5), 0.5);
  assert.ok(OTP_PITCH > OTP_BOX_W);
});

import { createOtpState, otpCode, otpFocus, otpReset, otpSetText, otpTick, OTP_VERIFY_DELAY, OTP_ERROR_CLEAR } from './otpState.ts';

test('state: typing fills boxes in order, ignores non digits and extra digits', () => {
  const s = createOtpState();
  otpSetText(s, '6a9', 1);
  assert.equal(otpCode(s), '69');
  assert.equal(otpFocus(s), 2);
  assert.equal(s.typedAt[0], 1);
  otpSetText(s, '69880', 2);
  assert.equal(otpCode(s), '6988');
  assert.equal(s.typedAt[0], 1, 'earlier digits keep their time');
  assert.equal(s.typedAt[3], 2);
  assert.equal(otpFocus(s), 3);
});

test('state: backspace clears the last box', () => {
  const s = createOtpState();
  otpSetText(s, '123', 1);
  otpSetText(s, '12', 2);
  assert.equal(s.typedAt[2], -1);
  assert.equal(otpFocus(s), 2);
});

test('state: a full code auto-verifies after a short beat', () => {
  const s = createOtpState();
  otpSetText(s, '6988', 3);
  assert.equal(otpTick(s, 3.05, '0000'), 0);
  assert.equal(s.doneAt, -1);
  assert.equal(otpTick(s, 3 + OTP_VERIFY_DELAY + 0.01, '0000'), 2);
  assert.ok(Math.abs(s.doneAt - (3 + OTP_VERIFY_DELAY)) < 1e-9);
  otpSetText(s, '1', 9);
  assert.equal(otpCode(s), '6988', 'input is locked once verified');
});

test('state: a wrong code errors, then clears itself so you can retry', () => {
  const s = createOtpState();
  otpSetText(s, '0000', 1);
  assert.equal(otpTick(s, 1 + OTP_VERIFY_DELAY, '0000'), 1);
  assert.ok(s.errAt >= 0 && s.doneAt === -1);
  assert.equal(otpCode(s), '0000');
  otpTick(s, 1 + OTP_VERIFY_DELAY + OTP_ERROR_CLEAR + 0.01, '0000');
  assert.equal(otpCode(s), '');
  otpSetText(s, '1234', 5);
  assert.equal(otpCode(s), '1234');
  otpReset(s);
  assert.equal(otpCode(s), '');
  assert.equal(s.doneAt, -1);
});
