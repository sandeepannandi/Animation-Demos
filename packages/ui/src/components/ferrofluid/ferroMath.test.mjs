import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FERRO_DEFAULTS as O, MU0, capillaryLength, criticalWavelength, latticeSpacingMm, latticeSpacingPx,
  criticalMagnetization, dipoleShape, fieldRatio, spikeHeight, spikeRadiusPx,
  createFerro, ferroDown, ferroMove, ferroRelease, ferroStep,
} from './ferroMath.ts';

test('capillary length and critical wavelength match the textbook values', () => {
  const lc = capillaryLength();
  assert.ok(Math.abs(lc - Math.sqrt(0.028 / (1190 * 9.81))) < 1e-12);
  assert.ok(lc > 1.5e-3 && lc < 1.6e-3);
  assert.ok(Math.abs(criticalWavelength() - 2 * Math.PI * lc) < 1e-12);
  assert.ok(criticalWavelength() > 9.5e-3 && criticalWavelength() < 10e-3);
});

test('hexagonal spike spacing is 2 lambda / sqrt(3), about 11 mm', () => {
  const a = latticeSpacingMm();
  assert.ok(Math.abs(a - (2 * criticalWavelength() * 1000) / Math.sqrt(3)) < 1e-9);
  assert.ok(a > 11 && a < 11.5);
  assert.ok(latticeSpacingPx() > 27 && latticeSpacingPx() < 28.5);
});

test('spacing falls as gravity or density rise and grows with surface tension', () => {
  const heavier = { ...O, density: 2 * O.density };
  const stickier = { ...O, surfaceTension: 2 * O.surfaceTension };
  assert.ok(latticeSpacingMm(heavier) < latticeSpacingMm());
  assert.ok(latticeSpacingMm(stickier) > latticeSpacingMm());
  assert.ok(Math.abs(latticeSpacingMm(stickier) / latticeSpacingMm() - Math.SQRT2) < 1e-9);
});

test('critical magnetization satisfies the Cowley-Rosensweig relation', () => {
  const Mc = criticalMagnetization();
  const rhs = 2 * (1 + 1 / O.relativePermeability) * Math.sqrt(O.density * O.gravity * O.surfaceTension);
  assert.ok(Math.abs(MU0 * Mc * Mc - rhs) / rhs < 1e-12);
  assert.ok(Mc > 5000 && Mc < 8000);
});

test('dipole shape equals the vector field magnitude of a point dipole', () => {
  const d = 100;
  const mag = (r) => {
    const R2 = r * r + d * d;
    const Bz = (2 * d * d - r * r) / Math.pow(R2, 2.5);
    const Br = (3 * d * r) / Math.pow(R2, 2.5);
    return Math.hypot(Bz, Br);
  };
  const at0 = mag(0);
  for (const r of [0, 20, 60, 100, 200, 400]) {
    assert.ok(Math.abs(dipoleShape(r, d) - mag(r) / at0) < 1e-12);
  }
  assert.ok(Math.abs(dipoleShape(0, d) - 1) < 1e-12);
});

test('field falls monotonically away from the magnet and the ring has a sensible size', () => {
  let prev = Infinity;
  for (let r = 0; r <= 300; r += 5) {
    const m = fieldRatio(r);
    assert.ok(m < prev);
    prev = m;
  }
  assert.ok(Math.abs(fieldRatio(0) - O.peakRatio) < 1e-9);
  const R = spikeRadiusPx();
  assert.ok(Math.abs(fieldRatio(R) - 1) < 1e-6);
  assert.ok(R > 70 && R < 100);
});

test('no spikes below onset, square-root growth above it, saturation at the cap', () => {
  assert.equal(spikeHeight(0.5), 0);
  assert.equal(spikeHeight(1), 0);
  const eps = (e) => Math.sqrt(1 + e);
  const h1 = spikeHeight(eps(1e-4));
  const h2 = spikeHeight(eps(4e-4));
  assert.ok(h1 > 0);
  assert.ok(Math.abs(h2 / h1 - 2) < 0.01);
  let prev = 0;
  for (const m of [1.01, 1.2, 1.6, 2.1, 3, 6]) {
    const h = spikeHeight(m);
    assert.ok(h > prev);
    assert.ok(h < O.maxHeightPx);
    prev = h;
  }
  assert.ok(O.maxHeightPx - spikeHeight(50) < 1e-6);
});

test('field strength rises, overshoots a little, and settles at 1 while held', () => {
  const st = createFerro(100, 100);
  ferroDown(st, 100, 100);
  let peak = 0;
  for (let i = 0; i < 360; i++) {
    ferroStep(st, 1 / 60);
    peak = Math.max(peak, st.s);
  }
  assert.ok(peak > 1.05 && peak < 1.4);
  assert.ok(Math.abs(st.s - 1) < 1e-3);
});

test('releasing drops the field to zero, never below, and the loop reports it is idle', () => {
  const st = createFerro(100, 100);
  ferroDown(st, 100, 100);
  for (let i = 0; i < 180; i++) ferroStep(st, 1 / 60);
  ferroRelease(st);
  let min = Infinity;
  let moving = true;
  for (let i = 0; i < 240 && moving; i++) {
    moving = ferroStep(st, 1 / 60);
    min = Math.min(min, st.s);
  }
  assert.ok(min >= 0);
  assert.equal(moving, false);
  assert.ok(st.s < 1e-3);
});

test('magnet lags the finger and catches up; the first touch lands exactly', () => {
  const st = createFerro(10, 10);
  ferroDown(st, 200, 250);
  assert.equal(st.mx, 200);
  assert.equal(st.my, 250);
  ferroMove(st, 60, 60);
  ferroStep(st, 1 / 60);
  assert.ok(st.mx < 200 && st.mx > 60);
  for (let i = 0; i < 120; i++) ferroStep(st, 1 / 60);
  assert.ok(Math.abs(st.mx - 60) < 0.5 && Math.abs(st.my - 60) < 0.5);
});

test('result does not depend on how the time is split into frames', () => {
  const a = createFerro(100, 100);
  const b = createFerro(100, 100);
  for (const s of [a, b]) {
    ferroDown(s, 100, 100);
    ferroMove(s, 250, 300);
  }
  for (let i = 0; i < 30; i++) ferroStep(a, 1 / 30);
  for (let i = 0; i < 60; i++) ferroStep(b, 1 / 60);
  assert.ok(Math.abs(a.s - b.s) < 1e-3);
  assert.ok(Math.abs(a.mx - b.mx) < 0.05);
});
