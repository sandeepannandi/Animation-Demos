import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  blurSpan,
  clamp,
  dragScroll,
  fringeSpan,
  pageOffset,
  rubber,
  snapTarget,
  springConfig,
} from "./motionMath.ts";

test("page layout is linear in scroll", () => {
  assert.equal(pageOffset(2, 2), 0);
  assert.equal(pageOffset(0, 1.5), -1.5);
  assert.equal(pageOffset(4, 2.25), 1.75);
});

test("rubber band passes through inside and resists outside", () => {
  assert.equal(rubber(1.4, 0, 4), 1.4);
  assert.ok(rubber(-1, 0, 4) < 0 && rubber(-1, 0, 4) > -0.4);
  assert.ok(rubber(5, 0, 4) > 4 && rubber(5, 0, 4) < 4.4);
  assert.ok(rubber(40, 0, 4) - 4 < 14, "far overshoot stays bounded-ish");
});

test("drag maps finger distance to pages, left is forward", () => {
  assert.equal(dragScroll(1, -160, 320, 4), 1.5);
  assert.equal(dragScroll(1, 160, 320, 4), 0.5);
  assert.ok(dragScroll(0, 400, 320, 4) < 0, "dragging right at the first page overshoots");
});

test("a slow release settles to the nearest page", () => {
  assert.equal(snapTarget(2.3, 0.1, 4), 2);
  assert.equal(snapTarget(2.6, -0.2, 4), 3);
  assert.equal(snapTarget(0.4, 0, 4), 0);
});

test("a flick moves exactly one page in its direction and clamps at the ends", () => {
  assert.equal(snapTarget(2.1, 2.4, 4), 3);
  assert.equal(snapTarget(2.9, -2.4, 4), 2);
  assert.equal(snapTarget(2, 3, 4), 3);
  assert.equal(snapTarget(4, 3, 4), 4);
  assert.equal(snapTarget(0, -3, 4), 0);
});

test("blur grows with speed, zero at rest, capped at maxBlur", () => {
  assert.equal(blurSpan(0, 44), 0);
  assert.equal(blurSpan(100, 44), 0);
  assert.ok(blurSpan(1200, 44) > 0 && blurSpan(1200, 44) < 44);
  assert.ok(blurSpan(1800, 44) > blurSpan(1200, 44));
  assert.equal(blurSpan(20000, 44), 44);
  assert.equal(blurSpan(-3400, 44), 44);
});

test("fringe only appears with real blur and stays small", () => {
  assert.equal(fringeSpan(0), 0);
  assert.equal(fringeSpan(1.5), 0);
  assert.ok(fringeSpan(20) > 0 && fringeSpan(20) <= 12);
  assert.equal(fringeSpan(100), 12);
});

test("slow motion stretches the spring four times", () => {
  const a = springConfig(false), b = springConfig(true);
  assert.equal(a.damping / b.damping, 4);
  assert.equal(a.stiffness / b.stiffness, 16);
  assert.equal(a.mass, b.mass);
});

test("clamp works", () => {
  assert.equal(clamp(2, 0, 4), 2);
  assert.equal(clamp(-1, 0, 4), 0);
  assert.equal(clamp(9, 0, 4), 4);
});
