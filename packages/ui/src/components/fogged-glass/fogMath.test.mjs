import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FOG_DEFAULTS, createFog, stepFogFixed, applyWipe, clearBand, packFrame,
  fogAt, totalFog, hash01, rand, cellCount, maxDrops, STRIDE,
} from './fogMath.ts';

const CFG = { cols: 96, rows: 128, width: 340, height: 460 };
const OPTS = { ...FOG_DEFAULTS };

function fresh() {
  return createFog(CFG, OPTS);
}

test('createFog starts nearly opaque with deterministic grain', () => {
  const a = fresh();
  const b = fresh();
  assert.equal(cellCount(CFG), 96 * 128);
  assert.ok(fogAt(a, CFG, 170, 230) > 0.85);
  assert.deepEqual(Array.from(a.fog.slice(0, 64)), Array.from(b.fog.slice(0, 64)));
  assert.equal(a.dropCount, 0);
});

test('hash01 and rand are deterministic and bounded', () => {
  const s = fresh();
  for (let i = 0; i < 200; i++) {
    const h = hash01(i, 7);
    assert.ok(h >= 0 && h < 1);
    const r = rand(s);
    assert.ok(r >= 0 && r < 1);
  }
  const a = fresh();
  const b = fresh();
  assert.equal(rand(a), rand(b));
});

test('a wipe clears a capsule around the stroke', () => {
  const s = fresh();
  const before = totalFog(s);
  clearBand(s, CFG, 40, 100, 300, 100, OPTS.wipeRadius);
  assert.ok(totalFog(s) < before - 500);
  assert.ok(fogAt(s, CFG, 170, 100) < 0.05, `stroke center fog ${fogAt(s, CFG, 170, 100)}`);
  assert.ok(fogAt(s, CFG, 170, 160) > 0.7, `far from stroke fog ${fogAt(s, CFG, 170, 160)}`);
  // Corners untouched.
  assert.ok(fogAt(s, CFG, 10, 440) > 0.85);
});

test('fog creeps back over a wipe', () => {
  const s = fresh();
  clearBand(s, CFG, 40, 100, 300, 100, OPTS.wipeRadius);
  const early = fogAt(s, CFG, 170, 100);
  for (let i = 0; i < 60 * 20; i++) stepFogFixed(s, CFG, 1 / 60, OPTS);
  const late = fogAt(s, CFG, 170, 100);
  assert.ok(late > early + 0.3, `regrowth ${early} -> ${late}`);
  assert.ok(late <= 1);
});

test('wiping leaves beads near the stroke rim', () => {
  const s = fresh();
  // Long fast stroke: guaranteed to squeeze out at least one bead.
  for (let x = 30; x <= 310; x += 8) applyWipe(s, CFG, x, 200 + Math.sin(x / 30) * 20, OPTS);
  assert.ok(s.dropCount > 0, 'expected rim beads');
});

function plantBead(s, x, y) {
  const want = s.dropCount + 1;
  for (let i = 0; i < 60 && s.dropCount < want; i++) applyWipe(s, CFG, x + i * 2, y + (i % 5) * 7, OPTS);
  assert.ok(s.dropCount >= want, 'a wipe burst leaves a bead');
}

test('big beads run downhill, clear a trail and can stick again', () => {
  const s = fresh();
  // Plant one big bead by hand via a wipe burst then force its size.
  plantBead(s, 100, 60);
  // Find the slot and make it big enough to slide.
  let slot = -1;
  for (let i = 0; i < maxDrops(); i++) if (s.drops[i * STRIDE + 3] !== 0) { slot = i; break; }
  s.drops[slot * STRIDE + 2] = 8;
  const y0 = s.drops[slot * STRIDE + 1];
  let stuckAgain = false;
  for (let i = 0; i < 60 * 12; i++) {
    stepFogFixed(s, CFG, 1 / 60, OPTS);
    if (s.drops[slot * STRIDE + 3] === 1) { stuckAgain = true; break; }
    if (s.drops[slot * STRIDE + 3] === 0) break;
  }
  const y1 = s.drops[slot * STRIDE + 1];
  const gone = s.drops[slot * STRIDE + 3] === 0;
  assert.ok(gone || y1 > y0 + 40 || stuckAgain, `bead moved ${y0} -> ${y1} gone=${gone} stuck=${stuckAgain}`);
  // Trail behind the bead is clearer than the untouched pane.
  if (!gone) {
    const trail = fogAt(s, CFG, s.drops[slot * STRIDE], Math.max(6, y1 - 60));
    assert.ok(trail < 0.65, `trail fog ${trail}`);
  }
});

