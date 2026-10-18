import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('./lensMath.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const m = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
const cfg = { width: 300, height: 200, radius: 60, strength: 0.45, aberration: 0.03 };
const still = (grow = 1, reduce = false) => m.lensUniforms(150, 100, 150, 100, grow, reduce, cfg);
test('lens target stays inside the box and falls back to the middle', () => {
  assert.deepEqual(m.lensTarget(40, 50, 300, 200), { x: 40, y: 50 });
  assert.deepEqual(m.lensTarget(-20, 500, 300, 200), { x: 0, y: 200 });
  assert.deepEqual(m.lensTarget(NaN, 5, 300, 200), { x: 150, y: 100 });
});
test('stretch follows the lag, points the way it travels and is capped', () => {
  assert.deepEqual(m.stretchFrom(10, 10, 10, 10, false), { stretch: 0, ax: 1, ay: 0 });
  const s = m.stretchFrom(0, 0, 0, 120, false);
  assert.equal(s.ax, 0); assert.equal(s.ay, 1);
  assert.ok(s.stretch > 0 && s.stretch <= m.MAX_STRETCH);
  assert.equal(m.stretchFrom(0, 0, 900, 0, false).stretch, m.MAX_STRETCH);
  assert.equal(m.stretchFrom(0, 0, 900, 0, true).stretch, 0);
});
test('uniforms scale the radius with grow and clamp it', () => {
  assert.equal(still(1).radius, 60);
  assert.equal(still(0).radius, 0);
  assert.equal(still(5).radius, 60 * 1.3);
  assert.equal(still(1, true).aberration, 0);
  assert.equal(still(1).aberration, 0.03);
});
test('distance is round when still and longer along the travel axis when stretched', () => {
  const u = still();
  assert.ok(Math.abs(m.lensDistance(180, 100, u) - 30) < 1e-9);
  assert.ok(Math.abs(m.lensDistance(150, 130, u) - 30) < 1e-9);
  const t = m.lensUniforms(150, 100, 270, 100, 1, false, cfg);
  assert.ok(t.stretch > 0.3);
  assert.ok(m.lensDistance(180, 100, t) < m.lensDistance(150, 130, t));
});
test('sample scale magnifies in the middle, passes through 1 and bends back at the rim', () => {
  assert.ok(Math.abs(m.sampleScale(0, 0.45) - 0.55) < 1e-9);
  assert.ok(m.sampleScale(0.5, 0.45) < 1);
  assert.ok(m.sampleScale(1, 0.45) > 1);
  assert.equal(m.sampleScale(0, 0), 1);
});
test('samplePoint: centre is magnified, far pixels are untouched', () => {
  const u = still();
  const mid = m.samplePoint(180, 100, u);
  assert.ok(mid.cover > 0.99);
  assert.ok(mid.g.x < 180 && mid.g.x > 150);
  assert.ok(Math.abs(mid.g.x - (150 + 30 * m.sampleScale(0.5, 0.45))) < 1e-9);
  const far = m.samplePoint(20, 20, u);
  assert.equal(far.cover, 0);
  assert.ok(far.shadow < 0.001);
  assert.ok(Math.abs(far.g.x - (20 + (20 - 150) * (m.sampleScale(1, 0.45) - 1))) < 1e-9);
});
test('colour fringe separates red and blue only when motion is allowed', () => {
  const p = m.samplePoint(190, 100, still());
  assert.ok(p.r.x < p.g.x && p.g.x < p.b.x);
  const q = m.samplePoint(190, 100, still(1, true));
  assert.equal(q.r.x, q.g.x); assert.equal(q.g.x, q.b.x);
});
test('a hidden lens draws nothing and a lit rim exists', () => {
  const h = m.samplePoint(150, 100, still(0));
  assert.equal(h.cover, 0); assert.equal(h.light, 0); assert.equal(h.shadow, 0);
  let max = 0;
  for (let a = 0; a < 360; a += 15) { const r = 59; max = Math.max(max, m.samplePoint(150 + r * Math.cos(a * Math.PI / 180), 100 + r * Math.sin(a * Math.PI / 180), still()).light); }
  assert.ok(max > 0.3);
});
test('shadow falls off with distance outside the rim', () => {
  const near = m.samplePoint(150 + 66, 100, still()).shadow, far = m.samplePoint(150 + 110, 100, still()).shadow;
  assert.ok(near > far && far > 0);
});
test('springStep settles on the target without NaN', () => {
  let s = { pos: 0, vel: 0 };
  for (let i = 0; i < 120; i++) s = m.springStep(s.pos, s.vel, 100, 1 / 60);
  assert.ok(Math.abs(s.pos - 100) < 0.5 && Math.abs(s.vel) < 1);
  let o = 0, v = 0, peak = 0;
  for (let i = 0; i < 60; i++) { ({ pos: o, vel: v } = m.springStep(o, v, 100, 1 / 60)); peak = Math.max(peak, o); }
  assert.ok(peak > 100);
});
