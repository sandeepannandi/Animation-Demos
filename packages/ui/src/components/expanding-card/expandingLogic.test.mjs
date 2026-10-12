import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerpRect, dragToProgress, dragTranslateX, shouldCaptureDismiss, dismissOutcome, crossedDismiss, backgroundScale, dimOpacity, cornerRadius, staggerDelay, heroHeightFor, DISMISS_DISTANCE, BACKGROUND_SCALE, MIN_DRAG_PROGRESS } from './expandingLogic.ts';
const from = { x: 20, y: 300, width: 320, height: 240 };
const to = { x: 0, y: 0, width: 390, height: 844 };
test('rect interpolates between the card and the full host and clamps', () => {
  assert.deepEqual(lerpRect(from, to, 0), from);
  assert.deepEqual(lerpRect(from, to, 1), to);
  assert.deepEqual(lerpRect(from, to, 2), to);
  assert.deepEqual(lerpRect(from, to, -1), from);
  assert.equal(lerpRect(from, to, 0.5).width, 355);
  assert.deepEqual(lerpRect(from, to, NaN), from);
});
test('dragging down shrinks the card monotonically and never below the minimum', () => {
  assert.equal(dragToProgress(0, 800), 1);
  assert.equal(dragToProgress(-50, 800), 1);
  let last = 1;
  for (let dy = 10; dy <= 600; dy += 10) { const p = dragToProgress(dy, 800); assert.ok(p <= last); last = p; }
  assert.equal(dragToProgress(100000, 800), MIN_DRAG_PROGRESS);
  assert.equal(dragToProgress(10, 0), dragToProgress(10, 0));
});
test('sideways follow is damped by progress', () => {
  assert.equal(dragTranslateX(40, 1), 40);
  assert.equal(dragTranslateX(40, 0.5), 20);
  assert.equal(dragTranslateX(NaN, 1), 0);
});
test('the drag is only captured at the top of the scroll, downward and mostly vertical', () => {
  assert.equal(shouldCaptureDismiss(0, 0, 12), true);
  assert.equal(shouldCaptureDismiss(40, 0, 12), false);
  assert.equal(shouldCaptureDismiss(0, 0, 3), false);
  assert.equal(shouldCaptureDismiss(0, 0, -12), false);
  assert.equal(shouldCaptureDismiss(0, 30, 12), false);
  assert.equal(shouldCaptureDismiss(NaN, 0, 12), false);
});
test('release closes on distance or a fast fling, otherwise restores', () => {
  assert.equal(dismissOutcome(DISMISS_DISTANCE + 1, 0), 'close');
  assert.equal(dismissOutcome(60, 0.2), 'restore');
  assert.equal(dismissOutcome(60, 1.5), 'close');
  assert.equal(dismissOutcome(5, 3), 'restore');
  assert.equal(dismissOutcome(-100, 3), 'restore');
});
test('threshold crossing is detected in both directions', () => {
  assert.equal(crossedDismiss(100, 150), true);
  assert.equal(crossedDismiss(150, 100), true);
  assert.equal(crossedDismiss(150, 200), false);
  assert.equal(crossedDismiss(10, 20), false);
});
test('background and dim follow progress', () => {
  assert.equal(backgroundScale(0), 1);
  assert.equal(backgroundScale(1), BACKGROUND_SCALE);
  assert.ok(dimOpacity(0.5) > 0 && dimOpacity(0.5) < dimOpacity(1));
  assert.equal(cornerRadius(1, 24, 0), 0);
  assert.equal(cornerRadius(0.5, 24, 0), 24);
});
test('stagger grows with the index and collapses for reduced motion', () => {
  assert.ok(staggerDelay(2) > staggerDelay(1));
  assert.equal(staggerDelay(3, true), 0);
  assert.equal(staggerDelay(-4), staggerDelay(0));
});
test('hero height is bounded', () => {
  assert.equal(heroHeightFor(240, 100, 800), 240);
  assert.equal(heroHeightFor(240, 9999, 800), 560);
  assert.equal(heroHeightFor(240, 400, 800), 400);
  assert.equal(heroHeightFor(600, 700, 600), 600);
});
