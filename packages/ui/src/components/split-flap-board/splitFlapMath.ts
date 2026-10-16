// Pure split-flap display logic: charset cycling, per-cell flip queues,
// cascade timing, leaf easing and an original stroke-glyph set. Every
// function is a worklet so Reanimated can step the board on the UI thread;
// plain JS (tests, web preview) ignores the tag. No randomness: the cascade
// is positional, so tests, native and web all agree.

export type FlapCell = {
  ch: number;      // FLAP_CHARSET index currently shown (settled value)
  queue: number;   // forward steps remaining to reach the target
  flip: number;    // 0..1 progress through the current half-flip step
  flipMs: number;  // duration of one step, ms (short while the queue is long)
  delay: number;   // ms to wait before the next step starts
  wobble: number;  // ms since the last landing clack, -1 = still
};

export type FlapOptions = {
  stepMs: number;      // duration of one half-flip step
  fastStepMs: number;  // step duration once a queue runs long (rapid clatter)
  fastAfter: number;   // queue length that switches to fastStepMs
  cascadeMs: number;   // per-column start delay
  timeScale: number;   // slow-motion multiplier (1 = normal)
};

export const DEFAULT_FLAP: FlapOptions = { stepMs: 150, fastStepMs: 55, fastAfter: 7, cascadeMs: 70, timeScale: 1 };
export const WOBBLE_MS = 420;

export const FLAP_CHARSET = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

