import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  RS_DAYS, RS_MAX_HOMES, RS_REVEAL_AT, RS_STACK_CX, RS_SETTLE, RS_DOT_R,
  rsCellX, rsCreate, rsFan, rsHomes, rsModel, rsReset, rsTap, spring, rsCol, rsRow,
} from './rangeMath.ts';

const pick = (a, b, t0 = 1) => {
  let s = rsTap(rsCreate(), a, t0);
  s = rsTap(s, b, t0 + 0.5);
  return { s, t0: t0 + 0.5 };
};

test('spring starts at 0, settles at 1, overshoots, and obeys its ODE', () => {
  assert.equal(spring(0, 380, 19), 0);
  assert.ok(Math.abs(spring(3, 380, 19) - 1) < 1e-4);
  let peak = 0;
  for (let t = 0; t < 1; t += 1 / 240) peak = Math.max(peak, spring(t, 380, 19));
  assert.ok(peak > 1.03 && peak < 1.3, `peak ${peak}`);
  const k = 520, c = 26, h = 1e-4;
  for (const t of [0.04, 0.12, 0.3]) {
    const x = (s) => spring(s, k, c);
    const v = (x(t + h) - x(t - h)) / (2 * h);
    const a = (x(t + h) - 2 * x(t) + x(t - h)) / (h * h);
    assert.ok(Math.abs(a + c * v + k * (x(t) - 1)) < 1, `residual at ${t}`);
  }
});

test('grid geometry: 7 columns by 4 rows, day 1 top-left', () => {
  assert.equal(RS_DAYS, 28);
  assert.equal(rsCol(1), 0); assert.equal(rsRow(1), 0);
  assert.equal(rsCol(7), 6); assert.equal(rsRow(7), 0);
  assert.equal(rsCol(8), 0); assert.equal(rsRow(8), 1);
  assert.ok(rsCellX(2) - rsCellX(1) === 40);
});

test('homes: always 1..5 and varies with the dates', () => {
  const seen = new Set();
  for (let a = 1; a < RS_DAYS; a++) for (let b = a + 1; b <= RS_DAYS; b++) {
    const h = rsHomes(a, b);
    assert.ok(h >= 1 && h <= RS_MAX_HOMES);
    seen.add(h);
  }
  assert.equal(seen.size, RS_MAX_HOMES);
});

test('selection: first tap sets the start, second sets the end, third restarts', () => {
  let s = rsTap(rsCreate(), 3, 1);
  assert.equal(s.start, 3); assert.equal(s.end, 0); assert.equal(s.homes, 0);
  s = rsTap(s, 9, 2);
  assert.equal(s.end, 9); assert.equal(s.homes, rsHomes(3, 9)); assert.equal(s.fFrom, 0);
  s = rsTap(s, 12, 5);
  assert.equal(s.start, 12); assert.equal(s.end, 0); assert.equal(s.homes, 0);
  assert.equal(s.fFrom, rsHomes(3, 9), 'the old stack is what leaves');
  assert.equal(s.prevStart, 3); assert.equal(s.prevEnd, 9);
});

test('selection: tapping an earlier day while choosing the end moves the start', () => {
  let s = rsTap(rsCreate(), 10, 1);
  s = rsTap(s, 4, 2);
  assert.equal(s.start, 4); assert.equal(s.end, 0);
  s = rsTap(s, 4, 3);
  assert.equal(s.end, 0, 'same day is not a range');
  assert.equal(rsTap(s, 99, 4), s, 'out of range taps are ignored');
});

test('the end dot springs in with overshoot and the band grows to the end', () => {
  const { s, t0 } = pick(2, 5);
  const m0 = rsModel(s, t0 + 0.01);
  const start = m0.dots.find((d) => d.day === 2);
  assert.ok(Math.abs(start.scale - 1) < 5e-3, 'start dot already settled');
  assert.ok(m0.bands.length === 1 && m0.bands[0].x1 - m0.bands[0].x0 < 3 * 40 + 2 * RS_DOT_R, 'band has barely started');
  let peak = 0;
  for (let f = 0; f < 60; f++) peak = Math.max(peak, rsModel(s, t0 + f / 60).dots.find((d) => d.day === 5).scale);
  assert.ok(peak > 1.01 && peak < 1.25, `end dot overshoot ${peak}`);
  const done = rsModel(s, t0 + 1);
  assert.equal(done.bands.length, 1);
  assert.ok(Math.abs(done.bands[0].x0 - (rsCellX(2) - RS_DOT_R)) < 1e-6);
  assert.ok(Math.abs(done.bands[0].x1 - (rsCellX(5) + RS_DOT_R)) < 1e-6);
  assert.equal(done.ink[2], 1); assert.equal(done.ink[5], 1); assert.equal(done.ink[3], 0);
});

