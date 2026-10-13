import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  makeGrid,
  meshPoints,
  warpPoint,
  releaseTarget,
  scrub,
} from "./genieMath.ts";
const card = { x: 24, y: 20, width: 272, height: 280 },
  target = { x: 270, y: 365 };
test("grid topology", () => {
  const g = makeGrid();
  assert.equal(g.uv.length, 325);
  assert.equal(g.indices.length, 1728);
  assert.ok(g.indices.every((i) => i >= 0 && i < 325));
});
test("open endpoint exact", () => {
  for (const uv of makeGrid().uv)
    assert.deepEqual(warpPoint(uv, 0, card, target), {
      x: card.x + uv.x * card.width,
      y: card.y + uv.y * card.height,
    });
});
test("closed endpoint exact", () => {
  for (const uv of makeGrid().uv)
    assert.deepEqual(warpPoint(uv, 1, card, target), target);
});
test("clamps endpoints", () => {
  assert.deepEqual(warpPoint({ x: 0, y: 0 }, -1, card, target), {
    x: 24,
    y: 20,
  });
  assert.deepEqual(warpPoint({ x: 0, y: 0 }, 2, card, target), target);
});
test("mesh stays finite, inside bounds, and triangles do not invert", () => {
  const g = makeGrid();
  for (const t of [target, { x: 50, y: 365 }])
    for (let p = 0; p < 1; p += 0.01) {
      const m = meshPoints(g.uv, p, card, t);
      assert.ok(
        m.every(
          (v) =>
            Number.isFinite(v.x) &&
            Number.isFinite(v.y) &&
            v.x >= 0 &&
            v.x <= 320 &&
            v.y >= 0 &&
            v.y <= 410,
        ),
      );
      for (let i = 0; i < g.indices.length; i += 3) {
        const [a, b, c] = g.indices.slice(i, i + 3).map((v) => m[v]);
        assert.ok(
          (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) >= -1e-8,
        );
      }
    }
});
test("bottom narrows before top", () => {
  const top =
    warpPoint({ x: 1, y: 0 }, 0.25, card, target).x -
    warpPoint({ x: 0, y: 0 }, 0.25, card, target).x;
  const bottom =
    warpPoint({ x: 1, y: 1 }, 0.25, card, target).x -
    warpPoint({ x: 0, y: 1 }, 0.25, card, target).x;
  assert.ok(bottom < top);
});
test("scrub direct and clamped", () => {
  assert.equal(scrub(0, 140, 280), 0.5);
  assert.equal(scrub(1, -140, 280), 0.5);
  assert.equal(scrub(0, -500, 280), 0);
  assert.equal(scrub(0, 500, 280), 1);
});
test("release velocity and midpoint", () => {
  assert.equal(releaseTarget(0.1, 0.5), true);
  assert.equal(releaseTarget(0.9, -0.5), false);
  assert.equal(releaseTarget(0.51, 0), true);
  assert.equal(releaseTarget(0.49, 0), false);
});
