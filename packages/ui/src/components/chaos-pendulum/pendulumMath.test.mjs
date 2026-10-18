import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PENDULUM_DEFAULTS, createPendulum, restPendulum, rk4Step, pendulumEnergy, energyScale,
  stepPendulumFixed, bobPositions, trailIndex,
} from './pendulumMath.ts';

const P = PENDULUM_DEFAULTS;
const CFG = { originX: 160, originY: 170, pixelsPerMeter: 70 };
const NONE = { x: 0, y: 0, active: 0 };

function drift(opts, seconds, th1, th2) {
  const s = createPendulum(opts);
  s.th1 = th1; s.th2 = th2;
  const e0 = pendulumEnergy(s.th1, s.th2, s.w1, s.w2, opts);
  const scale = energyScale(opts);
  let worst = 0;
  const steps = Math.round(seconds / opts.fixedDt);
  for (let i = 0; i < steps; i++) {
    rk4Step(s, opts.fixedDt, opts);
    if (i % 50 === 0) worst = Math.max(worst, Math.abs(pendulumEnergy(s.th1, s.th2, s.w1, s.w2, opts) - e0) / scale);
  }
  return worst;
}

test('energy is conserved to 1e-7 of the energy scale over 120 s of chaotic motion', () => {
  const worst = drift(P, 120, P.startTh1, P.startTh2);
  assert.ok(worst < 1e-7, `drift ${worst}`);
});

test('energy is conserved from several high-energy starts', () => {
  for (const [a, b] of [[3.0, -2.5], [2.6, 2.0], [1.2, -2.9], [Math.PI - 0.01, Math.PI - 0.02]]) {
    const worst = drift(P, 60, a, b);
    assert.ok(worst < 1e-7, `start ${a},${b} drift ${worst}`);
  }
});

test('unequal masses and lengths conserve energy too', () => {
  const q = { ...P, m1: 2.2, m2: 0.7, l1: 1.3, l2: 0.6 };
  const worst = drift(q, 60, 2.2, 1.1);
  assert.ok(worst < 1e-7, `drift ${worst}`);
});

test('RK4 error shrinks about sixteen-fold when the step is halved', () => {
  const run = (dt) => {
    const o = { ...P, fixedDt: dt };
    const s = createPendulum(o);
    s.th1 = 1.4; s.th2 = 1.9;
    const n = Math.round(4 / dt);
    for (let i = 0; i < n; i++) rk4Step(s, dt, o);
    return s;
  };
  const ref = run(1 / 7680);
  const err = (dt) => { const s = run(dt); return Math.hypot(s.th1 - ref.th1, s.th2 - ref.th2); };
  const ratio = err(1 / 120) / err(1 / 240);
  assert.ok(ratio > 11 && ratio < 22, `ratio ${ratio}`);
});

test('small oscillation matches the analytic slow normal mode', () => {
  const o = { ...P, fixedDt: 1 / 1000 };
  const mode = Math.SQRT2;
  const th = 0.001;
  const s = createPendulum(o);
  s.th1 = th; s.th2 = th * mode;
  const omega = Math.sqrt((2 - Math.SQRT2) * o.gravity / o.l1);
  let prev = s.th1, crossings = [], t = 0;
  for (let i = 0; i < 40000; i++) {
    rk4Step(s, o.fixedDt, o);
    t += o.fixedDt;
    if (prev > 0 && s.th1 <= 0) crossings.push(t - o.fixedDt * (s.th1 / (s.th1 - prev)) * -1);
    prev = s.th1;
  }
  const periods = [];
  for (let i = 1; i < crossings.length; i++) periods.push(crossings[i] - crossings[i - 1]);
  const mean = periods.reduce((a, b) => a + b, 0) / periods.length;
  const expected = (2 * Math.PI) / omega;
  assert.ok(periods.length >= 8);
  assert.ok(Math.abs(mean - expected) / expected < 2e-3, `${mean} vs ${expected}`);
});

