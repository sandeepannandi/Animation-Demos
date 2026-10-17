import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_VINYL, armAngles, makeVinyl, stepVinyl, vinylActive, armTip,
} from './vinylMath.ts';

// Deck layout used across the tests (matches the 320px default render).
const S = 320;
const GEO = armAngles(S * 0.88, S * 0.12, S / 2, S / 2, S * 0.40);
const OPTS = { ...DEFAULT_VINYL, armParkDeg: GEO.park, armPlayDeg: GEO.play };

function run(state, playing, ms, opts = OPTS, tick = 16) {
  let s = state;
  for (let t = 0; t < ms; t += tick) s = stepVinyl(s, playing, tick, opts, false).state;
  return s;
}

test('armAngles places park outside play with a reachable drop', () => {
  assert.ok(GEO.len > S * 0.15 && GEO.len < S * 0.45, 'arm length sane');
  assert.ok(GEO.park > GEO.play, 'park swings outward');
  assert.ok(GEO.park - GEO.play > 20 && GEO.park - GEO.play < 45, 'swing range');
  const tip = armTip(S * 0.88, S * 0.12, GEO.len, GEO.play);
  const dist = Math.hypot(tip.x - S / 2, tip.y - S / 2);
  assert.ok(Math.abs(dist - S * 0.40 * 0.92) < 0.5, 'needle lands on the outer groove');
});

test('arm reaches the record before the platter gets power', () => {
  let s = makeVinyl(GEO.park);
  // Track the first tick where speed starts rising.
  let armAtFirstPower = null;
  for (let t = 0; t < 3000 && armAtFirstPower === null; t += 16) {
    const prev = s.speed;
    s = stepVinyl(s, true, 16, OPTS, false).state;
    if (s.speed > prev && s.speed > 0.000001) armAtFirstPower = s.arm;
  }
  assert.ok(armAtFirstPower !== null, 'platter eventually powers up');
  assert.ok(Math.abs(armAtFirstPower - GEO.play) < 3.5, `arm nearly down first (arm=${armAtFirstPower})`);
});

test('spins up asymptotically to 33 1/3 rpm and keeps turning', () => {
  let s = run(makeVinyl(GEO.park), true, 8000);
  const full = DEFAULT_VINYL.rpm / 60;
  assert.ok(Math.abs(s.speed - full) / full < 0.005, `at speed (${s.speed} vs ${full})`);
  const a1 = s.angle;
  s = run(s, true, 1000);
  assert.ok(Math.abs(s.angle - a1 - full * 360) < full * 360 * 0.02, 'one second = one third of a turn');
});

test('stop cuts power immediately and the arm parks after spin-down begins', () => {
  let s = run(makeVinyl(GEO.park), true, 8000);
  assert.ok(s.speed > 0.5, 'playing');
  const armAtStop = s.arm;
  s = stepVinyl(s, false, 16, OPTS, false).state;
  assert.ok(s.speed < DEFAULT_VINYL.rpm / 60, 'power cut');
  // Arm starts moving out right away (lift the needle off a slowing record).
  s = run(s, false, 12000);
  assert.equal(s.speed, 0, 'platter fully stopped');
  assert.ok(Math.abs(s.arm - GEO.park) < 0.05, 'arm parked');
  assert.equal(s.armVel, 0, 'arm settled');
  assert.ok(armAtStop < GEO.play + 1, 'arm was on the record at stop');
  assert.equal(vinylActive(s, false, OPTS), false, 'fully settled');
});

test('arm spring overshoots slightly then settles (damped drop)', () => {
  let s = makeVinyl(GEO.park);
  let minArm = s.arm;
  for (let t = 0; t < 4000; t += 8) {
    s = stepVinyl(s, true, 8, OPTS, false).state;
    minArm = Math.min(minArm, s.arm);
  }
  assert.ok(minArm < GEO.play - 0.3, `overshoots the drop point (${minArm} < ${GEO.play})`);
  assert.ok(minArm > GEO.play - 6, 'overshoot stays gentle');
});

test('reduce motion jumps straight to the end state', () => {
  const s0 = makeVinyl(GEO.park);
  const r1 = stepVinyl(s0, true, 16, OPTS, true);
  assert.equal(r1.state.arm, GEO.play);
  assert.equal(r1.state.speed, DEFAULT_VINYL.rpm / 60);
  assert.ok(r1.state.angle > 0, 'label still advances while reduced');
  const r2 = stepVinyl(r1.state, false, 16, OPTS, true);
  assert.equal(r2.state.arm, GEO.park);
  assert.equal(r2.state.speed, 0);
});

test('active flag gates the clock correctly', () => {
  const rest = makeVinyl(GEO.park);
  assert.equal(vinylActive(rest, false, OPTS), false, 'parked and idle: clock can stop');
  assert.equal(vinylActive(rest, true, OPTS), true, 'play requested: clock runs');
  const playing = run(makeVinyl(GEO.park), true, 8000);
  assert.equal(vinylActive(playing, true, OPTS), true, 'spinning forever while playing');
});

test('deterministic: same inputs, same state', () => {
  const a = run(makeVinyl(GEO.park), true, 3000);
  const b = run(makeVinyl(GEO.park), true, 3000);
  assert.deepEqual(a, b);
});
