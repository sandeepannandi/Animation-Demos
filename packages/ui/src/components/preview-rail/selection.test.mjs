import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indexFromPosition, selectedIndex, adjacentIndex } from './selection.ts';
test('drag boundaries, empty layouts and invalid coordinates', () => {
  assert.equal(indexFromPosition(-15, 220, 5), 0);
  assert.equal(indexFromPosition(44, 220, 5), 1);
  assert.equal(indexFromPosition(220, 220, 5), 4);
  assert.equal(indexFromPosition(999, 220, 5), 4);
  assert.equal(indexFromPosition(2, 0, 5), -1);
  assert.equal(indexFromPosition(NaN, 220, 5), -1);
  assert.equal(indexFromPosition(2, 220, 0), -1);
});
test('controlled and removed IDs fall back without inventing a selection', () => {
  assert.equal(selectedIndex(['a','b'], 'b'), 1);
  assert.equal(selectedIndex(['a'], 'removed'), 0);
  assert.equal(selectedIndex([], 'a'), -1);
});
test('next and previous stop at ends', () => {
  assert.equal(adjacentIndex(0,-1,4),0);
  assert.equal(adjacentIndex(3,1,4),3);
  assert.equal(adjacentIndex(1,1,4),2);
  assert.equal(adjacentIndex(0,1,0),-1);
});