test('the stepping loop matches a bare RK4 run and is deterministic', () => {
  const a = createPendulum(P), b = createPendulum(P);
  for (let i = 0; i < 600; i++) stepPendulumFixed(a, CFG, 1 / 60, NONE, P);
  for (let i = 0; i < 600; i++) stepPendulumFixed(b, CFG, 1 / 60, NONE, P);
  assert.equal(a.th1, b.th1);
  assert.equal(a.w2, b.w2);
  const c = createPendulum(P);
  const n = a.stepIndex;
  for (let i = 0; i < n; i++) rk4Step(c, P.fixedDt, P);
  assert.ok(Math.abs(c.th1 - a.th1) < 1e-9);
});

test('energy through the real stepping loop, 90 s at 60 fps', () => {
  const s = createPendulum(P);
  const e0 = pendulumEnergy(s.th1, s.th2, s.w1, s.w2, P);
  let worst = 0;
  for (let i = 0; i < 5400; i++) {
    stepPendulumFixed(s, CFG, 1 / 60, NONE, P);
    worst = Math.max(worst, Math.abs(pendulumEnergy(s.th1, s.th2, s.w1, s.w2, P) - e0) / energyScale(P));
  }
  assert.ok(worst < 1e-7, `drift ${worst}`);
});

test('grabbing drives the tip to a reachable pointer and release keeps the fling velocity', () => {
  const s = createPendulum(P);
  const target = { x: CFG.originX + 70, y: CFG.originY + 90, active: 1 };
  for (let i = 0; i < 90; i++) stepPendulumFixed(s, CFG, 1 / 60, target, P);
  const pos = [0, 0, 0, 0];
  bobPositions(s, CFG, P, pos);
  assert.ok(Math.hypot(pos[2] - target.x, pos[3] - target.y) < 1.5);
  assert.equal(s.grabbed, 1);
  for (let i = 0; i < 12; i++) {
    target.x += 6;
    stepPendulumFixed(s, CFG, 1 / 60, target, P);
  }
  const w = [s.w1, s.w2];
  stepPendulumFixed(s, CFG, 1 / 60, NONE, P);
  assert.equal(s.grabbed, 0);
  assert.ok(Math.abs(s.w1) > 0.2 || Math.abs(s.w2) > 0.2);
  assert.ok(Math.abs(s.w1 - w[0]) < 3 && Math.abs(s.w2 - w[1]) < 3);
});

test('an unreachable pointer is clamped to the arm reach', () => {
  const s = createPendulum(P);
  const far = { x: CFG.originX + 600, y: CFG.originY, active: 1 };
  for (let i = 0; i < 120; i++) stepPendulumFixed(s, CFG, 1 / 60, far, P);
  const pos = [0, 0, 0, 0];
  bobPositions(s, CFG, P, pos);
  const reach = Math.hypot(pos[2] - CFG.originX, pos[3] - CFG.originY) / CFG.pixelsPerMeter;
  assert.ok(Math.abs(reach - (P.l1 + P.l2)) < 0.01);
});

test('a flung release is clamped to the maximum angular speed', () => {
  const s = createPendulum(P);
  const t = { x: 200, y: 250, active: 1 };
  for (let i = 0; i < 30; i++) stepPendulumFixed(s, CFG, 1 / 60, t, P);
  s.w1 = 500; s.w2 = -500;
  stepPendulumFixed(s, CFG, 1 / 60, NONE, P);
  assert.ok(Math.abs(s.w1) <= P.maxOmega + 1 && Math.abs(s.w2) <= P.maxOmega + 1);
});

test('the trail ring buffer fills, wraps and indexes newest first', () => {
  const s = createPendulum(P);
  const pos = [0, 0, 0, 0];
  for (let i = 0; i < 4000; i++) stepPendulumFixed(s, CFG, 1 / 60, NONE, P);
  assert.equal(s.count, P.trailLength);
  const newest = trailIndex(s, P.trailLength, 0);
  bobPositions(s, CFG, P, pos);
  assert.ok(Math.hypot(s.trail2[newest * 2] - pos[2], s.trail2[newest * 2 + 1] - pos[3]) < 70);
  assert.equal(trailIndex(s, P.trailLength, P.trailLength), -1);
  const fresh = createPendulum(P);
  assert.equal(trailIndex(fresh, P.trailLength, 0), -1);
  restPendulum(s, 0.5, 0.7);
  assert.equal(s.count, 0);
});
