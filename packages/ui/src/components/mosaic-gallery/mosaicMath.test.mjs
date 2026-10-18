import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  decodeBase64, hashSeed, rand01, shufflePermutation, clamp01, easeInOutCubic,
  cellDelay, makeState, beginShuffle, evalMosaicFrame, makeFrame,
  clampView, zoomAbout, MIN_ZOOM, MAX_ZOOM, SHUFFLE_DURATION, SHUFFLE_SPREAD, SHUFFLE_JITTER,
} from './mosaicMath.ts';
import { MOSAIC_COLS, MOSAIC_ROWS, MOSAIC_PAINTINGS } from './mosaic-data.ts';

const COLS = MOSAIC_COLS, ROWS = MOSAIC_ROWS, N = COLS * ROWS;

function colors(seed) {
  const c = new Uint8ClampedArray(N * 3);
  for (let i = 0; i < N * 3; i++) c[i] = (hashSeed(seed + i) >>> 16) & 255;
  return c;
}

test('hashSeed/rand01 are deterministic and unsigned', () => {
  for (let i = 0; i < 200; i++) {
    const h = hashSeed(i * 97);
    assert.ok(h >= 0 && h <= 0xffffffff, `hash ${h}`);
    const r = rand01(i * 131);
    assert.ok(r >= 0 && r < 1);
  }
  assert.equal(hashSeed(42), hashSeed(42));
});

test('decodeBase64 round-trips RGB bytes', () => {
  const raw = new Uint8ClampedArray([0, 1, 2, 250, 128, 64, 255]);
  const b64 = Buffer.from(raw).toString('base64');
  const out = decodeBase64(b64);
  assert.deepEqual([...out], [...raw]);
  // every shipped painting decodes to COLS*ROWS*3 bytes
  for (const p of MOSAIC_PAINTINGS) {
    assert.equal(decodeBase64(p.colorsB64).length, N * 3, p.id);
  }
});

test('shufflePermutation is a real permutation and seeded', () => {
  const a = shufflePermutation(N, 7);
  const b = shufflePermutation(N, 7);
  const c = shufflePermutation(N, 8);
  assert.deepEqual([...a], [...b]);
  assert.notDeepEqual([...a], [...c]);
  const seen = new Set(a);
  assert.equal(seen.size, N);
  let moved = 0;
  for (let i = 0; i < N; i++) if (a[i] !== i) moved++;
  assert.ok(moved > N * 0.9, `only ${moved} moved`);
});

test('cellDelay is a radial wave: near the tap goes first', () => {
  const ox = COLS / 2, oy = ROWS / 2;
  const center = Math.floor(oy) * COLS + Math.floor(ox);
  const corner = 0;
  const dc = cellDelay(center, COLS, ROWS, ox, oy, 3);
  const df = cellDelay(corner, COLS, ROWS, ox, oy, 3);
  assert.ok(dc < df, `${dc} !< ${df}`);
  assert.ok(df <= SHUFFLE_SPREAD * 1.42 + SHUFFLE_JITTER + 1e-9, `delay ${df} beyond budget`);
  assert.ok(dc >= 0);
});

test('rest frame: cells sit on home slots with painting colors', () => {
  const colA = colors(11);
  const st = makeState(0, colA, N);
  const frame = makeFrame(N);
  evalMosaicFrame(st, COLS, ROWS, 10, false, frame);
  assert.equal(st.active, 0);
  for (const i of [0, 1, 500, 2815]) {
    assert.equal(frame.x[i], (i % COLS) + 0.5);
    assert.equal(frame.y[i], Math.floor(i / COLS) + 0.5);
    assert.equal(frame.s[i], 1);
    const packed = 0xff000000 | (colA[i * 3] << 16) | (colA[i * 3 + 1] << 8) | colA[i * 3 + 2];
    assert.equal(frame.color[i], packed >>> 0);
  }
});

