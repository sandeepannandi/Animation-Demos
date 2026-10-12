import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clamp, dragPosition, snap, depth } from './carouselLogic.ts';
test('snap from distance and fling, at most one neighbor per gesture', () => { assert.equal(snap(2.6,0,2,5),3); assert.equal(snap(2.1,-0.8,2,5),3); assert.equal(snap(1.9,0.8,2,5),1); assert.equal(snap(4.7,-5,2,5),3); assert.equal(snap(2.2,0,2,5),2); });
test('boundaries never wrap; empty and single lists', () => { assert.equal(snap(-1,1,0,5),0); assert.equal(snap(6,-1,4,5),4); assert.equal(snap(2,1,2,0),0); assert.equal(snap(2,1,2,1),0); });
test('drag follows finger; edge resistance is bounded', () => { assert.equal(dragPosition(2,-120,5),3); assert.equal(dragPosition(2,120,5),1); assert.equal(dragPosition(0,120,5),-0.2); assert.equal(dragPosition(4,-120,5),4.2); assert.equal(dragPosition(0,9000,5),-0.35); });
test('depth uses one distance for offset, scale, fade and tilt', () => { assert.deepEqual(depth(0),{x:0,y:0,scale:1,opacity:1,tilt:-0}); assert.equal(depth(1).scale,0.88); assert.equal(depth(-1).x,-66); assert.equal(depth(1).tilt,-14); assert.deepEqual(depth(10),depth(3)); });
test('invalid and bounded inputs', () => { assert.equal(clamp(NaN,0,4),0); assert.equal(clamp(20,0,4),4); assert.ok(Number.isFinite(snap(NaN,NaN,0,5))); });
