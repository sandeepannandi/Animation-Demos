import { test } from "node:test";
import { strict as assert } from "node:assert";
import { makeFoldGrid, foldMesh, foldAngle, releaseTarget, scrub, atlasUV, ROWS, COLS, PANELS } from "./foldMath.ts";
const W = 292, H = 112;
test("grid topology", () => {
  const g = makeFoldGrid();
  assert.equal(g.uv.length, (COLS + 1) * (ROWS + 1));
  assert.equal(g.indices.length, COLS * ROWS * 6);
  assert.ok(g.indices.every((i) => i >= 0 && i < g.uv.length));
});
test("flat pass is exact and fully lit", () => {
  const m = foldMesh(1, W, H), g = makeFoldGrid();
  m.panels.forEach((panel, p) => {
    assert.ok(panel.front);
    panel.pos.forEach((pt, i) => {
      assert.ok(Math.abs(pt.x - g.uv[i].x * W) < 1e-9);
      assert.ok(Math.abs(pt.y - (p + g.uv[i].y) * H) < 1e-9);
    });
    assert.ok(panel.shade.every((s) => s === 1));
  });
});
test("folded pass stacks inside the cover panel", () => {
  const m = foldMesh(0, W, H);
  for (const panel of m.panels) for (const pt of panel.pos) assert.ok(pt.y > -3 && pt.y < H + 4, `y ${pt.y}`);
  assert.equal(m.panels[0].front, true);
  assert.equal(m.panels[1].front, false);
});
test("mid fold shows a paper back and stays finite and continuous", () => {
  let sawBack = false, prev = null;
  for (let u = 0; u <= 1.0001; u += 0.01) {
    const m = foldMesh(u, W, H);
    for (const panel of m.panels) {
      assert.ok(panel.pos.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)));
      assert.ok(panel.shade.every((s) => s >= 0.18 && s <= 1));
    }
    if (!m.panels[1].front) sawBack = true;
    const flat = m.panels.flatMap((p) => p.pos);
    if (prev) for (let i = 0; i < flat.length; i++) assert.ok(Math.hypot(flat[i].x - prev[i].x, flat[i].y - prev[i].y) < 12, `jump at u=${u}`);
    prev = flat;
  }
  assert.ok(sawBack);
});
test("fold angle and drag helpers", () => {
  assert.equal(foldAngle(1), 0);
  assert.ok(foldAngle(0) > 3.1);
  assert.equal(scrub(0.5, 1000, 200), 1);
  assert.equal(scrub(0.5, -1000, 200), 0);
  assert.equal(releaseTarget(0.2, 0.8), true);
  assert.equal(releaseTarget(0.8, -0.8), false);
  assert.equal(releaseTarget(0.6, 0), true);
});
test("atlas coordinates stay inside the atlas and flip the back", () => {
  const g = makeFoldGrid();
  for (let p = 0; p < PANELS; p++) for (const front of [true, false]) {
    const t = atlasUV(p, front, g.uv, 1168, 672);
    assert.ok(t.every((q) => q.x >= 0 && q.x <= 1168 && q.y >= 0 && q.y <= 672));
  }
  const f = atlasUV(0, true, g.uv, 100, 300), b = atlasUV(0, false, g.uv, 100, 300);
  assert.equal(f[0].y, 0);
  assert.equal(b[0].y, 100);
  assert.ok(f[0].x < 50 && b[0].x >= 50);
});
