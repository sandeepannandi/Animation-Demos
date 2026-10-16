import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  EFFECTS,
  MELT_COLUMNS,
  MELT_MAX_DELAY,
  SLICES,
  SLICE_STAGGER,
  channelSplit,
  clamp,
  columnDelay,
  dragScroll,
  effectForTransition,
  meltProgress,
  rippleFront,
  rubber,
  scrub,
  sliceProgress,
  snapTarget,
  springConfig,
} from "./transitionMath.ts";

test("rubber band passes through inside and resists outside", () => {
  assert.equal(rubber(1.4, 0, 4), 1.4);
  assert.ok(rubber(-1, 0, 4) < 0 && rubber(-1, 0, 4) > -0.4);
  assert.ok(rubber(5, 0, 4) > 4 && rubber(5, 0, 4) < 4.4);
  assert.ok(rubber(40, 0, 4) - 4 < 14, "far overshoot stays bounded-ish");
});

test("drag maps finger distance to pages, left is forward", () => {
  assert.equal(dragScroll(1, -170, 340, 4), 1.5);
  assert.equal(dragScroll(1, 170, 340, 4), 0.5);
  assert.ok(dragScroll(0, 400, 340, 4) < 0, "dragging right at the first page overshoots");
});

test("snap: flick beats distance, otherwise nearest page", () => {
  assert.equal(snapTarget(1.15, 2.4, 4), 2, "fast flick forward advances");
  assert.equal(snapTarget(1.85, -2.4, 4), 1, "fast flick back retreats");
  assert.equal(snapTarget(1.4, 0.1, 4), 1, "slow drag under half returns");
  assert.equal(snapTarget(1.6, 0.1, 4), 2, "slow drag past half completes");
  assert.equal(snapTarget(0.1, 5, 4), 1, "flick from rest moves one page only");
});

test("scrub decomposes scroll into from/to/progress", () => {
  assert.deepEqual(scrub(0, 4), { from: 0, to: 1, t: 0 });
  const mid = scrub(2.35, 4);
  assert.equal(mid.from, 2);
  assert.equal(mid.to, 3);
  assert.ok(Math.abs(mid.t - 0.35) < 1e-9);
  assert.deepEqual(scrub(4, 4), { from: 3, to: 4, t: 1 }, "last page is the tail of its hop");
  assert.deepEqual(scrub(0, 0), { from: 0, to: 0, t: 0 }, "single page never transitions");
  assert.deepEqual(scrub(-2, 4).t, 0, "overshoot below zero clamps");
});

test("effects cycle through all four and wrap", () => {
  assert.deepEqual([0, 1, 2, 3].map(effectForTransition), [...EFFECTS]);
  assert.equal(effectForTransition(4), EFFECTS[0]);
});

test("slices start staggered, land in order, and all complete", () => {
  for (let i = 0; i < SLICES; i++) {
    assert.equal(sliceProgress(0, i), 0, "no slice has moved at rest");
    assert.equal(sliceProgress(1, i), 1, "every slice lands at the end");
  }
  const mid = 0.5;
  const progressed = Array.from({ length: SLICES }, (_, i) => sliceProgress(mid, i));
  for (let i = 1; i < SLICES; i++) assert.ok(progressed[i] <= progressed[i - 1], "later slices trail");
  assert.ok(progressed[0] > 0 && progressed[SLICES - 1] < 1, "stagger is visible mid-transition");
  assert.ok(SLICE_STAGGER * (SLICES - 1) < 1, "stagger budget fits inside the transition");
});

test("melt columns are deterministic, delayed, and all complete", () => {
  for (let col = 0; col < MELT_COLUMNS; col++) {
    const d = columnDelay(col);
    assert.ok(d >= 0 && d < MELT_MAX_DELAY, "delay inside its budget");
    assert.equal(columnDelay(col), d, "same column, same delay");
    assert.equal(meltProgress(0, col), 0);
    assert.equal(meltProgress(1, col), 1);
  }
  const delays = new Set(Array.from({ length: MELT_COLUMNS }, (_, c) => columnDelay(c).toFixed(3)));
  assert.ok(delays.size > MELT_COLUMNS / 2, "columns actually shuffle");
});

test("channel split peaks mid-transition and vanishes at both ends", () => {
  assert.equal(channelSplit(0), 0);
  assert.ok(Math.abs(channelSplit(1)) < 1e-12);
  assert.equal(channelSplit(0.5), 1);
  assert.ok(channelSplit(0.25) > 0.6 && channelSplit(0.25) < 0.8);
});

test("ripple front eases from 0 to 1", () => {
  assert.equal(rippleFront(0), 0);
  assert.equal(rippleFront(1), 1);
  assert.ok(rippleFront(0.1) < 0.1, "eases out slowly");
  assert.ok(rippleFront(0.9) > 0.9, "eases in at the end");
});

test("slow motion stretches the spring in time, not in feel", () => {
  const fast = springConfig(false);
  const slow = springConfig(true);
  assert.equal(slow.stiffness, fast.stiffness / 16);
  assert.equal(slow.damping, fast.damping / 4);
});

test("clamp bounds", () => {
  assert.equal(clamp(2, 0, 1), 1);
  assert.equal(clamp(-2, 0, 1), 0);
  assert.equal(clamp(0.5, 0, 1), 0.5);
});