// Original single-stroke glyph set on a small grid, y downward, baseline at
// 7. Each glyph is an advance width plus polylines [x0, y0, x1, y1, ...].
// Round caps and joins come from the stroke style, not the data.
export type FlapGlyph = { w: number; s: number[][] };
export const FLAP_GLYPHS: Record<string, FlapGlyph> = {
  ' ': { w: 2.4, s: [] },
  A: { w: 4, s: [[0, 7, 2, 0, 4, 7], [0.9, 4.6, 3.1, 4.6]] },
  B: { w: 4, s: [[0, 0, 0, 7], [0, 0, 2.9, 0, 4, 1.1, 4, 2.4, 2.9, 3.5, 0, 3.5], [0, 3.5, 3.1, 3.5, 4.1, 4.7, 4.1, 5.9, 3.1, 7, 0, 7]] },
  C: { w: 4, s: [[4, 1.5, 3.1, 0.3, 1.1, 0.3, 0, 1.9, 0, 5.1, 1.1, 6.7, 3.1, 6.7, 4, 5.5]] },
  D: { w: 4.2, s: [[0, 0, 0, 7], [0, 0, 2.6, 0, 4.2, 1.7, 4.2, 5.3, 2.6, 7, 0, 7]] },
  E: { w: 3.5, s: [[0, 0, 0, 7], [0, 0, 3.5, 0], [0, 3.5, 2.6, 3.5], [0, 7, 3.5, 7]] },
  F: { w: 3.5, s: [[0, 0, 0, 7], [0, 0, 3.5, 0], [0, 3.5, 2.6, 3.5]] },
  G: { w: 4.2, s: [[4.2, 1.5, 3.2, 0.3, 1.1, 0.3, 0, 1.9, 0, 5.1, 1.1, 6.7, 3.2, 6.7, 4.2, 5.4, 4.2, 4.1, 2.4, 4.1]] },
  H: { w: 4, s: [[0, 0, 0, 7], [4, 0, 4, 7], [0, 3.5, 4, 3.5]] },
  I: { w: 1.6, s: [[0.8, 0, 0.8, 7], [0, 0, 1.6, 0], [0, 7, 1.6, 7]] },
  J: { w: 3.4, s: [[3, 0, 3, 5.3, 2.1, 6.8, 1.1, 6.8, 0.1, 5.7], [2.2, 0, 3.4, 0]] },
  K: { w: 4, s: [[0, 0, 0, 7], [4, 0, 0, 3.1], [1.3, 2.2, 4, 7]] },
  L: { w: 3.2, s: [[0, 0, 0, 7], [0, 7, 3.2, 7]] },
  M: { w: 5, s: [[0, 7, 0, 0, 2.5, 4.6, 5, 0, 5, 7]] },
  N: { w: 4.4, s: [[0, 7, 0, 0, 4.4, 7, 4.4, 0]] },
  O: { w: 4.4, s: [[2.2, 0, 3.6, 0.2, 4.4, 1.9, 4.4, 5.1, 3.6, 6.8, 2.2, 7, 0.8, 6.8, 0, 5.1, 0, 1.9, 0.8, 0.2, 2.2, 0]] },
  P: { w: 4, s: [[0, 7, 0, 0], [0, 0, 2.9, 0, 4, 1.2, 4, 2.8, 2.9, 4, 0, 4]] },
  Q: { w: 4.4, s: [[2.2, 0, 3.6, 0.2, 4.4, 1.9, 4.4, 5.1, 3.6, 6.8, 2.2, 7, 0.8, 6.8, 0, 5.1, 0, 1.9, 0.8, 0.2, 2.2, 0], [2.7, 5.2, 4.7, 7.4]] },
  R: { w: 4.2, s: [[0, 7, 0, 0], [0, 0, 2.9, 0, 4, 1.2, 4, 2.8, 2.9, 4, 0, 4], [1.9, 4, 4.2, 7]] },
  S: { w: 3.8, s: [[3.8, 1, 3, 0.2, 1.2, 0.2, 0.2, 1.4, 0.7, 2.9, 3.1, 4, 3.8, 5.5, 2.8, 6.8, 1, 6.8, 0, 5.9]] },
  T: { w: 3.8, s: [[0, 0, 3.8, 0], [1.9, 0, 1.9, 7]] },
  U: { w: 4.2, s: [[0, 0, 0, 5.3, 1, 6.8, 3.2, 6.8, 4.2, 5.3, 4.2, 0]] },
  V: { w: 4.2, s: [[0, 0, 2.1, 7, 4.2, 0]] },
  W: { w: 5.6, s: [[0, 0, 1.2, 7, 2.8, 2.6, 4.4, 7, 5.6, 0]] },
  X: { w: 4, s: [[0, 0, 4, 7], [4, 0, 0, 7]] },
  Y: { w: 4, s: [[0, 0, 2, 3.4], [4, 0, 2, 3.4, 2, 7]] },
  Z: { w: 3.8, s: [[0, 0, 3.8, 0], [3.8, 0, 0, 7], [0, 7, 3.8, 7]] },
  '0': { w: 4, s: [[2, 0, 3.2, 0.2, 4, 1.9, 4, 5.1, 3.2, 6.8, 2, 7, 0.8, 6.8, 0, 5.1, 0, 1.9, 0.8, 0.2, 2, 0]] },
  '1': { w: 2.6, s: [[0.3, 1.5, 1.5, 0, 1.5, 7], [0.3, 7, 2.6, 7]] },
  '2': { w: 3.8, s: [[0.2, 1.5, 1.1, 0.2, 2.8, 0.2, 3.7, 1.3, 3.6, 2.6, 0, 7], [0, 7, 3.8, 7]] },
  '3': { w: 3.8, s: [[0.2, 1.1, 1.2, 0.2, 2.8, 0.2, 3.6, 1.4, 2.7, 3.2, 1.6, 3.2], [1.6, 3.2, 3, 3.3, 3.8, 4.7, 2.8, 6.8, 1, 6.8, 0, 5.8]] },
  '4': { w: 4, s: [[2.8, 7, 2.8, 0, 0, 4.7, 4, 4.7]] },
  '5': { w: 3.8, s: [[3.5, 0, 0.7, 0], [0.7, 0, 0.4, 3, 1.8, 2.6, 3.2, 3, 3.7, 4.5, 2.8, 6.8, 1, 6.8, 0, 5.8]] },
  '6': { w: 3.8, s: [[3.3, 0.7, 2.4, 0.1, 1.2, 0.5, 0.2, 2.7, 0.2, 5, 1, 6.8, 2.6, 6.8, 3.6, 5.4, 3.2, 3.9, 1.7, 3.6, 0.2, 4.3]] },
  '7': { w: 3.6, s: [[0, 0, 3.6, 0], [3.6, 0, 1.4, 7]] },
  '8': { w: 3.8, s: [[1.9, 0, 3, 0.4, 3.4, 1.5, 2.7, 3, 1.1, 3, 0.4, 1.5, 0.8, 0.4, 1.9, 0], [1.1, 3.1, 3.1, 3.5, 3.7, 5.1, 2.7, 6.8, 1.1, 6.8, 0.1, 5.1, 0.7, 3.5, 1.1, 3.1]] },
  '9': { w: 3.8, s: [[0.5, 6.3, 1.4, 6.9, 2.6, 6.5, 3.6, 4.3, 3.6, 2, 2.8, 0.2, 1.2, 0.2, 0.2, 1.6, 0.6, 3.1, 2.1, 3.4, 3.6, 2.7]] },
};

export function charIndex(c: string): number {
  'worklet';
  let i = FLAP_CHARSET.indexOf(c);
  if (i < 0) i = FLAP_CHARSET.indexOf(c.toUpperCase());
  return i < 0 ? 0 : i;
}

// Centers the word in a row of cols cells, padded with blanks.
export function makeCells(text: string, cols: number): FlapCell[] {
  'worklet';
  const word = text.slice(0, cols);
  const start = Math.max(0, Math.floor((cols - word.length) / 2));
  const cells: FlapCell[] = [];
  for (let i = 0; i < cols; i++) {
    const c = i >= start && i < start + word.length ? word[i - start] : ' ';
    cells.push({ ch: charIndex(c), queue: 0, flip: 0, flipMs: DEFAULT_FLAP.stepMs, delay: 0, wobble: -1 });
  }
  return cells;
}