test('a range that wraps rows becomes one pill per row', () => {
  const { s, t0 } = pick(5, 10);
  const m = rsModel(s, t0 + 1);
  assert.equal(m.bands.length, 2);
  assert.ok(Math.abs(m.bands[0].x1 - (rsCellX(7) + RS_DOT_R)) < 1e-6, 'first row runs to the last column');
  assert.ok(Math.abs(m.bands[1].x0 - (rsCellX(8) - RS_DOT_R)) < 1e-6, 'second row starts at the first column');
  assert.ok(m.bands[1].y > m.bands[0].y);
});

test('footer: skeleton first, then photos fan out, one after another', () => {
  const { s, t0 } = pick(1, 4);
  const at = (dt) => rsModel(s, t0 + dt);
  assert.equal(at(0.02).skeleton, 0);
  assert.ok(at(0.3).skeleton > 0.99, 'skeleton is up before the photos');
  assert.ok(at(0.3).newTiles.every((t) => t.alpha === 0));
  assert.ok(at(RS_REVEAL_AT + 0.06).newTiles[0].alpha > 0.5);
  assert.ok(at(RS_REVEAL_AT + 0.02).newTiles[s.homes - 1].alpha < at(RS_REVEAL_AT + 0.02).newTiles[0].alpha + 1e-9, 'tiles are staggered');
  assert.equal(at(RS_SETTLE).skeleton, 0);
  const end = at(RS_SETTLE);
  for (let i = 0; i < RS_MAX_HOMES; i++) {
    const t = end.newTiles[i];
    if (i < s.homes) {
      const f = rsFan(s.homes, i);
      assert.ok(Math.abs(t.x - f.x) < 0.1 && Math.abs(t.y - f.y) < 0.1 && Math.abs(t.rot - f.rot) < 0.2);
      assert.ok(Math.abs(t.scale - 1) < 0.01 && t.alpha === 1);
    } else assert.equal(t.alpha, 0);
  }
  assert.equal(end.labelNew, 1);
});

test('tiles overshoot their resting angle on the spring and settle', () => {
  const { s, t0 } = pick(1, 4);
  const f = rsFan(s.homes, s.homes - 1);
  let peak = -1e9;
  for (let k = 0; k < 90; k++) peak = Math.max(peak, rsModel(s, t0 + RS_REVEAL_AT + k / 60).newTiles[s.homes - 1].scale);
  assert.ok(peak > 1.01, `scale overshoot ${peak}`);
  assert.ok(Math.abs(f.x - RS_STACK_CX) >= 0);
});

test('restarting clears: old stack shrinks away, old dots fade, footer goes idle', () => {
  let { s, t0 } = pick(1, 6);
  const shown = s.homes;
  s = rsTap(s, 15, t0 + 3);
  const t1 = t0 + 3;
  const mid = rsModel(s, t1 + 0.05);
  assert.ok(mid.oldTiles.slice(0, shown).every((t) => t.alpha > 0.3 && t.alpha < 1));
  assert.ok(mid.labelOld > 0 && mid.labelOld < 1);
  assert.ok(mid.dots.some((d) => d.day === 1 && d.scale < 1 && d.scale > 0));
  const later = rsModel(s, t1 + 1);
  assert.ok(later.oldTiles.every((t) => t.alpha === 0));
  assert.ok(later.newTiles.every((t) => t.alpha === 0));
  assert.equal(later.labelNew, 1, 'idle prompt is back');
  assert.equal(later.bands.length, 0);
  assert.equal(later.dots.length, 1);
});

test('changing the range during the skeleton keeps the stack that was showing', () => {
  let s = rsTap(rsCreate(), 2, 1);
  s = rsTap(s, 6, 1.5);
  s = rsTap(s, 9, 1.7);
  assert.equal(s.fFrom, 0, 'nothing had been revealed yet');
  assert.equal(s.homes, 0);
  const m = rsModel(s, 1.8);
  assert.ok(m.oldTiles.every((t) => t.alpha === 0));
});

test('reset returns to idle', () => {
  const { s, t0 } = pick(3, 8);
  const r = rsReset(t0 + 2, s);
  assert.equal(r.start, 0); assert.equal(r.homes, 0);
  assert.equal(rsModel(r, t0 + 4).dots.length, 0);
});

test('motion is continuous at 60 fps: no tile moves more than 25 px a frame', () => {
  const { s, t0 } = pick(1, 6);
  let prev = rsModel(s, t0);
  let worst = 0;
  for (let f = 1; f <= 120; f++) {
    const m = rsModel(s, t0 + f / 60);
    for (let i = 0; i < RS_MAX_HOMES; i++) worst = Math.max(worst, Math.hypot(m.newTiles[i].x - prev.newTiles[i].x, m.newTiles[i].y - prev.newTiles[i].y));
    prev = m;
  }
  assert.ok(worst < 25, `largest step ${worst}`);
});
