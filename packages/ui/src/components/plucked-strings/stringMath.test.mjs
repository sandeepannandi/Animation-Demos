import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STRING_COUNT, STR_COUPLED, STR_FREQ, STR_LENGTH, STR_MAX_PULL, STR_MODES, STR_NODES, STR_POSES, STR_SLOW, STR_STIFF, STR_X0,
  createStrings, stepStringsFrame, stringEnergy, stringMaxAbs, stringModeDecay, stringModeFrequency, stringPose,
  stringShape, stringY, stringsDragTo, stringsPluck, stringsRelease,
} from './stringMath.ts';

const run = (s, seconds, scale = 1) => {
  const frames = Math.round(seconds * 60);
  for (let f = 0; f < frames; f++) stepStringsFrame(s, scale / 60);
};

// Zero-crossing frequency of one node of one string, from the exact state.
function measureHz(k, node, seconds) {
  const s = createStrings();
  stringsPluck(s, k, 20, 0.5);
  // Mid-pluck excites odd modes only; the fundamental dominates by 1 / n^2.
  let last = stringShape(s, k, node);
  let crossings = 0;
  let first = -1;
  let lastT = 0;
  const dt = 1 / 6400;
  const total = Math.round(seconds / dt);
  for (let j = 0; j < total; j++) {
    stepStringsFrame(s, dt);
    const y = stringShape(s, k, node);
    if (last > 0 && y <= 0) {
      if (first < 0) first = j * dt;
      else {
        crossings++;
        lastT = j * dt;
      }
    }
    last = y;
  }
  return crossings / (lastT - first);
}

test('both ends stay at rest: the string is pinned at nut and saddle', () => {
  const s = createStrings();
  stringsPluck(s, 0, 30, 0.3);
  run(s, 1);
  assert.ok(Math.abs(stringShape(s, 0, 0)) < 1e-9);
  assert.ok(Math.abs(stringShape(s, 0, STR_NODES - 1)) < 1e-9);
});

test('the fundamental rings at the tuned pitch', () => {
  for (const k of [0, 2, 4]) {
    const hz = measureHz(k, 12, 0.5);
    const want = stringModeFrequency(k, 1);
    assert.ok(Math.abs(hz - want) / want < 0.01, `string ${k}: ${hz} Hz vs ${want} Hz`);
  }
  assert.ok(Math.abs(stringModeFrequency(0, 1) - STR_FREQ[0] * Math.sqrt(1 + STR_STIFF[0])) < 1e-9);
});

test('stiffness makes upper partials sharp (inharmonicity)', () => {
  const k = 4;
  for (let n = 2; n <= STR_MODES; n++) {
    const f = stringModeFrequency(k, n);
    assert.ok(f > n * STR_FREQ[k], `partial ${n} should sit above ${n} f1`);
    assert.ok(f / (n * STR_FREQ[k]) < 1.07, 'but stay close to harmonic');
  }
  // 1 + B n^2 / 2 to first order
  const n = 12;
  const exact = stringModeFrequency(k, n) / (n * STR_FREQ[k]);
  assert.ok(Math.abs(exact - (1 + (STR_STIFF[k] * n * n) / 2)) < 1e-3);
});

test('a pluck follows 1 / n^2: plucking at the middle drops the even partials', () => {
  const s = createStrings();
  stringsPluck(s, 1, 30, 0.5);
  const amp = (n) => Math.abs(s.a[1 * STR_MODES + n - 1]);
  assert.ok(amp(1) > 5 * amp(3), 'fundamental dominates');
  assert.ok(amp(2) < 1e-6 * amp(1) + 1e-9, 'node of partial 2 is at the middle');
  assert.ok(amp(3) / amp(1) < 0.15 && amp(3) / amp(1) > 0.05, '3rd is about 1/9 of the fundamental');
});

