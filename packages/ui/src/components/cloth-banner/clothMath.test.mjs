import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLOTH_DEFAULTS, createCloth, stepClothFixed, computeMesh, clothIndices, clothUV,
  pickParticle, projectX, projectY, totalMotion, windAt, particleCount,
} from './clothMath.ts';

const CFG = {
  cols: 17, rows: 12,
  spacingX: 300 / 16, spacingY: 200 / 11,
  originX: 48, originY: 40,
  perspective: 620, centerX: 198, centerY: 140,
};
const QUIET = { ...CLOTH_DEFAULTS, windStrength: 0 };
const NO_POINTER = { x: 0, y: 0, active: 0 };

test('createCloth lays out a flat grid with two pinned top corners', () => {
  const s = createCloth(CFG);
  assert.equal(particleCount(CFG), 204);
  assert.equal(s.pinned[0], 1);
  assert.equal(s.pinned[CFG.cols - 1], 1);
  assert.equal(s.pinned[1], 0);
  assert.equal(s.pos[0], CFG.originX);
  assert.equal(s.pos[1], CFG.originY);
  const topMid = Math.floor(CFG.cols / 2) * 3;
  assert.ok(Math.abs(s.pos[topMid + 1] - CFG.originY) < 1e-4);
  const last = (particleCount(CFG) - 1) * 3;
  assert.ok(Math.abs(s.pos[last + 1] - (CFG.originY + (CFG.rows - 1) * CFG.spacingY)) < 1e-4);
});

test('gravity sags the middle of the top edge below the pin line', () => {
  const s = createCloth(CFG);
  for (let i = 0; i < 240; i++) stepClothFixed(s, CFG, 1 / 60, NO_POINTER, QUIET);
  const topMid = Math.floor(CFG.cols / 2) * 3;
  assert.ok(s.pos[topMid + 1] > CFG.originY + 4, `top middle sagged to ${s.pos[topMid + 1]}`);
  // Pins never move.
  assert.equal(s.pos[0], CFG.originX);
  assert.equal(s.pos[1], CFG.originY);
  const rightPin = (CFG.cols - 1) * 3;
  assert.equal(s.pos[rightPin], CFG.originX + (CFG.cols - 1) * CFG.spacingX);
  assert.equal(s.pos[rightPin + 1], CFG.originY);
});

test('constraints hold: no edge stretches past 25% after settling', () => {
  const s = createCloth(CFG);
  for (let i = 0; i < 300; i++) stepClothFixed(s, CFG, 1 / 60, NO_POINTER, CLOTH_DEFAULTS);
  let worst = 0;
  for (let r = 0; r < CFG.rows; r++) {
    for (let c = 0; c < CFG.cols - 1; c++) {
      const a = (r * CFG.cols + c) * 3, b = a + 3;
      const d = Math.hypot(s.pos[b] - s.pos[a], s.pos[b + 1] - s.pos[a + 1], s.pos[b + 2] - s.pos[a + 2]);
      worst = Math.max(worst, Math.abs(d - CFG.spacingX) / CFG.spacingX);
    }
  }
  assert.ok(worst < 0.25, `worst stretch ${worst}`);
});

test('wind billows the cloth in z; no wind keeps it planar', () => {
  const windy = createCloth(CFG);
  for (let i = 0; i < 180; i++) stepClothFixed(windy, CFG, 1 / 60, NO_POINTER, CLOTH_DEFAULTS);
  let zRange = 0;
  for (let i = 2; i < windy.pos.length; i += 3) zRange = Math.max(zRange, Math.abs(windy.pos[i]));
  assert.ok(zRange > 6, `wind z range ${zRange}`);

  const calm = createCloth(CFG);
  for (let i = 0; i < 180; i++) stepClothFixed(calm, CFG, 1 / 60, NO_POINTER, QUIET);
  let zMax = 0;
  for (let i = 2; i < calm.pos.length; i += 3) zMax = Math.max(zMax, Math.abs(calm.pos[i]));
  assert.ok(zMax < 1e-6, `calm z max ${zMax}`);
  assert.equal(windAt(10, 10, 0.4, 0), 0);
});

