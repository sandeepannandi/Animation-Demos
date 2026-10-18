import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDuration, upsertToast, visibleToasts, remainingAfterPause, shouldDismiss } from './toastLogic.ts';
test('durations handle persistent, invalid and negative input', () => {
  assert.equal(normalizeDuration(), 5000); assert.equal(normalizeDuration(NaN), 5000);
  assert.equal(normalizeDuration(-1), 0); assert.equal(normalizeDuration(Infinity), Infinity);
});
test('FIFO queue only exposes the configured count', () => {
  let items = []; for (let i = 0; i < 5; i++) items = upsertToast(items, { message: String(i) }, String(i));
  assert.deepEqual(visibleToasts(items, 3).map(i => i.id), ['0', '1', '2']);
  assert.deepEqual(visibleToasts(items.filter(i => i.id !== '0'), 3).map(i => i.id), ['1', '2', '3']);
  assert.equal(visibleToasts(items, NaN).length, 3); assert.equal(visibleToasts(items, 0).length, 1);
});
test('keyed updates preserve queue position and increment revision', () => {
  let items = upsertToast([], { message: 'First' }, 'a'); items = upsertToast(items, { message: 'Second' }, 'b');
  const updated = upsertToast(items, { message: 'Updated', duration: 2000 }, 'a');
  assert.deepEqual(updated.map(i => i.id), ['a', 'b']); assert.equal(updated[0].revision, 2); assert.equal(updated[0].duration, 2000); assert.equal(items[0].message, 'First');
});
test('pause preserves remaining time and clamps clock regressions', () => {
  assert.equal(remainingAfterPause(5000, 1000, 2400), 3600);
  assert.equal(remainingAfterPause(50, 0, 200), 0); assert.equal(remainingAfterPause(500, 1000, 900), 500);
});
test('dismiss supports all directions and requires intent for flicks', () => {
  for (const [dx,dy] of [[65,0],[-65,0],[0,65],[0,-65]]) assert.equal(shouldDismiss(dx,dy,0,0), true);
  assert.equal(shouldDismiss(13,0,0.7,0),true); assert.equal(shouldDismiss(0,-13,0,-0.7),true);
  assert.equal(shouldDismiss(2,0,3,0),false); assert.equal(shouldDismiss(40,40,0,0),false);
});