// Points every cell at the next word. Each cell cycles forward through the
// charset; long runs flip faster, columns start in a left-to-right wave.
export function retarget(cells: FlapCell[], text: string, opts: FlapOptions, reduced: boolean): FlapCell[] {
  'worklet';
  const cols = cells.length;
  const word = text.slice(0, cols);
  const start = Math.max(0, Math.floor((cols - word.length) / 2));
  const L = FLAP_CHARSET.length;
  const next: FlapCell[] = [];
  for (let i = 0; i < cols; i++) {
    const c = cells[i];
    const target = i >= start && i < start + word.length ? charIndex(word[i - start]) : 0;
    if (reduced) {
      next.push(target === c.ch && c.queue === 0 ? c : { ch: target, queue: 0, flip: 0, flipMs: opts.stepMs, delay: 0, wobble: -1 });
      continue;
    }
    const steps = (target - c.ch + L) % L;
    if (steps === 0 && c.queue === 0) { next.push(c); continue; }
    next.push({
      ch: c.ch,
      queue: steps,
      flip: 0,
      flipMs: (steps > opts.fastAfter ? opts.fastStepMs : opts.stepMs) * opts.timeScale,
      delay: i * opts.cascadeMs * opts.timeScale,
      wobble: c.wobble,
    });
  }
  return next;
}

export type StepResult = { cells: FlapCell[]; active: boolean };

// Advances every cell by dtMs. Always returns a fresh top-level array (the
// frame callback writes it every frame; settled cells are reused by
// reference, so a settled board allocates only one small array per frame).
export function stepCells(cells: FlapCell[], dtMs: number): StepResult {
  'worklet';
  const L = FLAP_CHARSET.length;
  let active = false;
  let changed = false;
  const next: FlapCell[] = new Array(cells.length);
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    let ch = c.ch, queue = c.queue, flip = c.flip, delay = c.delay, wobble = c.wobble;
    if (wobble >= 0) {
      wobble += dtMs;
      if (wobble > WOBBLE_MS) wobble = -1; else active = true;
    }
    if (queue > 0) {
      active = true;
      if (delay > 0) {
        delay -= dtMs;
      } else {
        flip += dtMs / c.flipMs;
        if (flip >= 1) {
          flip = 0;
          ch = (ch + 1) % L;
          queue -= 1;
          wobble = 0;
          if (queue > 0) active = true;
        }
      }
    }
    if (ch !== c.ch || queue !== c.queue || flip !== c.flip || delay !== c.delay || wobble !== c.wobble) {
      changed = true;
      next[i] = { ch, queue, flip, flipMs: c.flipMs, delay, wobble };
    } else {
      next[i] = c;
    }
  }
  // Always a fresh array: the frame callback writes cells.value every frame
  // (device-proven pattern - conditional writes stalled on native).
  return { cells: next, active: active || changed };
}

export function isSettled(cells: FlapCell[]): boolean {
  'worklet';
  for (let i = 0; i < cells.length; i++) if (cells[i].queue > 0 || cells[i].wobble >= 0) return false;
  return true;
}

// Leaf motion: the falling top half accelerates like a hinged card; the
// revealing bottom half decelerates into place. Shades are overlay opacities.
export function fallScale(p: number): number {
  'worklet';
  return Math.max(0, 1 - p * p * p);
}
export function revealScale(p: number): number {
  'worklet';
  const q = 1 - p;
  return Math.max(0, 1 - q * q * q);
}
export function fallShade(p: number): number {
  'worklet';
  return 0.62 * p * p;
}
export function revealShade(p: number): number {
  'worklet';
  const q = 1 - p;
  return 0.62 * q * q;
}
// Soft shadow the falling leaf casts onto the lower half (opacity 0..0.3).
export function castShade(flip: number): number {
  'worklet';
  const p = flip < 0.5 ? flip * 2 : 1;
  return 0.3 * Math.sin(p * Math.PI * 0.5);
}
// Impact clack: a decaying vertical bounce for the lower half, px.
export function wobbleOffset(t: number): number {
  'worklet';
  if (t < 0 || t > WOBBLE_MS) return 0;
  return 1.7 * Math.sin(t * 0.09) * Math.exp(-t / 130);
}

// Strokes one glyph into a Skia path-like object (anything with moveTo and
// lineTo), scaled so the 7-unit cap height becomes glyphH px and centered in
// a cellW-wide box at vertical offset oy.
export function strokeGlyph<P extends { moveTo(x: number, y: number): void; lineTo(x: number, y: number): void }>(
  path: P, ch: number, ox: number, oy: number, scale: number,
): P {
  'worklet';
  const g = FLAP_GLYPHS[FLAP_CHARSET[ch]] || FLAP_GLYPHS[' '];
  for (let s = 0; s < g.s.length; s++) {
    const st = g.s[s];
    path.moveTo(ox + st[0] * scale, oy + st[1] * scale);
    for (let i = 2; i + 1 < st.length; i += 2) path.lineTo(ox + st[i] * scale, oy + st[i + 1] * scale);
  }
  return path;
}

export function glyphAdvance(ch: number): number {
  'worklet';
  return (FLAP_GLYPHS[FLAP_CHARSET[ch]] || FLAP_GLYPHS[' ']).w;
}