test('a running bead swallows smaller beads in its path', () => {
  const s = fresh();
  plantBead(s, 60, 40);
  plantBead(s, 61, 120);
  assert.ok(s.dropCount >= 2);
  let a = -1, b = -1;
  for (let i = 0; i < maxDrops(); i++) if (s.drops[i * STRIDE + 3] !== 0) { if (a < 0) a = i; else { b = i; break; } }
  // Upper bead big, lower bead small, same column.
  s.drops[a * STRIDE] = 100; s.drops[a * STRIDE + 1] = 60; s.drops[a * STRIDE + 2] = 8;
  s.drops[b * STRIDE] = 101; s.drops[b * STRIDE + 1] = 100; s.drops[b * STRIDE + 2] = 2;
  const before = s.dropCount;
  const QUIET = { ...OPTS, nucleationInterval: 99999, microShed: 0 };
  for (let i = 0; i < 240; i++) stepFogFixed(s, CFG, 1 / 60, QUIET);
  assert.ok(s.dropCount < before, `merged ${before} -> ${s.dropCount}`);
});

test('nucleation condenses beads out of heavy fog on its own', () => {
  const s = fresh();
  for (let i = 0; i < 60 * 8; i++) stepFogFixed(s, CFG, 1 / 60, OPTS);
  assert.ok(s.dropCount > 0, 'ambient beads formed');
});

test('dropCount never exceeds the slot cap and slots recycle', () => {
  const s = fresh();
  for (let i = 0; i < 60 * 30; i++) {
    stepFogFixed(s, CFG, 1 / 60, OPTS);
    if (i % 30 === 0) applyWipe(s, CFG, 20 + (i % 200), 60 + (i % 300), OPTS);
    assert.ok(s.dropCount <= maxDrops());
    assert.ok(Number.isFinite(totalFog(s)));
  }
});

test('packFrame writes fog into R/A and domes into G, beads clear fog', () => {
  const s = fresh();
  const bytes = new Uint8Array(96 * 128 * 4);
  packFrame(s, CFG, bytes);
  const mid = (64 * 96 + 48) * 4;
  assert.ok(bytes[mid] > 200, `fog byte ${bytes[mid]}`);
  assert.equal(bytes[mid + 1], 0);
  // Plant a bead and repack: dome visible, fog cleared under it.
  plantBead(s, 170, 230);
  let slot = -1;
  for (let i = 0; i < maxDrops(); i++) if (s.drops[i * STRIDE + 3] !== 0) { slot = i; break; }
  s.drops[slot * STRIDE] = 170; s.drops[slot * STRIDE + 1] = 230; s.drops[slot * STRIDE + 2] = 9;
  packFrame(s, CFG, bytes);
  const cx = Math.floor((170 / 340) * 96);
  const cy = Math.floor((230 / 460) * 128);
  const at = (cy * 96 + cx) * 4;
  assert.ok(bytes[at + 1] > 180, `dome byte ${bytes[at + 1]}`);
  assert.ok(bytes[at] < 60, `fog under bead ${bytes[at]}`);
});

test('whole sim stays finite over a long run', () => {
  const s = fresh();
  for (let i = 0; i < 60 * 60; i++) {
    if (i % 45 === 0) applyWipe(s, CFG, 30 + ((i * 7) % 280), 40 + ((i * 11) % 380), OPTS);
    stepFogFixed(s, CFG, 1 / 60, OPTS);
  }
  for (let i = 0; i < s.fog.length; i += 97) assert.ok(Number.isFinite(s.fog[i]));
  for (let d = 0; d < maxDrops() * STRIDE; d++) assert.ok(Number.isFinite(s.drops[d]));
});
