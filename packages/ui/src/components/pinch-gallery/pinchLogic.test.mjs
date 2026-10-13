import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cellSize, tileRect, contentHeight, tileAtPoint, anchorAt, pinchTarget, pinchProgress, shouldCommit, anchorScroll, rangeSelection, edgeSpeed, lerpRect, clamp } from './pinchLogic.ts';
const W = 300, G = 6;
test('tiles fill the width exactly with gaps', () => { for (const c of [2, 3, 5]) { const last = tileRect(c - 1, c, W, G); assert.ok(Math.abs(last.x + last.w - W) < 1e-9); } });
test('content height matches the last row', () => { const c = 3, n = 10, r = tileRect(n - 1, c, W, G); assert.ok(Math.abs(contentHeight(n, c, W, G) - (r.y + r.h)) < 1e-9); assert.equal(contentHeight(0, 3, W, G), 0); });
test('tileAtPoint round trips every tile center and clamps past the end', () => { for (const c of [2, 3, 5]) for (let i = 0; i < 17; i++) { const r = tileRect(i, c, W, G); assert.equal(tileAtPoint(r.x + r.w / 2, r.y + r.h / 2, 17, c, W, G), i); } assert.equal(tileAtPoint(9999, 9999, 17, 3, W, G), 16); assert.equal(tileAtPoint(-5, -5, 17, 3, W, G), 0); assert.equal(tileAtPoint(1, 1, 0, 3, W, G), -1); });
test('pinch direction and edges', () => { const s = [2, 3, 5]; assert.equal(pinchTarget(1, 1.4, s), 0); assert.equal(pinchTarget(1, 0.6, s), 2); assert.equal(pinchTarget(0, 2, s), 0); assert.equal(pinchTarget(2, 0.3, s), 2); assert.equal(pinchTarget(1, 1, s), 1); assert.equal(pinchTarget(1, NaN, s), 1); });
test('progress reaches 1 exactly when tile size is matched, both directions', () => { const a = cellSize(W, 3, G), b = cellSize(W, 2, G), c = cellSize(W, 5, G); assert.ok(Math.abs(pinchProgress(b / a, a, b) - 1) < 1e-9); assert.ok(Math.abs(pinchProgress(c / a, a, c) - 1) < 1e-9); assert.equal(pinchProgress(1, a, b), 0); assert.equal(pinchProgress(0.5, a, b), 0); assert.equal(pinchProgress(9, a, b), 1); assert.equal(pinchProgress(2, a, a), 0); });
test('commit threshold', () => { assert.equal(shouldCommit(0.39), false); assert.equal(shouldCommit(0.4), true); });
test('anchor tile keeps its focal point through every blend step', () => {
  const n = 40, vh = 400, focal = 180;
  for (const [from, to] of [[3, 2], [3, 5], [2, 3], [5, 3]]) for (const scroll0 of [0, 137, 410]) {
    const a = anchorAt(scroll0 + focal, n, from, W, G);
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const y = anchorScroll(a, from, to, t, n, W, G, focal, vh);
      const r = lerpRect(tileRect(a.index, from, W, G), tileRect(a.index, to, W, G), t);
      const total = (1 - t) * contentHeight(n, from, W, G) + t * contentHeight(n, to, W, G);
      const want = r.y + a.v * r.h - focal;
      if (want >= 0 && want <= total - vh) assert.ok(Math.abs(y - want) < 1e-9 && Math.abs(r.y + a.v * r.h - y - focal) < 1e-9);
      assert.ok(y >= 0 && y <= Math.max(0, total - vh) + 1e-9);
    }
    assert.ok(Math.abs(anchorScroll(a, from, to, 0, n, W, G, focal, vh) - clamp(scroll0, 0, contentHeight(n, from, W, G) - vh)) < 1e-9);
  }
});
test('short content never scrolls', () => { const a = anchorAt(50, 4, 3, W, G); assert.equal(anchorScroll(a, 3, 2, 0.5, 4, W, G, 10, 900), 0); });
test('range selection adds, removes, keeps the rest and works backwards', () => {
  const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
  assert.deepEqual(rangeSelection(ids, ['f'], 1, 3, 'add'), ['b', 'c', 'd', 'f']);
  assert.deepEqual(rangeSelection(ids, ['a', 'b', 'c', 'd'], 2, 1, 'remove'), ['a', 'd']);
  assert.deepEqual(rangeSelection(ids, [], 4, 2, 'add'), ['c', 'd', 'e']);
  assert.deepEqual(rangeSelection(ids, ['a'], 0, 0, 'add'), ['a']);
  assert.deepEqual(rangeSelection(ids, ['a'], 9, 9, 'add'), ['a']);
});
test('edge scroll', () => { assert.equal(edgeSpeed(200, 400), 0); assert.equal(edgeSpeed(0, 400), -640); assert.equal(edgeSpeed(400, 400), 640); assert.ok(Math.abs(edgeSpeed(10, 400)) > Math.abs(edgeSpeed(30, 400))); assert.equal(edgeSpeed(5, 0), 0); });