test('shuffle: cells fly and land exactly on target colors', () => {
  const colA = colors(21), colB = colors(99);
  const st = makeState(0, colA, N);
  const frame = makeFrame(N);
  beginShuffle(st, 1, colB, 5, COLS / 2, ROWS / 2, 4242);
  assert.equal(st.active, 1);
  // midway: at least one cell is off its origin slot and above rest scale
  evalMosaicFrame(st, COLS, ROWS, 5 + SHUFFLE_SPREAD * 0.4 + SHUFFLE_DURATION / 2, false, frame);
  let offSlot = 0, scaled = 0;
  for (let i = 0; i < N; i++) {
    const fx = (st.from[i] % COLS) + 0.5, fy = Math.floor(st.from[i] / COLS) + 0.5;
    if (Math.abs(frame.x[i] - fx) + Math.abs(frame.y[i] - fy) > 0.05) offSlot++;
    if (frame.s[i] > 1.05) scaled++;
  }
  assert.ok(offSlot > N * 0.3, `offSlot=${offSlot}`);
  assert.ok(scaled > 0, 'no cell grew mid-flight');
  // far past the end: landed, painting swapped, colors exact
  evalMosaicFrame(st, COLS, ROWS, 5 + SHUFFLE_SPREAD + SHUFFLE_JITTER + SHUFFLE_DURATION + 1, false, frame);
  assert.equal(st.active, 0);
  assert.equal(st.painting, 1);
  for (const i of [0, 42, 1000, 2815]) {
    const slot = st.home[i];
    assert.equal(frame.x[i], (slot % COLS) + 0.5);
    assert.equal(frame.y[i], Math.floor(slot / COLS) + 0.5);
    assert.equal(frame.s[i], 1);
    const packed = 0xff000000 | (colB[slot * 3] << 16) | (colB[slot * 3 + 1] << 8) | colB[slot * 3 + 2];
    assert.equal(frame.color[i], packed >>> 0);
  }
});

test('reduced motion: no flight, quick crossfade, home untouched', () => {
  const colA = colors(5), colB = colors(77);
  const st = makeState(0, colA, N);
  const before = [...st.home];
  const frame = makeFrame(N);
  beginShuffle(st, 1, colB, 3, 4, 4, 9);
  evalMosaicFrame(st, COLS, ROWS, 3.12, true, frame); // mid-fade
  for (let i = 0; i < N; i += 401) {
    const slot = st.home[i];
    assert.equal(frame.x[i], (slot % COLS) + 0.5);
    assert.equal(frame.s[i], 1);
  }
  evalMosaicFrame(st, COLS, ROWS, 3.5, true, frame); // done
  assert.equal(st.active, 0);
  assert.equal(st.painting, 1);
  assert.deepEqual([...st.home], before);
});

test('view clamps: scale band and field stays covering the viewport', () => {
  assert.equal(clampView({ scale: 0.2, tx: 0, ty: 0 }, 400, 300).scale, MIN_ZOOM);
  assert.equal(clampView({ scale: 99, tx: 0, ty: 0 }, 400, 300).scale, MAX_ZOOM);
  const v = clampView({ scale: 2, tx: 9999, ty: -9999 }, 400, 300);
  assert.ok(Math.abs(v.tx) <= 400 && Math.abs(v.ty) <= 300);
});

test('zoomAbout keeps the focal point stationary', () => {
  const view = { scale: 1, tx: 0, ty: 0 };
  const fx = 300, fy = 120, W = 400, H = 300;
  const next = zoomAbout(view, 2, fx, fy, W, H);
  const px = (fx - W / 2 - view.tx) / view.scale;
  const py = (fy - H / 2 - view.ty) / view.scale;
  assert.ok(Math.abs(W / 2 + next.tx + px * next.scale - fx) < 1e-6);
  assert.ok(Math.abs(H / 2 + next.ty + py * next.scale - fy) < 1e-6);
});

test('easing helpers stay in band', () => {
  for (let i = 0; i <= 20; i++) {
    const p = i / 20;
    assert.ok(easeInOutCubic(p) >= 0 && easeInOutCubic(p) <= 1);
  }
  assert.equal(clamp01(-1), 0);
  assert.equal(clamp01(2), 1);
});
