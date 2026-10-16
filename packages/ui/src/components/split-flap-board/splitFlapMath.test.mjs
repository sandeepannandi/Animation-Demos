import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FLAP_CHARSET, FLAP_GLYPHS, DEFAULT_FLAP, WOBBLE_MS,
  charIndex, makeCells, retarget, stepCells, isSettled,
  fallScale, revealScale, fallShade, revealShade, castShade, wobbleOffset,
  strokeGlyph, glyphAdvance,
} from './splitFlapMath.ts';

const OPTS = { ...DEFAULT_FLAP };

test('every charset char has a well-formed glyph', () => {
  for (const c of FLAP_CHARSET) {
    const g = FLAP_GLYPHS[c];
    assert.ok(g, `missing glyph for ${JSON.stringify(c)}`);
    assert.ok(g.w > 0);
    for (const st of g.s) {
      assert.ok(st.length >= 4 && st.length % 2 === 0, `bad stroke in ${c}`);
      for (const v of st) assert.ok(Number.isFinite(v));
    }
  }
  assert.equal(charIndex('q'), charIndex('Q'), 'lowercase folds to uppercase');
  assert.equal(charIndex('~'), 0, 'unknown chars become blank');
});

test('makeCells centers the word and pads with blanks', () => {
  const cells = makeCells('HI', 6);
  assert.equal(cells.length, 6);
  const text = cells.map((c) => FLAP_CHARSET[c.ch]).join('');
  assert.equal(text, '  HI  ');
  assert.ok(cells.every((c) => c.queue === 0 && c.flip === 0 && c.wobble === -1));
  assert.equal(makeCells('TOOLONGWORD', 4).map((c) => FLAP_CHARSET[c.ch]).join(''), 'TOOL');
});

test('retarget cycles forward through the charset with a cascade', () => {
  const cells = makeCells('A', 3); // ' A '
  const next = retarget(cells, 'C', OPTS, false);
  // cell 1: A(1) -> C(3) = 2 steps; blanks stay blank
  assert.equal(next[1].queue, 2);
  assert.equal(next[0].queue, 0);
  assert.equal(next[1].delay, 1 * OPTS.cascadeMs);
  assert.equal(next[2].delay, 0); // settled cells keep no delay
  // wrap-around: Z -> A
  const z = makeCells('Z', 1);
  const toA = retarget(z, 'A', OPTS, false);
  assert.equal(toA[0].queue, (charIndex('A') - charIndex('Z') + FLAP_CHARSET.length) % FLAP_CHARSET.length);
  // long queues flip faster
  assert.equal(toA[0].flipMs, OPTS.fastStepMs);
  assert.equal(next[1].flipMs, OPTS.stepMs);
});

test('reduced motion swaps instantly', () => {
  const cells = makeCells('AB', 2);
  const next = retarget(cells, 'XY', OPTS, true);
  assert.equal(FLAP_CHARSET[next[0].ch], 'X');
  assert.equal(FLAP_CHARSET[next[1].ch], 'Y');
  assert.ok(next.every((c) => c.queue === 0 && c.flip === 0 && c.wobble === -1));
});

test('stepCells advances and fully settles on the target word', () => {
  let cells = makeCells('', 10);
  cells = retarget(cells, 'HELLO', OPTS, false);
  assert.ok(!isSettled(cells));
  let active = true;
  let guard = 0;
  while (active && guard++ < 20000) {
    const r = stepCells(cells, 16.7);
    cells = r.cells;
    active = r.active;
  }
  assert.ok(guard < 20000, 'board settles');
  assert.ok(isSettled(cells));
  const text = cells.map((c) => FLAP_CHARSET[c.ch]).join('');
  assert.equal(text, '  HELLO   '.slice(0, 10));
  assert.ok(cells.every((c) => c.flip === 0 && c.wobble === -1));
});

test('stepCells is a no-op (same array) while settled', () => {
  const cells = makeCells('OK', 4);
  const r = stepCells(cells, 16.7);
  assert.equal(r.cells, cells);
  assert.equal(r.active, false);
});

test('stepping is deterministic', () => {
  const run = () => {
    let cells = retarget(makeCells('PARIS', 6), 'TOKYO', OPTS, false);
    const snaps = [];
    for (let i = 0; i < 400; i++) { cells = stepCells(cells, 16.7).cells; snaps.push(JSON.stringify(cells)); }
    return snaps;
  };
  assert.deepEqual(run(), run());
});

test('leaf easing and shades hit their endpoints', () => {
  assert.equal(fallScale(0), 1);
  assert.equal(fallScale(1), 0);
  assert.equal(revealScale(0), 0);
  assert.equal(revealScale(1), 1);
  assert.equal(fallShade(0), 0);
  assert.equal(revealShade(1), 0);
  assert.ok(castShade(0.5) > 0.29 && castShade(0) === 0);
  assert.equal(wobbleOffset(-1), 0);
  assert.equal(wobbleOffset(WOBBLE_MS + 1), 0);
  assert.ok(Math.abs(wobbleOffset(30)) > 0.5, 'clack is visible');
});

test('strokeGlyph emits the glyph strokes', () => {
  const calls = [];
  const fake = { moveTo: (x, y) => calls.push(['m', x, y]), lineTo: (x, y) => calls.push(['l', x, y]) };
  const g = FLAP_GLYPHS.A;
  const strokes = g.s.length;
  const pts = g.s.reduce((n, s) => n + s.length / 2, 0);
  strokeGlyph(fake, charIndex('A'), 10, 20, 2);
  assert.equal(calls.length, pts);
  assert.equal(calls.filter((c) => c[0] === 'm').length, strokes);
  assert.equal(calls[0][1], 10 + g.s[0][0] * 2);
  assert.equal(calls[0][2], 20 + g.s[0][1] * 2);
  assert.ok(glyphAdvance(charIndex('M')) > glyphAdvance(charIndex('I')));
});