test('a grabbed particle follows the pointer and flings on release', () => {
  const s = createCloth(CFG);
  for (let i = 0; i < 60; i++) stepClothFixed(s, CFG, 1 / 60, NO_POINTER, QUIET);
  const bottomMid = (CFG.rows - 1) * CFG.cols + Math.floor(CFG.cols / 2);
  const k = bottomMid * 3;
  const sx = projectX(CFG, s.pos[k], s.pos[k + 2]);
  const sy = projectY(CFG, s.pos[k + 1], s.pos[k + 2]);
  assert.equal(pickParticle(s, CFG, sx, sy, CLOTH_DEFAULTS.grabRadius), bottomMid);
  assert.equal(pickParticle(s, CFG, CFG.originX, CFG.originY, 5), -1); // the pin itself is not grabbable

  s.grabbed = bottomMid;
  s.grabZ = s.pos[k + 2];
  const pull = { x: sx - 120, y: sy - 60, active: 1 };
  for (let i = 0; i < 60; i++) stepClothFixed(s, CFG, 1 / 60, pull, QUIET);
  const fx = projectX(CFG, s.pos[k], s.pos[k + 2]);
  const fy = projectY(CFG, s.pos[k + 1], s.pos[k + 2]);
  assert.ok(Math.hypot(fx - pull.x, fy - pull.y) < 12, `grabbed point at ${fx},${fy}`);

  s.grabbed = -1;
  const after = { x: 0, y: 0, active: 0 };
  stepClothFixed(s, CFG, 1 / 60, after, QUIET);
  const drift = Math.hypot(s.pos[k] - s.prev[k], s.pos[k + 1] - s.prev[k + 1]);
  assert.ok(drift > 0.001, `release keeps velocity, drift ${drift}`);
});

test('a released cloth settles under quiet air', () => {
  const s = createCloth(CFG);
  for (let i = 0; i < 120; i++) stepClothFixed(s, CFG, 1 / 60, { x: CFG.centerX, y: CFG.centerY + 200, active: 0 }, QUIET);
  const before = totalMotion(s);
  for (let i = 0; i < 600; i++) stepClothFixed(s, CFG, 1 / 60, NO_POINTER, QUIET);
  const after = totalMotion(s);
  assert.ok(after < before, `motion ${before} -> ${after}`);
  assert.ok(after < 2, `still moving: ${after}`);
});

test('computeMesh shades a flat cloth fully lit and keeps sizes', () => {
  const s = createCloth(CFG);
  const xy = [], shade = [];
  computeMesh(s, CFG, xy, shade, CLOTH_DEFAULTS);
  const n = particleCount(CFG);
  assert.equal(xy.length, n);
  assert.equal(shade.length, n);
  // Flat cloth faces the viewer; the light is tilted, so dot = lz / |L|.
  const llen = Math.hypot(0.35, 0.5, 0.79);
  const lit = CLOTH_DEFAULTS.ambient + CLOTH_DEFAULTS.diffuse * (0.79 / llen);
  for (let i = 0; i < n; i++) {
    assert.ok(Math.abs(shade[i] - lit) < 1e-6, `flat shade ${shade[i]}`);
    assert.ok(Number.isFinite(xy[i].x) && Number.isFinite(xy[i].y));
  }
  // After wind, folds change the shade field.
  for (let i = 0; i < 180; i++) stepClothFixed(s, CFG, 1 / 60, NO_POINTER, CLOTH_DEFAULTS);
  computeMesh(s, CFG, xy, shade, CLOTH_DEFAULTS);
  let min = 1, max = 0;
  for (const v of shade) { min = Math.min(min, v); max = Math.max(max, v); }
  assert.ok(max - min > 0.02, `fold shade spread ${max - min}`);
  for (const v of shade) assert.ok(v >= 0 && v <= 1);
});

test('indices and uv cover the grid once', () => {
  const idx = clothIndices(CFG);
  assert.equal(idx.length, (CFG.cols - 1) * (CFG.rows - 1) * 6);
  assert.ok(Math.max(...idx) < particleCount(CFG));
  const uv = clothUV(CFG, 600, 400);
  assert.equal(uv.length, particleCount(CFG));
  assert.deepEqual(uv[0], { x: 0, y: 0 });
  assert.deepEqual(uv[uv.length - 1], { x: 600, y: 400 });
});

test('the simulation is deterministic', () => {
  const a = createCloth(CFG), b = createCloth(CFG);
  for (let i = 0; i < 240; i++) {
    stepClothFixed(a, CFG, 1 / 60, NO_POINTER, CLOTH_DEFAULTS);
    stepClothFixed(b, CFG, 1 / 60, NO_POINTER, CLOTH_DEFAULTS);
  }
  assert.deepEqual([...a.pos], [...b.pos]);
});