test('plucking nearer the bridge is brighter than plucking mid-string', () => {
  const bright = (beta) => {
    const s = createStrings();
    stringsPluck(s, 2, 30, beta);
    let hi = 0, lo = 0;
    for (let n = 1; n <= STR_MODES; n++) {
      const e = s.a[2 * STR_MODES + n - 1] ** 2 * stringModeFrequency(2, n) ** 2;
      if (n >= 4) hi += e; else lo += e;
    }
    return hi / lo;
  };
  assert.ok(bright(0.1) > 3 * bright(0.5), `${bright(0.1)} vs ${bright(0.5)}`);
});

test('high partials die first: damping rises with mode number', () => {
  for (let k = 0; k < STRING_COUNT; k++) {
    for (let n = 2; n <= STR_MODES; n++) assert.ok(stringModeDecay(k, n) > stringModeDecay(k, n - 1));
  }
  // measured: the 6th partial's energy decays faster than the fundamental's
  const s = createStrings();
  stringsPluck(s, 0, 30, 0.2);
  const modeE = (n) => s.v[n - 1] ** 2 + (stringModeFrequency(0, n) * 2 * Math.PI) ** 2 * s.a[n - 1] ** 2;
  run(s, 0.05);
  const e1a = modeE(1), e6a = modeE(6);
  run(s, 0.5);
  void e1a; void e6a;
  // after half a second the 6th has lost more than the 1st (compare envelopes)
  const amp = (n) => Math.hypot(s.a[n - 1], s.v[n - 1] / (2 * Math.PI * stringModeFrequency(0, n)));
  const s2 = createStrings();
  stringsPluck(s2, 0, 30, 0.2);
  const amp0 = (n) => Math.hypot(s2.a[n - 1], s2.v[n - 1] / (2 * Math.PI * stringModeFrequency(0, n)));
  assert.ok(amp(6) / amp0(6) < amp(1) / amp0(1));
});

test('the ring dies away at the set rate', () => {
  const k = 1;
  const s = createStrings();
  stringsPluck(s, k, 30, 0.5);
  // Peak displacement over one period, once the upper partials have gone.
  const peak = (from) => {
    let m = 0;
    for (let j = 0; j < Math.round(1 / STR_FREQ[k] / (1 / 6400)); j++) {
      stepStringsFrame(s, 1 / 6400);
      m = Math.max(m, stringMaxAbs(s, k));
    }
    void from;
    return m;
  };
  for (let j = 0; j < Math.round(1.0 / (1 / 6400)); j++) stepStringsFrame(s, 1 / 6400);
  const p1 = peak(1);
  for (let j = 0; j < Math.round(2.0 / (1 / 6400)); j++) stepStringsFrame(s, 1 / 6400);
  const p3 = peak(3);
  const rate = -Math.log(p3 / p1) / 2;
  const want = stringModeDecay(k, 1);
  assert.ok(Math.abs(rate - want) / want < 0.3, `rate ${rate} vs ${want}`);
});

test('energy never grows once the finger lets go, and the string settles', () => {
  const s = createStrings();
  stringsPluck(s, 0, 40, 0.3);
  let prev = Infinity;
  for (let i = 0; i < 20; i++) {
    run(s, 0.5);
    let e = 0;
    for (let k = 0; k < STRING_COUNT; k++) e += stringEnergy(s, k);
    assert.ok(e <= prev * 1.001, `energy rose ${prev} -> ${e}`);
    prev = e;
  }
  run(s, 30);
  assert.equal(s.settled, true);
  for (let k = 0; k < STRING_COUNT; k++) assert.equal(stringMaxAbs(s, k), 0);
});

test('a ringing string makes strings tuned to its partials sing in sympathy', () => {
  // E2's 3rd partial (about 247.2 Hz) is B3's fundamental (246.9 Hz).
  const s = createStrings();
  stringsPluck(s, 0, 40, 0.5);
  let peak = 0;
  for (let f = 0; f < 60 * 3; f++) {
    stepStringsFrame(s, 1 / 60);
    peak = Math.max(peak, stringMaxAbs(s, 4));
  }
  assert.ok(peak > 0.1, `sympathetic string should move, got ${peak}`);
  assert.ok(peak < 6, `but far less than the plucked string, got ${peak}`);
});

