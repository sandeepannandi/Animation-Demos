import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  REVEAL_DEFAULTS as O, createBrush, brushRadius, brushDown, brushMove, brushRelease, brushStep, brushActive,
} from './revealMath.ts';

const strengths = (b) => b.data.filter((_, i) => i % 4 === 3);
const maxStrength = (b) => Math.max(...strengths(b));

test('brush radius grows with speed, stays within its bounds', () => {
  let prev = brushRadius(0, O);
  assert.equal(prev, O.minRadius);
  for (const v of [50, 200, 700, 1500, 4000, 40000]) {
    const r = brushRadius(v, O);
    assert.ok(r > prev);
    assert.ok(r < O.maxRadius + 1e-9);
    prev = r;
  }
  assert.ok(O.maxRadius - brushRadius(1e7, O) < 1e-6);
});

test('a fast stroke makes a wider brush than a slow one', () => {
  const slow = createBrush(O);
  const fast = createBrush(O);
  brushDown(slow, 0, 0, 0, O);
  brushDown(fast, 0, 0, 0, O);
  for (let k = 1; k <= 20; k++) {
    brushMove(slow, k * 1, 0, k * 16, O);
    brushMove(fast, k * 40, 0, k * 16, O);
  }
  assert.ok(fast.radius > slow.radius + 10);
});

test('stamps along a segment stay within the spacing bound or the per-move cap', () => {
  const b = createBrush(O);
  brushDown(b, 0, 0, 0, O);
  brushMove(b, 100, 0, 16, O);
  const xs = [];
  for (let i = 0; i < O.slots - 1; i++) if (b.data[i * 4 + 3] > 0) xs.push(b.data[i * 4]);
  xs.sort((a, c) => a - c);
  assert.ok(xs.length >= 1 && xs.length <= O.maxPerMove);
  assert.ok(Math.abs(xs[xs.length - 1] - 100) < 1e-9);
  const radius = brushRadius(b.speed, O);
  if (xs.length < O.maxPerMove) for (let i = 1; i < xs.length; i++) assert.ok(xs[i] - xs[i - 1] <= radius * O.spacing * 1.5 + 1e-6);
});

test('decay is exactly exponential with time constant tau', () => {
  const b = createBrush(O);
  brushDown(b, 10, 10, 0, O);
  brushRelease(b);
  brushStep(b, 1e-9, O);
  const s0 = maxStrength(b);
  brushStep(b, O.tau, O);
  assert.ok(Math.abs(maxStrength(b) / s0 - Math.exp(-1)) < 1e-6);
});

test('decay does not depend on how the time is split into steps', () => {
  const a = createBrush(O);
  const c = createBrush(O);
  for (const b of [a, c]) {
    brushDown(b, 5, 5, 0, O);
    brushMove(b, 90, 40, 16, O);
    brushRelease(b);
  }
  brushStep(a, 0.5, O);
  for (let i = 0; i < 50; i++) brushStep(c, 0.01, O);
  for (let i = 0; i < a.data.length; i++) assert.ok(Math.abs(a.data[i] - c.data[i]) < 1e-12);
});

test('the patch under a held finger does not fade, then fades after release', () => {
  const b = createBrush(O);
  brushDown(b, 50, 60, 0, O);
  for (let i = 0; i < 300; i++) brushStep(b, 1 / 60, O);
  assert.equal(b.data[(O.slots - 1) * 4 + 3], 1);
  brushRelease(b);
  for (let i = 0; i < 600; i++) brushStep(b, 1 / 60, O);
  assert.equal(brushActive(b), false);
  assert.equal(maxStrength(b), 0);
});

test('the stamp ring never exceeds its slots and zero or negative time is harmless', () => {
  const b = createBrush(O);
  brushDown(b, 0, 0, 0, O);
  for (let k = 1; k <= 500; k++) brushMove(b, (k * 37) % 320, (k * 53) % 340, k * 8, O);
  assert.equal(b.data.length, O.slots * 4);
  assert.ok(b.head >= 0 && b.head < O.slots - 1);
  const before = b.data.slice();
  brushStep(b, 0, O);
  brushStep(b, -1, O);
  assert.deepEqual(b.data, before);
  assert.ok(b.data.every(Number.isFinite));
});

test('a move with an identical timestamp does not produce NaN speeds', () => {
  const b = createBrush(O);
  brushDown(b, 0, 0, 100, O);
  brushMove(b, 30, 0, 100, O);
  assert.ok(Number.isFinite(b.speed) && Number.isFinite(b.radius));
});
