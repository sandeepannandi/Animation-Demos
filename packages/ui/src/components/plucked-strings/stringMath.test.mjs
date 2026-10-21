import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STR_COURANT, STR_DAMPING, STR_MAX_PULL, STR_NODES, STR_SUB_DT, STR_X0, STR_DX,
  createStrings, stringEnergy, stringFundamental, stringMaxAbs, stringPoints,
  stringsDragTo, stringsPluck, stringsRelease, stepStringsFrame, stringY,
} from './stringMath.ts';

const run = (s, seconds) => {
  const frames = Math.round(seconds * 60);
  for (let f = 0; f < frames; f++) stepStringsFrame(s, 1 / 60);
};

test('both ends stay fixed through a pluck', () => {
  const s = createStrings();
  stringsPluck(s, 0, 30);
  run(s, 2);
  assert.equal(s.u[0], 0);
  assert.equal(s.u[STR_NODES - 1], 0);
});

test('a pulse reflects off the fixed end and comes back inverted', () => {
  const s = createStrings();
  // Right-moving Gaussian bump on the fastest string: u and up offset by r.
  const k = 0;
  const r = STR_COURANT[k];
  const c = 60;
  const bump = (i) => 12 * Math.exp(-((i - c) ** 2) / 18);
  for (let i = 1; i < s.m; i++) {
    s.u[k * STR_NODES + i] = bump(i);
    s.up[k * STR_NODES + i] = bump(i - r);
  }
  const probe = k * STR_NODES + 110;
  let maxUp = 0;
  let maxDown = 0;
  for (let f = 0; f < 60 * 3; f++) {
    stepStringsFrame(s, 1 / 60);
    maxUp = Math.max(maxUp, s.u[probe]);
    maxDown = Math.min(maxDown, s.u[probe]);
  }
  // The pulse passes the probe upright, then returns from the wall flipped.
  assert.ok(maxUp > 4, `pulse should pass probe upright, got ${maxUp}`);
  assert.ok(maxDown < -4, `reflected pulse should be inverted, got ${maxDown}`);
});

test('a mid-pluck rings at the analytic fundamental f1 = c / 2L', () => {
  const k = 1;
  const saved = STR_DAMPING[k];
  STR_DAMPING[k] = 0; // undamped, so the period is not blurred by decay
  const s = createStrings();
  stringsPluck(s, k, 24);
  const mid = k * STR_NODES + Math.round(s.m / 2);
  // Mean interval between rising zero crossings of the middle node.
  const crossings = [];
  let prev = s.u[mid];
  for (let f = 0; f < 240 * 8; f++) {
    stepStringsFrame(s, STR_SUB_DT);
    const v = s.u[mid];
    if (prev < 0 && v >= 0) crossings.push(f * STR_SUB_DT);
    prev = v;
  }
  STR_DAMPING[k] = saved;
  const diffs = crossings.slice(1).map((t0, i) => t0 - crossings[i]);
  const period = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const analytic = 1 / stringFundamental(STR_COURANT[k]);
  assert.ok(Math.abs(period - analytic) / analytic < 0.02, `${period} vs ${analytic}`);
});

test('damping settles a pluck; without damping energy holds', () => {
  const damped = createStrings();
  stringsPluck(damped, 2, 30);
  const e0 = stringEnergy(damped, 2);
  run(damped, 6);
  assert.ok(stringMaxAbs(damped, 2) < 30 * 0.35, `should settle, ${stringMaxAbs(damped, 2)}`);
  assert.ok(stringEnergy(damped, 2) < e0 * 0.2);

  const free = createStrings();
  stringsPluck(free, 2, 30);
  const saved = STR_DAMPING[2];
  STR_DAMPING[2] = 0;
  const start = stringEnergy(free, 2);
  run(free, 5);
  const drift = Math.abs(stringEnergy(free, 2) - start) / start;
  // Peak displacement over a further second: recombination makes any single
  // instant unreliable, the travelling pulses keep their size.
  let peak = 0;
  for (let f = 0; f < 60; f++) {
    stepStringsFrame(free, 1 / 60);
    peak = Math.max(peak, stringMaxAbs(free, 2));
  }
  STR_DAMPING[2] = saved;
  assert.ok(drift < 0.03, `undamped energy drift ${drift}`);
  assert.ok(peak > 20, `undamped string keeps ringing, peak ${peak}`);
});

test('a held node follows the finger and stays put until release', () => {
  const s = createStrings();
  const k = 2;
  const nodeIndex = 60;
  const x = STR_X0 + nodeIndex * STR_DX;
  stringsDragTo(s, x, stringY(k) + 20);
  assert.equal(s.grabString, k);
  run(s, 0.5);
  const g = k * STR_NODES + nodeIndex;
  assert.ok(Math.abs(s.u[g] - 20) < 1.5, `held node should sit at target, ${s.u[g]}`);
  stringsRelease(s);
  stepStringsFrame(s, 1 / 60);
  assert.ok(stringMaxAbs(s, k) > 2, 'released string keeps ringing');
});

test('a drag out of range grabs nothing', () => {
  const s = createStrings();
  stringsDragTo(s, 160, stringY(0) - 60); // above the board, no string in reach
  run(s, 0.3);
  assert.equal(s.grabString, -1);
  assert.equal(stringMaxAbs(s, 0), 0);
});

test('pull is clamped and the scheme stays bounded', () => {
  const s = createStrings();
  stringsDragTo(s, 160, stringY(3) + 400);
  run(s, 0.4);
  assert.ok(stringMaxAbs(s, 3) <= STR_MAX_PULL + 1e-9);
  stringsRelease(s);
  run(s, 10);
  const v = stringMaxAbs(s, 3);
  assert.ok(Number.isFinite(v) && v <= STR_MAX_PULL + 1e-9, `bounded, ${v}`);
});

test('render points line up with the pins when still', () => {
  const s = createStrings(true);
  const pts = stringPoints(s, 4);
  assert.equal(pts.length, STR_NODES * 2);
  assert.equal(pts[0], STR_X0);
  assert.equal(pts[1], stringY(4));
  stepStringsFrame(s, 1 / 60); // settled: a no-op
  assert.deepEqual(stringPoints(s, 4), pts);
});