test('the finger holds a triangle: straight segments with the peak under it', () => {
  const s = createStrings();
  const x = STR_X0 + 0.4 * STR_LENGTH;
  stringsDragTo(s, x, stringY(2));
  stringsDragTo(s, x, stringY(2) + 30);
  stepStringsFrame(s, 1 / 60);
  const peakNode = Math.round(0.4 * (STR_NODES - 1));
  assert.ok(Math.abs(stringShape(s, 2, peakNode) - 30) < 1.2, `peak ${stringShape(s, 2, peakNode)}`);
  // near-straight on the left half of the long side
  const a = stringShape(s, 2, 5), b = stringShape(s, 2, 10), c = stringShape(s, 2, 15);
  assert.ok(Math.abs((c - b) - (b - a)) < 0.6);
  assert.equal(s.grabString, 2);
  stringsRelease(s);
  assert.equal(s.grabString, -1);
});

test('pulled past the limit the string slips off the finger and rings', () => {
  const s = createStrings();
  stringsDragTo(s, 160, stringY(3));
  stringsDragTo(s, 160, stringY(3) + 20);
  assert.equal(s.grabString, 3);
  stringsDragTo(s, 160, stringY(3) + STR_MAX_PULL + 2);
  assert.equal(s.grabString, -1);
  run(s, 0.2);
  assert.ok(stringMaxAbs(s, 3) > 5);
  assert.ok(stringMaxAbs(s, 3) <= STR_MAX_PULL + 1);
});

test('a swipe across the strings plucks each one in turn', () => {
  const s = createStrings();
  stringsDragTo(s, 150, 60);
  const plucked = new Set();
  for (let y = 60; y <= 330; y += 12) {
    stringsDragTo(s, 150, y);
    if (s.grabString >= 0) plucked.add(s.grabString);
    run(s, 0.01);
  }
  stringsRelease(s);
  assert.equal(plucked.size, STRING_COUNT, `plucked ${[...plucked]}`);
  run(s, 0.1);
  for (let k = 0; k < STRING_COUNT; k++) assert.ok(stringMaxAbs(s, k) > 1, `string ${k} rings`);
});

test('the shutter blur: fast ringing spreads over poses, slow motion collapses it', () => {
  const s = createStrings();
  stringsPluck(s, 0, 40, 0.3);
  run(s, 0.1);
  assert.equal(s.poseN, STR_POSES);
  assert.ok(s.blur[0] > 8, `blur at speed ${s.blur[0]}`);
  const slow = createStrings();
  stringsPluck(slow, 0, 40, 0.3);
  run(slow, 0.1, STR_SLOW);
  assert.ok(slow.blur[0] < 0.4 * s.blur[0], `slow-motion blur ${slow.blur[0]} vs ${s.blur[0]}`);
});

test('slow motion shows a pulse split in two, running to the ends', () => {
  // Pluck at a quarter: the two halves of the triangle become pulses that
  // run apart. After a quarter period the peak has left the pluck point.
  const s = createStrings();
  stringsPluck(s, 0, 30, 0.25);
  const node = Math.round(0.25 * (STR_NODES - 1));
  const before = stringShape(s, 0, node);
  stepStringsFrame(s, 1 / STR_FREQ[0] / 8); // an eighth of a period of real time
  assert.ok(stringShape(s, 0, node) < before * 0.9, 'pluck point drops as the pulses leave');
});

test('poses line up with the pins when still', () => {
  const s = createStrings(true);
  assert.equal(stringPose(s, 0, 4, 0), 0);
  assert.equal(STR_COUPLED <= STR_MODES, true);
  stepStringsFrame(s, 1 / 60); // settled: a no-op
  assert.equal(stringPose(s, 0, 4, 20), 0);
});
