import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACTION_WIDTH, rubberBand, dragOffset, settleOutcome, pastCommit, commitThreshold, isHorizontalIntent, outermostIndex, openOffset, sideOf } from './swipeLogic.ts';
const g = { rowWidth: 400, leadingWidth: ACTION_WIDTH, trailingWidth: ACTION_WIDTH * 2, leadingFull: true, trailingFull: true };
test('rubber band grows but stays below its dimension', () => {
  assert.equal(rubberBand(0, 100), 0);
  assert.ok(rubberBand(50, 100) < 50);
  assert.ok(rubberBand(10000, 100) < 100);
  assert.ok(rubberBand(200, 100) > rubberBand(100, 100));
  assert.equal(rubberBand(NaN, 100), 0);
});
test('drag follows the finger while revealing actions', () => {
  assert.equal(dragOffset(0, 50, g), 50);
  assert.equal(dragOffset(0, -120, g), -120);
  assert.equal(dragOffset(-152, 60, g), -92);
  assert.equal(dragOffset(0, 0, g), 0);
});
test('drag resists past the actions and caps at the row width', () => {
  const x = dragOffset(0, -300, g);
  assert.ok(x < -152 && x > -300);
  assert.equal(dragOffset(0, 5000, g), 400);
  assert.equal(dragOffset(0, -5000, g), -400);
});
test('sides without full swipe or without actions are rubber-banded', () => {
  const soft = { ...g, trailingFull: false };
  assert.ok(Math.abs(dragOffset(0, -600, soft)) < 152 + 400 * 0.2);
  const none = { ...g, leadingWidth: 0 };
  assert.ok(dragOffset(0, 300, none) > 0 && dragOffset(0, 300, none) < 100);
});
test('release opens, closes or commits', () => {
  assert.deepEqual(settleOutcome(-100, 0, g), { type: 'open', side: 'trailing' });
  assert.deepEqual(settleOutcome(-50, 0, g), { type: 'close' });
  assert.deepEqual(settleOutcome(-50, -0.5, g), { type: 'open', side: 'trailing' });
  assert.deepEqual(settleOutcome(-152, 0.5, g), { type: 'close' });
  assert.deepEqual(settleOutcome(30, 0.5, g), { type: 'open', side: 'leading' });
  assert.deepEqual(settleOutcome(0, 1, g), { type: 'close' });
});
test('full swipe commits by distance or by a fast fling past the actions', () => {
  const t = commitThreshold('trailing', g);
  assert.equal(t, 200);
  assert.equal(pastCommit(-t, g), true);
  assert.equal(pastCommit(-(t - 1), g), false);
  assert.deepEqual(settleOutcome(-t, 0, g), { type: 'commit', side: 'trailing' });
  assert.deepEqual(settleOutcome(-170, -1.5, g), { type: 'commit', side: 'trailing' });
  assert.deepEqual(settleOutcome(-100, -1.5, g), { type: 'open', side: 'trailing' });
  assert.deepEqual(settleOutcome(-t, 0, { ...g, trailingFull: false }), { type: 'open', side: 'trailing' });
});
test('commit point is capped on wide rows and floored on narrow ones', () => {
  assert.equal(commitThreshold('trailing', { ...g, rowWidth: 900 }), 292);
  assert.equal(commitThreshold('leading', { ...g, rowWidth: 900 }), 216);
  assert.equal(commitThreshold('trailing', { ...g, rowWidth: 200 }), 192);
});
test('horizontal intent ignores vertical scrolling', () => {
  assert.equal(isHorizontalIntent(12, 2), true);
  assert.equal(isHorizontalIntent(12, 12), false);
  assert.equal(isHorizontalIntent(4, 0), false);
  assert.equal(isHorizontalIntent(-30, 10), true);
});
test('outermost action and open offsets', () => {
  assert.equal(outermostIndex('leading', 2), 0);
  assert.equal(outermostIndex('trailing', 2), 1);
  assert.equal(openOffset('leading', g), 76);
  assert.equal(openOffset('trailing', g), -152);
  assert.equal(sideOf(-1), 'trailing');
  assert.equal(sideOf(0), null);
});
