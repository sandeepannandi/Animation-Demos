import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transitionMs } from './timing.ts';
test('default, reduced and slow durations; omitted slow keeps the old behavior', () => {
  assert.equal(transitionMs(false), 2400);
  assert.equal(transitionMs(false, false), 2400);
  assert.equal(transitionMs(true), 220);
  assert.equal(transitionMs(false, true), 9600);
  assert.equal(transitionMs(true, true), 880);
});
