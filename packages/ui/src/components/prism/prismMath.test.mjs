import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PRISM_DEFAULTS as O, cauchyN, refractVec, reflectVec, wavelengthToRGB,
  prismVertices, tracePrism, createPrism, prismDown, prismMove, prismRelease, prismStep,
} from './prismMath.ts';

const DEG = Math.PI / 180;

test('Cauchy index matches crown glass at the Fraunhofer lines and falls with wavelength', () => {
  assert.ok(Math.abs(cauchyN(486.1) - 1.5224) < 5e-4);
  assert.ok(Math.abs(cauchyN(587.6) - 1.5168) < 5e-4);
  assert.ok(Math.abs(cauchyN(656.3) - 1.5143) < 5e-4);
  assert.ok(cauchyN(400) > cauchyN(550) && cauchyN(550) > cauchyN(700));
});

test('refractVec obeys Snell: n1 sin(theta1) = n2 sin(theta2)', () => {
  const N = [0, 1];
  const i = 45 * DEG;
  const I = [Math.sin(i), -Math.cos(i)]; // 45 deg from the normal, pointing down
  const T = refractVec(I[0], I[1], N[0], N[1], 1, 1.5);
  assert.ok(T);
  const sinT = Math.abs(T[0]);
  assert.ok(Math.abs(1 * Math.sin(i) - 1.5 * sinT) < 1e-12);
  assert.ok(Math.abs(Math.hypot(T[0], T[1]) - 1) < 1e-12);
  assert.ok(T[1] < 0); // still travelling into the glass
});

test('refractVec returns null past the critical angle and refracts just below it', () => {
  const N = [0, -1]; // surface below, ray travelling up out of glass
  const crit = Math.asin(1 / 1.5);
  for (const dd of [-1, 1]) {
    const i = crit + dd * 0.5 * DEG;
    const I = [Math.sin(i), Math.cos(i)];
    const T = refractVec(I[0], I[1], N[0], N[1], 1.5, 1);
    if (dd > 0) assert.equal(T, null);
    else assert.ok(T);
  }
});

test('reflectVec mirrors the normal component and keeps the tangential one', () => {
  const N = [0, 1];
  const I = [0.6, -0.8];
  const R = reflectVec(I[0], I[1], N[0], N[1]);
  assert.ok(Math.abs(R[0] - 0.6) < 1e-12);
  assert.ok(Math.abs(R[1] - 0.8) < 1e-12);
  const angIn = Math.abs(Math.atan2(I[0], -I[1]));
  const angOut = Math.abs(Math.atan2(R[0], R[1]));
  assert.ok(Math.abs(angIn - angOut) < 1e-12);
});

// Minimum deviation: rotate the prism so the incidence equals asin(n sin(A/2))
// and the measured deviation must equal 2 asin(n sin(A/2)) - A.
test('equilateral prism at minimum deviation matches the textbook formula', () => {
  const A = 60 * DEG;
  const side = 100;
  for (const lam of [450, 550, 650]) {
    const n = cauchyN(lam);
    const imin = Math.asin(n * Math.sin(A / 2));
    const tilt = imin - 30 * DEG; // incidence is 30 deg + tilt on the left face
    const cx = 160;
    const cy = 150;
    const tr = tracePrism(0, cy, 1, 0, cx, cy, tilt, side, false, { ...O, lambdaRefNm: lam });
    assert.ok(tr.hit, 'beam hits');
    assert.ok(tr.fanOn, 'fan exits');
    const dev = Math.atan2(1 * tr.refDY - 0 * tr.refDX, 1 * tr.refDX + 0 * tr.refDY);
    const expected = 2 * imin - A;
    assert.ok(Math.abs(dev - expected) < 0.05 * DEG, `deviation ${dev / DEG} vs ${expected / DEG}`);
    // The internal reference ray is parallel to the (tilted) base at minimum
    // deviation, so its slope equals tan(tilt).
    const p = tr.internal;
    const slope = (p[3] - p[1]) / (p[2] - p[0]);
    assert.ok(Math.abs(slope - Math.tan(tilt)) < 0.01, `internal slope ${slope} vs ${Math.tan(tilt)}`);
  }
});

test('violet bends more than red: the fan spreads a few degrees and never inverts', () => {
  const tr = tracePrism(0, 150, 1, 0, 160, 150, O.restTilt, 100, false);
  assert.ok(tr.hit && tr.fanOn);
  assert.ok(Math.abs(tr.phi1 - tr.phi0) > 1 * DEG, `spread ${(tr.phi1 - tr.phi0) / DEG} deg`);
  assert.ok(Math.abs(tr.phi1 - tr.phi0) < 12 * DEG);
  assert.equal(tr.lut.length, 16);
  assert.ok(Math.abs(tr.lut[0] - 700) < 15, `red end ${tr.lut[0]}`);
  assert.ok(Math.abs(tr.lut[15] - 380) < 15, `violet end ${tr.lut[15]}`);
  for (let i = 1; i < 16; i++) assert.ok(tr.lut[i] <= tr.lut[i - 1] + 1e-9, 'lut falls from red to violet');
});

test('a beam that misses the prism is not traced', () => {
  const tr = tracePrism(0, 300, 1, 0, 160, 150, 0, 100, false);
  assert.equal(tr.hit, false);
  assert.equal(tr.fanOn, false);
});

test('steep incidence totally internally reflects, bounces once, and exits elsewhere', () => {
  // Tilt -1.5 degrees: 28.5 degree incidence puts the reference ray past the
  // critical angle at the right face (n sin r2 > 1).
  const tr = tracePrism(0, 150, 1, 0, 160, 150, -1.5 * DEG, 100, false);
  assert.ok(tr.hit);
  assert.ok(tr.bounces >= 1, 'reference ray bounced');
  assert.ok(tr.internal.length >= 6, 'bounce adds a vertex to the path');
});

