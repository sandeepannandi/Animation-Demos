import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COIN_DEFAULTS, createCoin, coinInertia, kineticEnergy, angularMomentumWorld, angularMomentumBody,
  rk4Step, stepCoinFixed, coinAxes, rotate, restCoin,
} from './coinMath.ts';

const FREE = { ...COIN_DEFAULTS, damping: 0, maxOmega: 1e9 };
const NONE = { x: 0, y: 0, active: 0 };
const norm = (v) => Math.hypot(v[0], v[1], v[2]);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function run(opts, seconds, state = createCoin(opts)) {
  for (let t = 0; t < seconds; t += 1 / 60) stepCoinFixed(state, 1 / 60, NONE, opts);
  return state;
}

test('inertia tensor of a solid disc', () => {
  const { transverse, axial } = coinInertia(FREE);
  assert.equal(axial, 0.5);
  assert.ok(Math.abs(transverse - (0.25 + (0.2 * 0.2) / 12)) < 1e-15);
  assert.ok(axial > transverse);
});

test('torque-free motion conserves kinetic energy over 120 s', () => {
  const s = createCoin(FREE);
  const e0 = kineticEnergy(s, FREE);
  let worst = 0;
  for (let k = 0; k < 120; k++) {
    run(FREE, 1, s);
    worst = Math.max(worst, Math.abs(kineticEnergy(s, FREE) - e0) / e0);
  }
  assert.ok(worst < 1e-9, `energy drift ${worst}`);
});

test('torque-free motion conserves world-frame angular momentum', () => {
  const s = createCoin(FREE);
  const l0 = [0, 0, 0];
  angularMomentumWorld(s, FREE, l0);
  const l = [0, 0, 0];
  let worst = 0;
  for (let k = 0; k < 120; k++) {
    run(FREE, 1, s);
    angularMomentumWorld(s, FREE, l);
    worst = Math.max(worst, Math.hypot(l[0] - l0[0], l[1] - l0[1], l[2] - l0[2]) / norm(l0));
  }
  assert.ok(worst < 1e-9, `angular momentum drift ${worst}`);
});

test('orientation quaternion stays normalised', () => {
  const s = run(FREE, 120);
  const n = Math.sqrt(s.qw ** 2 + s.qx ** 2 + s.qy ** 2 + s.qz ** 2);
  assert.ok(Math.abs(n - 1) < 1e-12);
});

test('symmetry axis keeps a constant angle to angular momentum', () => {
  const s = createCoin(FREE);
  const l = [0, 0, 0];
  const axes = new Array(9).fill(0);
  angularMomentumWorld(s, FREE, l);
  coinAxes(s, axes);
  const c0 = dot([axes[6], axes[7], axes[8]], l) / norm(l);
  let worst = 0;
  for (let k = 0; k < 60; k++) {
    run(FREE, 1, s);
    angularMomentumWorld(s, FREE, l);
    coinAxes(s, axes);
    worst = Math.max(worst, Math.abs(dot([axes[6], axes[7], axes[8]], l) / norm(l) - c0));
  }
  assert.ok(worst < 1e-9, `nutation angle drift ${worst}`);
});

test('body-frame precession rate matches (I3 - I1) w3 / I1', () => {
  const { transverse, axial } = coinInertia(FREE);
  const rate = ((axial - transverse) / transverse) * FREE.startOmega3;
  const s = createCoin(FREE);
  const phase0 = Math.atan2(s.w2, s.w1);
  let unwrapped = 0;
  let prev = phase0;
  const t = 3.7;
  for (let k = 0; k < Math.round(t * 60); k++) {
    run(FREE, 1 / 60, s);
    let p = Math.atan2(s.w2, s.w1);
    let d = p - prev;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    unwrapped += d;
    prev = p;
  }
  assert.ok(Math.abs(unwrapped / s.time - rate) / rate < 1e-6, `rate ${unwrapped / s.time} vs ${rate}`);
});

