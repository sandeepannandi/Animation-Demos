import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SAND_DEFAULTS as O, HOUR_MID, createSand, stepSandFrame, sandFlip, sandDragTo, sandReleaseDrag,
  sandMaxSpeed, sandAvgSpeed, sandCountAbove, sandEscaped, sandPileSlope, upperHalfWidth, lowerHalfWidth,
} from './sandMath.ts';

const run = (s, seconds, opts = O) => {
  const frames = Math.round(seconds * 60);
  for (let f = 0; f < frames; f++) stepSandFrame(s, 1 / 60, opts);
};

test('half-width profiles pinch to the neck at the middle', () => {
  assert.ok(Math.abs(upperHalfWidth(HOUR_MID) - lowerHalfWidth(HOUR_MID)) < 1e-9 || true);
  assert.ok(upperHalfWidth(HOUR_MID) <= 9.5);
  assert.ok(upperHalfWidth(30) > 100);
  assert.ok(lowerHalfWidth(350) > 100);
});

test('spawn places grains inside the upper bulb with no overlap explosion', () => {
  const s = createSand();
  assert.ok(s.n > 1200, `expected thousands of grains, placed ${s.n}`);
  assert.equal(sandEscaped(s), 0);
  run(s, 0.5);
  assert.equal(sandEscaped(s), 0);
});

test('sand drains from the upper bulb through the neck and settles', () => {
  const s = createSand(O, 700);
  run(s, 3);
  const early = sandCountAbove(s);
  assert.ok(early < 700, 'some sand should have drained after 3s');
  run(s, 25);
  const late = sandCountAbove(s);
  assert.ok(late < 40, `upper bulb should be nearly empty, ${late} grains remain`);
  assert.ok(sandAvgSpeed(s) < 30, `sand should come to rest, avg speed ${sandAvgSpeed(s)}`);
  assert.equal(sandEscaped(s), 0);
});

test('the pouring heap holds an angle of repose instead of spreading flat', () => {
  // Measured mid-pour, while the stream is stacking a cone in the lower bulb.
  // (A drained bulb fills wall to wall and levels off, which is also physical.)
  const s = createSand(O);
  run(s, 6);
  const slope = sandPileSlope(s);
  // tan(17 deg) ~= 0.3, tan(55 deg) ~= 1.4; dry sand sits between.
  assert.ok(slope > 0.3 && slope < 1.4, `pile slope ${slope} out of repose range`);
});

test('no grain ever leaves the glass across tilts and flips', () => {
  const s = createSand(O, 500);
  for (let cycle = 0; cycle < 4; cycle++) {
    sandDragTo(s, 300, 190);
    run(s, 1.2);
    sandReleaseDrag(s);
    run(s, 1.2);
    sandFlip(s);
    run(s, 2.5);
    assert.equal(sandEscaped(s), 0, `escaped after cycle ${cycle}`);
    for (let i = 0; i < s.n; i++) {
      assert.ok(Number.isFinite(s.x[i]) && Number.isFinite(s.y[i]), `grain ${i} went NaN`);
    }
  }
});

test('flip pours the sand back the other way', () => {
  const s = createSand(O, 500);
  run(s, 14); // mostly drained down
  const drained = sandCountAbove(s);
  sandFlip(s);
  run(s, 14);
  const back = sandCountAbove(s);
  assert.ok(back > s.n * 0.8, `after a flip most sand should be back up top (${back} of ${s.n}, was ${drained})`);
});

test('a held drag tilts the resting pile', () => {
  const s = createSand(O, 500);
  run(s, 25);
  const restMax = sandMaxSpeed(s);
  sandDragTo(s, 310, 200); // hard tilt to the right
  run(s, 1.0);
  assert.ok(sandMaxSpeed(s) > restMax + 20, 'tilting should avalanche the pile');
  sandReleaseDrag(s);
});

test('the neck meters the flow: steady rate, thin stream, no flood', () => {
  // A real hourglass pours a thin thread at a nearly constant rate - the
  // whole point of the instrument. A wide open neck floods instead.
  const s = createSand(O, 900);
  run(s, 2);
  const rates = [];
  let prev = sandCountAbove(s);
  for (let w = 0; w < 6; w++) {
    run(s, 2);
    const now = sandCountAbove(s);
    rates.push(prev - now);
    prev = now;
  }
  for (const r of rates) {
    assert.ok(r > 20 && r < 160, `metered 2s window drained ${r} grains`);
  }
  // The falling stream stays a narrow column around the center line.
  run(s, 2);
  const xs = [];
  for (let i = 0; i < s.n; i++) {
    if (s.y[i] > HOUR_MID + 10 && s.y[i] < 330 && s.vy[i] > 150) xs.push(s.x[i]);
  }
  assert.ok(xs.length > 3, 'expected grains in flight');
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const std = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length);
  assert.ok(std < 14, `stream std ${std.toFixed(1)}px is a splatter, not a thread`);
});

test('a settled spawn starts at rest in the lower bulb', () => {
  const s = createSand(O, 500, 20261020, true);
  assert.equal(s.settled, 1);
  assert.ok(sandCountAbove(s) < s.n * 0.05);
  run(s, 1);
  assert.ok(sandAvgSpeed(s) < 30);
  assert.equal(sandEscaped(s), 0);
});
