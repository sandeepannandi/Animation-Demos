import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clamp, hashSeed, bubbleRadius, insetBounds, spawnBodies, pickBody, totalSpeed, stepBodies, popKick, wobbleScale, hexToRgb, shade, DEFAULT_PHYSICS } from './physicsMath.ts';

const bounds = insetBounds(340, 360, 8);
const idle = { x: 0, y: 0, active: 0 };
const items = Array.from({ length: 10 }, (_, i) => ({ id: `item-${i}` }));

test('clamp and hash are finite and deterministic', () => {
  assert.equal(clamp(NaN, 0, 1), 0);
  assert.equal(hashSeed('music', 3), hashSeed('music', 3));
  assert.ok(hashSeed('music', 3) >= 0 && hashSeed('music', 3) < 1);
  assert.notEqual(hashSeed('music', 1), hashSeed('travel', 1));
});

test('bubble radius stays in the 34-44 band', () => {
  for (let i = 0; i < 40; i++) { const r = bubbleRadius(`id-${i % 7}`, i); assert.ok(r === 34 || r === 39 || r === 44, `r=${r}`); }
});

test('spawn: one body per item, inside bounds, none overlapping', () => {
  const bodies = spawnBodies(items, bounds);
  assert.equal(bodies.length, 10);
  for (const b of bodies) {
    assert.ok(b.x >= bounds.left && b.x <= bounds.right && b.y >= bounds.top && b.y <= bounds.bottom);
    assert.equal(b.selected, 0); assert.equal(b.scale, 1); assert.equal(b.wob, 0);
  }
  for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
    const d = Math.hypot(bodies[i].x - bodies[j].x, bodies[i].y - bodies[j].y);
    assert.ok(d > (bodies[i].r + bodies[j].r) * 0.5, `spawn ${i}/${j} too close`);
  }
});

test('gravity pulls a free body toward the center', () => {
  const single = spawnBodies([{ id: 'lone' }], bounds);
  single[0].x = bounds.left + single[0].r; single[0].y = bounds.top + single[0].r;
  const before = Math.hypot(single[0].x - 170, single[0].y - 180);
  const after = stepBodies(single, 500, bounds, idle, DEFAULT_PHYSICS);
  assert.ok(Math.hypot(after[0].x - 170, after[0].y - 180) < before);
});

test('two overlapping bodies separate and trade momentum', () => {
  const two = spawnBodies([{ id: 'a' }, { id: 'b' }], bounds);
  two[0].x = 100; two[0].y = 100; two[0].vx = 300; two[0].vy = 0;
  two[1].x = 150; two[1].y = 100; two[1].vx = 0; two[1].vy = 0;
  const noG = { ...DEFAULT_PHYSICS, gravity: 0, drag: 0 };
  const out = stepBodies(two, 400, bounds, idle, noG);
  const d = Math.hypot(out[1].x - out[0].x, out[1].y - out[0].y);
  assert.ok(d >= (out[0].r + out[1].r) * 0.98, `still overlapping: ${d}`);
  assert.ok(out[1].vx > 50, 'second body picked up speed');
  assert.ok(out[0].vx < 300, 'first body slowed');
});

test('momentum along x is conserved in a drag-free head-on hit', () => {
  const two = spawnBodies([{ id: 'a' }, { id: 'b' }], bounds);
  two[0].x = 60; two[0].y = 200; two[0].vx = 400; two[0].vy = 0;
  two[1].x = 200; two[1].y = 200; two[1].vx = -100; two[1].vy = 0;
  const m0 = two[0].r ** 2 * 400 + two[1].r ** 2 * -100;
  const noG = { ...DEFAULT_PHYSICS, gravity: 0, drag: 0 };
  const out = stepBodies(two, 50, bounds, idle, noG);
  const m1 = out[0].r ** 2 * out[0].vx + out[1].r ** 2 * out[1].vx;
  assert.ok(Math.abs(m1 - m0) / Math.abs(m0) < 0.05, `momentum drifted: ${m0} -> ${m1}`);
});

test('a flung body bounces off the wall and stays inside', () => {
  const single = spawnBodies([{ id: 'fast' }], bounds);
  single[0].x = 170; single[0].y = 180; single[0].vx = 3000; single[0].vy = -2000;
  const out = stepBodies(single, 300, bounds, idle, { ...DEFAULT_PHYSICS, gravity: 0 });
  assert.ok(out[0].x <= bounds.right - out[0].r + 0.001 && out[0].y >= bounds.top + out[0].r - 0.001);
  assert.ok(Math.abs(out[0].vx) <= DEFAULT_PHYSICS.maxSpeed);
});

test('grab spring converges the body onto the pointer', () => {
  const single = spawnBodies([{ id: 'held' }], bounds);
  single[0].grabbed = 1;
  const pointer = { x: 250, y: 90, active: 1 };
  let out = single;
  for (let i = 0; i < 45; i++) out = stepBodies(out, 33, bounds, pointer, DEFAULT_PHYSICS);
  assert.ok(Math.hypot(out[0].x - 250, out[0].y - 90) < 8, `did not converge: ${out[0].x},${out[0].y}`);
});

test('pickBody returns the topmost hit or -1', () => {
  const bodies = spawnBodies(items, bounds);
  assert.equal(pickBody(bodies, -100, -100), -1);
  const b = bodies[3];
  assert.equal(pickBody(bodies, b.x, b.y), 3);
});

test('selection springs: popKick direction, radius grows toward selected size', () => {
  assert.ok(popKick(1) > 0 && popKick(0) < 0);
  const single = spawnBodies([{ id: 'sel' }], bounds);
  single[0].selected = 1; single[0].scaleV = popKick(1);
  let out = single;
  for (let i = 0; i < 40; i++) out = stepBodies(out, 33, bounds, idle, DEFAULT_PHYSICS);
  assert.ok(out[0].r > single[0].baseR * 1.15, `radius did not grow: ${out[0].r}`);
  assert.ok(Math.abs(out[0].scale - 1) < 0.1, 'pop settled');
});

test('wobble clamps and renders as opposite squash', () => {
  const w = wobbleScale(0.05);
  assert.ok(w.scaleX > 1 && w.scaleY < 1);
  assert.deepEqual(wobbleScale(99), { scaleX: 1.09, scaleY: 0.91 });
});

test('color math: rgb parse and shade clamp', () => {
  assert.deepEqual(hexToRgb('#204835'), [32, 72, 53]);
  assert.deepEqual(hexToRgb('#f80'), [255, 136, 0]);
  assert.equal(shade('#204835', 0.5), 'rgb(144, 164, 154)');
  assert.equal(shade('#ffffff', 1), 'rgb(255, 255, 255)');
  assert.equal(shade('#000000', -1), 'rgb(0, 0, 0)');
});

test('600 steps stay finite and the field settles', () => {
  let bodies = spawnBodies(items, bounds);
  bodies[0].vx = 2000; bodies[3].vy = -1500;
  for (let i = 0; i < 60; i++) bodies = stepBodies(bodies, 100, bounds, idle, DEFAULT_PHYSICS);
  for (const b of bodies) assert.ok(Number.isFinite(b.x + b.y + b.vx + b.vy + b.r + b.scale + b.wob));
  assert.ok(totalSpeed(bodies) < 600, `still jittering: ${totalSpeed(bodies)}`);
});