test('space-frame precession of the symmetry axis about L runs at |L| / I1', () => {
  const { transverse } = coinInertia(FREE);
  const s = createCoin(FREE);
  const l = [0, 0, 0];
  angularMomentumWorld(s, FREE, l);
  const lhat = [l[0] / norm(l), l[1] / norm(l), l[2] / norm(l)];
  let ref = [1, 0, 0];
  if (Math.abs(lhat[0]) > 0.9) ref = [0, 1, 0];
  const e1 = [ref[1] * lhat[2] - ref[2] * lhat[1], ref[2] * lhat[0] - ref[0] * lhat[2], ref[0] * lhat[1] - ref[1] * lhat[0]];
  const en = norm(e1);
  const u = e1.map((v) => v / en);
  const v = [lhat[1] * u[2] - lhat[2] * u[1], lhat[2] * u[0] - lhat[0] * u[2], lhat[0] * u[1] - lhat[1] * u[0]];
  const axes = new Array(9).fill(0);
  const angle = () => {
    coinAxes(s, axes);
    const z = [axes[6], axes[7], axes[8]];
    return Math.atan2(dot(z, v), dot(z, u));
  };
  let prev = angle();
  let total = 0;
  for (let k = 0; k < 240; k++) {
    run(FREE, 1 / 60, s);
    const a = angle();
    let d = a - prev;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    total += d;
    prev = a;
  }
  const expected = norm(l) / transverse;
  assert.ok(Math.abs(total / s.time - expected) / expected < 1e-6, `${total / s.time} vs ${expected}`);
});

test('fourth-order convergence: halving the step cuts the error about sixteen-fold', () => {
  const err = (dt) => {
    const s = createCoin(FREE);
    const l0 = [0, 0, 0];
    angularMomentumWorld(s, FREE, l0);
    for (let k = 0; k < Math.round(20 / dt); k++) rk4Step(s, dt, 0, 0, 0, FREE);
    const l = [0, 0, 0];
    angularMomentumWorld(s, FREE, l);
    return Math.hypot(l[0] - l0[0], l[1] - l0[1], l[2] - l0[2]);
  };
  const a = err(1 / 60);
  const b = err(1 / 120);
  const ratio = a / b;
  assert.ok(ratio > 10 && ratio < 24, `ratio ${ratio}`);
});

test('a flat spin about the symmetry axis does not wobble', () => {
  const s = createCoin(FREE);
  s.w1 = 0;
  s.w2 = 0;
  s.w3 = 6;
  const before = [s.w1, s.w2, s.w3];
  run(FREE, 30, s);
  assert.ok(Math.abs(s.w1) < 1e-12 && Math.abs(s.w2) < 1e-12 && Math.abs(s.w3 - before[2]) < 1e-12);
});

test('damping removes energy monotonically', () => {
  const damped = { ...COIN_DEFAULTS, maxOmega: 1e9 };
  const s = createCoin(damped);
  let last = kineticEnergy(s, damped);
  for (let k = 0; k < 20; k++) {
    run(damped, 0.5, s);
    const e = kineticEnergy(s, damped);
    assert.ok(e < last);
    last = e;
  }
});

test('a held coin pulls the grabbed point under the finger', () => {
  const opts = { ...COIN_DEFAULTS };
  const s = createCoin(opts);
  restCoin(s, 0.3);
  const pointer = { x: 0.4, y: 0.2, active: 1 };
  run(opts, 0.05, s);
  for (let t = 0; t < 3; t += 1 / 60) stepCoinFixed(s, 1 / 60, pointer, opts);
  const rw = [0, 0, 0];
  rotate(s, s.gx, s.gy, s.gz, rw);
  stepCoinFixed(s, 0, NONE, opts);
  assert.ok(Math.abs(rw[0] - 0.4) < 0.15 && Math.abs(rw[1] - 0.2) < 0.15, `grab at ${rw[0]}, ${rw[1]}`);
});

test('releasing a flick keeps the angular velocity and then conserves it', () => {
  const opts = { ...COIN_DEFAULTS, damping: 0 };
  const s = createCoin(opts);
  restCoin(s, 0.2);
  let x = -0.5;
  for (let t = 0; t < 0.3; t += 1 / 60) {
    x += 0.04;
    stepCoinFixed(s, 1 / 60, { x, y: 0, active: 1 }, opts);
  }
  stepCoinFixed(s, 1 / 60, NONE, opts);
  const e0 = kineticEnergy(s, opts);
  assert.ok(e0 > 0.05);
  const l0 = [0, 0, 0];
  angularMomentumWorld(s, opts, l0);
  run(opts, 20, s);
  const l1 = [0, 0, 0];
  angularMomentumWorld(s, opts, l1);
  assert.ok(Math.abs(kineticEnergy(s, opts) - e0) / e0 < 1e-9);
  assert.ok(Math.hypot(l1[0] - l0[0], l1[1] - l0[1], l1[2] - l0[2]) / norm(l0) < 1e-9);
});
