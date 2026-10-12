import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('./rippleMath.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const m = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
const cfg = { width: 300, height: 200, ringWidth: 60, wavelength: 36, amplitude: 14 };
test('origin falls back to the centre for bad or missing points', () => {
  assert.deepEqual(m.originFrom(40, 50, 300, 200), { x: 40, y: 50 });
  assert.deepEqual(m.originFrom(0, 0, 300, 200), { x: 150, y: 100 });
  assert.deepEqual(m.originFrom(NaN, 10, 300, 200), { x: 150, y: 100 });
  assert.deepEqual(m.originFrom(400, 10, 300, 200), { x: 150, y: 100 });
});
test('farthest corner is measured from the tap', () => {
  assert.equal(m.farthestCorner(0, 0, 300, 200), Math.hypot(300, 200));
  assert.equal(m.farthestCorner(150, 100, 300, 200), Math.hypot(150, 100));
});
test('front starts at zero and clears the box by progress 1', () => {
  assert.equal(m.frontRadius(0, 300, 60), 0);
  const end = m.frontRadius(1, 300, 60);
  assert.ok(end - 2.5 * 60 >= 300);
  assert.ok(m.frontRadius(0.5, 300, 60) > m.frontRadius(0.25, 300, 60));
  assert.equal(m.frontRadius(2, 300, 60), end);
});
test('wave is silent at rest and strongest at the start', () => {
  assert.equal(m.waveAmplitude(1, 14), 0);
  assert.equal(m.waveAmplitude(0, 14), 14);
  assert.ok(m.waveAmplitude(0.5, 14) < 14);
  assert.equal(m.waveOffset(0, 60, 36, 0), 0);
  assert.ok(Math.abs(m.waveOffset(9, 60, 36, 14)) > Math.abs(m.waveOffset(300, 60, 36, 14)));
});
test('coverage is a smooth 0 to 1 step', () => {
  assert.equal(m.coverage(-10, 1.5), 0);
  assert.equal(m.coverage(10, 1.5), 1);
  assert.equal(m.coverage(0, 1.5), 0.5);
});
test('settled state shows only the new theme with no displacement', () => {
  const u = m.rippleUniforms(1, { x: 20, y: 30 }, false, false, cfg);
  for (const [x, y] of [[0, 0], [299, 199], [150, 100]]) {
    const s = m.samplePoint(x, y, u);
    assert.equal(s.over, 1); assert.equal(s.x, x); assert.equal(s.y, y);
  }
});
test('start state shows only the old theme', () => {
  const u = m.rippleUniforms(0, { x: 150, y: 100 }, true, false, cfg);
  assert.equal(u.oldIsB, 1);
  assert.equal(m.samplePoint(5, 5, u).over, 0);
});
test('reduced motion cross-fades with no wave', () => {
  const u = m.rippleUniforms(0.5, { x: 10, y: 10 }, false, true, cfg);
  assert.equal(u.amp, 0);
  const s = m.samplePoint(200, 150, u);
  assert.equal(s.over, 0.5); assert.equal(s.x, 200);
});
test('inside the front is new, outside is old, mid-flight', () => {
  const u = m.rippleUniforms(0.1, { x: 150, y: 100 }, false, false, cfg);
  assert.equal(m.samplePoint(150, 100, u).over, 1);
  assert.equal(m.samplePoint(0, 0, u).over, 0);
  assert.ok(u.radius > 0 && u.radius < 400);
});
