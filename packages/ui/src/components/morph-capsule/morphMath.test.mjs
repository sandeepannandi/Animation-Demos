import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clampState, cycleState, stepState, dragProgress, resolveState, contentOpacity } from './morphMath.ts';
test('state indexes clamp, cycle and step', () => {
  assert.equal(clampState(9, 3), 2);
  assert.equal(clampState(-2, 3), 0);
  assert.equal(clampState(undefined, 3), 0);
  assert.equal(clampState(1, 0), -1);
  assert.equal(cycleState(0, 3), 1);
  assert.equal(cycleState(2, 3), 0);
  assert.equal(cycleState(0, 0), -1);
  assert.equal(stepState(2, 1, 3), 2);
  assert.equal(stepState(0, -1, 3), 0);
});
test('dragging follows the finger and resists past the ends', () => {
  assert.equal(dragProgress(0, 60, 120, 3), 0.5);
  assert.equal(dragProgress(1, -60, 120, 3), 0.5);
  assert.equal(dragProgress(2, 120, 120, 3), 2.25);
  assert.equal(dragProgress(0, -120, 120, 3), -0.25);
  assert.equal(dragProgress(1, NaN, 120, 3), 1);
  assert.equal(dragProgress(1, 50, 0, 3), 1);
});
test('slow release settles on the nearest state', () => {
  assert.equal(resolveState(0.4, 0, 3), 0);
  assert.equal(resolveState(0.6, 0, 3), 1);
  assert.equal(resolveState(1.9, 0, 3), 2);
  assert.equal(resolveState(2.2, 0, 3), 2);
  assert.equal(resolveState(-0.2, 0, 3), 0);
});
test('a flick moves at least one state in its direction', () => {
  assert.equal(resolveState(1.1, 0.004, 3), 2);
  assert.equal(resolveState(0.9, -0.004, 3), 0);
  assert.equal(resolveState(2, 0.01, 3), 2);
  assert.equal(resolveState(0, -0.01, 3), 0);
});
test('bad input does not invent a state', () => {
  assert.equal(resolveState(NaN, 0, 3), 0);
  assert.equal(resolveState(1, NaN, 3), 1);
  assert.equal(resolveState(1, 0, 0), -1);
});
test('content crossfades without both layers going dark', () => {
  assert.equal(contentOpacity(1, 1), 1);
  assert.ok(Math.abs(contentOpacity(1.3, 1) - 1) < 1e-9);
  assert.ok(Math.abs(contentOpacity(1.5, 1) - 0.5) < 1e-9);
  assert.ok(Math.abs(contentOpacity(1.5, 2) - 0.5) < 1e-9);
  assert.equal(contentOpacity(1.7, 1), 0);
  assert.equal(contentOpacity(0, 2), 0);
});