test('monochromatic mode traces a single wavelength with no fan spread', () => {
  const tr = tracePrism(0, 150, 1, 0, 160, 150, O.restTilt, 100, true);
  assert.ok(tr.hit && tr.fanOn && tr.mono);
  assert.ok(Math.abs(tr.phi1 - tr.phi0) < 1e-12);
  assert.ok(tr.lut.every((l) => Math.abs(l - O.monoLambdaNm) < 1e-9));
});

test('wavelengthToRGB puts violet, green and red in the right places', () => {
  const [r4, g4, b4] = wavelengthToRGB(410);
  assert.ok(b4 > r4 && r4 > g4 && g4 < 0.05);
  const [r5, g5, b5] = wavelengthToRGB(540);
  assert.ok(g5 > r5 && g5 > b5 && b5 < 0.05);
  const [r6, g6, b6] = wavelengthToRGB(680);
  assert.ok(r6 > 0.9 && g6 < 0.05 && b6 < 0.05);
  assert.deepEqual(wavelengthToRGB(900), [0, 0, 0]);
  for (const l of [380, 460, 500, 560, 600, 700, 780]) {
    const c = wavelengthToRGB(l);
    assert.ok(c.every((v) => v >= 0 && v <= 1));
  }
});

test('prism follows the finger with a grab offset and stays put on release', () => {
  const st = createPrism(160, 252);
  prismDown(st, 200, 300); // grabbed 40,48 past the centre: no jump
  for (let i = 0; i < 400; i++) prismStep(st, 1 / 60);
  assert.ok(Math.abs(st.x - 160) < 1 && Math.abs(st.y - 252) < 1);
  prismMove(st, 100, 100);
  for (let i = 0; i < 400; i++) prismStep(st, 1 / 60);
  assert.ok(Math.abs(st.x - 60) < 1 && Math.abs(st.y - 52) < 1);
  prismRelease(st);
  const x = st.x;
  const y = st.y;
  for (let i = 0; i < 200; i++) prismStep(st, 1 / 60);
  assert.ok(Math.abs(st.x - x) < 2 && Math.abs(st.y - y) < 2);
  assert.ok(Math.abs(st.tilt - O.restTilt) < 0.01);
});

test('dragging sideways leans the prism and the lean settles back', () => {
  const st = createPrism(160, 252);
  prismDown(st, 160, 252);
  prismMove(st, 260, 252);
  let maxTilt = -Infinity;
  for (let i = 0; i < 30; i++) {
    prismStep(st, 1 / 60);
    maxTilt = Math.max(maxTilt, st.tilt);
  }
  assert.ok(maxTilt > O.restTilt + 0.02, `leaned to ${maxTilt}`);
  prismRelease(st);
  for (let i = 0; i < 600; i++) prismStep(st, 1 / 60);
  assert.ok(Math.abs(st.tilt - O.restTilt) < 0.005);
});

test('the spring does not depend on how the time is split into frames', () => {
  const run = (frames, dt) => {
    const st = createPrism(160, 252);
    prismDown(st, 160, 252);
    prismMove(st, 60, 100);
    for (let i = 0; i < frames; i++) prismStep(st, dt);
    return st;
  };
  const a = run(120, 1 / 60);
  const b = run(240, 1 / 120);
  assert.ok(Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5);
  assert.ok(Math.abs(a.tilt - b.tilt) < 0.005);
});

test('triangle vertices form an equilateral apex-up triangle', () => {
  const v = prismVertices(160, 150, 0, 100);
  const d = (i, j) => Math.hypot(v[2 * i] - v[2 * j], v[2 * i + 1] - v[2 * j + 1]);
  assert.ok(Math.abs(d(0, 1) - 100) < 1e-9);
  assert.ok(Math.abs(d(1, 2) - 100) < 1e-9);
  assert.ok(Math.abs(d(2, 0) - 100) < 1e-9);
  assert.ok(v[1] < v[3] && v[1] < v[5]); // apex on top
  assert.ok(Math.abs(v[3] - v[5]) < 1e-9); // base horizontal
});

test('the prism cannot be dragged out of the card', () => {
  const st = createPrism(160, 252);
  prismDown(st, 160, 252, 320, 340, 45);
  prismMove(st, -500, 900, 320, 340, 45);
  for (let i = 0; i < 400; i++) prismStep(st, 1 / 60);
  assert.ok(Math.abs(st.x - 45) < 1 && Math.abs(st.y - 295) < 1, `settled at ${st.x},${st.y}`);
  // Grab offset is respected inside the clamp: grabbed 40,48 past the centre.
  const st2 = createPrism(160, 252);
  prismDown(st2, 200, 300, 320, 340, 45);
  prismMove(st2, -500, 900, 320, 340, 45);
  for (let i = 0; i < 400; i++) prismStep(st2, 1 / 60);
  assert.ok(Math.abs(st2.x - 45) < 1 && Math.abs(st2.y - 295) < 1, `settled at ${st2.x},${st2.y}`);
  // Without bounds the old behaviour is unchanged.
  const st3 = createPrism(160, 252);
  prismDown(st3, 160, 252);
  prismMove(st3, -500, 900);
  for (let i = 0; i < 400; i++) prismStep(st3, 1 / 60);
  assert.ok(Math.abs(st3.x - -500) < 1 && Math.abs(st3.y - 900) < 1);
});
