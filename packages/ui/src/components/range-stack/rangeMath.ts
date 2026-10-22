// Motion model for Range Stack. Everything on screen is a pure function of the
// clock and of one small selection record, so the React Native component
// (Skia + Reanimated) and the web preview draw the same frame. Springs are the
// closed-form solution of a damped spring, so they are exact at any frame rate
// and slow motion is just a slower clock. Model functions carry a worklet tag
// so Reanimated can call them on the UI thread; plain JS ignores the tag.
//
// Sequence when the second date is picked (t = 0):
//   0.00  the end dot springs in and the range band grows toward it
//   0.00  the old photo stack (if any) shrinks away and its label fades
//   0.10  skeleton: three grey tiles and a grey bar, with a shimmer sweep
//   0.55  the label fades in and the photos pop out of the middle one after
//         another on springs, rotating and fanning to their resting angles

export const RS_W = 320;
export const RS_H = 360;
export const RS_COLS = 7;
export const RS_ROWS = 4;
export const RS_DAYS = RS_COLS * RS_ROWS;
export const RS_CELL_X = 40;
export const RS_CELL_Y = 42;
export const RS_X0 = 40; // centre of column 0
export const RS_Y0 = 82; // centre of row 0
export const RS_DOT_R = 17;
export const RS_STRIP_X = 16;
export const RS_STRIP_Y = 240;
export const RS_STRIP_W = 288;
export const RS_STRIP_H = 64;
export const RS_STACK_CX = 246;
export const RS_STACK_CY = RS_STRIP_Y + RS_STRIP_H / 2;
export const RS_TILE = 38;
export const RS_SLOW = 0.25;
export const RS_MAX_HOMES = 5;
export const RS_SKELETON_AT = 0.1;
export const RS_REVEAL_AT = 0.55;
export const RS_SETTLE = 1.6;

export function clamp01(x: number) {
  'worklet';
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
export function smooth(x: number) {
  'worklet';
  const u = clamp01(x);
  return u * u * (3 - 2 * u);
}
export function easeOutCubic(x: number) {
  'worklet';
  const u = 1 - clamp01(x);
  return 1 - u * u * u;
}
// Closed-form damped spring from 0 to 1 with stiffness k and damping c.
export function spring(t: number, k: number, c: number) {
  'worklet';
  if (t <= 0) return 0;
  const w = Math.sqrt(k);
  const z = c / (2 * w);
  if (z < 1) {
    const wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
  }
  const e = Math.exp(-w * t);
  return 1 - e * (1 + w * t);
}

export function rsCol(day: number) {
  'worklet';
  return (day - 1) % RS_COLS;
}
export function rsRow(day: number) {
  'worklet';
  return Math.floor((day - 1) / RS_COLS);
}
export function rsCellX(day: number) {
  'worklet';
  return RS_X0 + rsCol(day) * RS_CELL_X;
}
export function rsCellY(day: number) {
  'worklet';
  return RS_Y0 + rsRow(day) * RS_CELL_Y;
}

// How many homes are free for a stay. Fixed demo data: 1 to 5, varying with
// the dates so different ranges give different stacks.
export function rsHomes(start: number, end: number) {
  'worklet';
  return ((start * 5 + (end - start) * 3 + 1) % RS_MAX_HOMES) + 1;
}

// ---- Selection (JS thread: taps are the only writer) -----------------------
export type RsSel = {
  start: number; // 0 when none
  end: number; // 0 when none
  startAt: number;
  endAt: number;
  prevStart: number; // endpoints of the range that was just cleared
  prevEnd: number;
  clearAt: number;
  homes: number; // target footer count, 0 = idle
  fFrom: number; // footer count before the change
  fAt: number; // clock time of the footer change
};

export function rsCreate(): RsSel {
  return { start: 0, end: 0, startAt: -10, endAt: -10, prevStart: 0, prevEnd: 0, clearAt: -10, homes: 0, fFrom: 0, fAt: -10 };
}

// What the footer is showing at `now` (the count its new stack has reached).
function shownHomes(s: RsSel, now: number) {
  return now - s.fAt >= RS_REVEAL_AT ? s.homes : now - s.fAt >= 0.14 ? 0 : s.fFrom;
}

export function rsTap(s: RsSel, day: number, now: number): RsSel {
  if (day < 1 || day > RS_DAYS) return s;
  const n: RsSel = { ...s };
  if (s.start > 0 && s.end === 0 && day > s.start) {
    n.end = day;
    n.endAt = now;
    n.fFrom = shownHomes(s, now);
    n.homes = rsHomes(s.start, day);
    n.fAt = now;
  } else if (s.start > 0 && s.end === 0) {
    // Earlier or same day while choosing the end: move the start.
    n.prevStart = s.start;
    n.prevEnd = 0;
    n.clearAt = now;
    n.start = day;
    n.startAt = now;
  } else {
    // New range, or restart after a complete one.
    n.prevStart = s.start;
    n.prevEnd = s.end;
    n.clearAt = s.start > 0 ? now : s.clearAt;
    n.start = day;
    n.end = 0;
    n.startAt = now;
    n.endAt = -10;
    if (s.homes > 0 || s.fFrom > 0) {
      n.fFrom = shownHomes(s, now);
      n.homes = 0;
      n.fAt = now;
    }
  }
  return n;
}

export function rsReset(now: number, s: RsSel): RsSel {
  const n = rsCreate();
  n.prevStart = s.start;
  n.prevEnd = s.end;
  n.clearAt = s.start > 0 ? now : -10;
  if (s.homes > 0) {
    n.fFrom = shownHomes(s, now);
    n.fAt = now;
  }
  return n;
}

// ---- Model -----------------------------------------------------------------
export type RsDot = { day: number; scale: number };
export type RsBand = { x0: number; x1: number; y: number; alpha: number };
export type RsTile = { x: number; y: number; rot: number; scale: number; alpha: number; room: number };
export type RsModel = {
  dots: RsDot[];
  bands: RsBand[];
  ink: number[]; // index day 1..28: 0 dark text, 1 white text
  oldTiles: RsTile[];
  newTiles: RsTile[];
  skeleton: number; // 0..1 opacity of the skeleton tiles and bar
  shimmer: number; // 0..1 sweep position
  skelTiles: RsTile[];
  labelOld: number;
  labelNew: number;
  labelNewY: number;
  idleGhost: number; // opacity of the ghost tiles shown while no dates are chosen
};

// Resting fan for n tiles: centres, angles and a little arc.
const JITTER = [-2, 1.5, -1, 2, 0];
export function rsFan(n: number, i: number) {
  'worklet';
  const mid = (n - 1) / 2;
  const d = i - mid;
  const sp = n > 1 ? 15 : 0;
  return { x: RS_STACK_CX + d * sp, y: RS_STACK_CY + Math.abs(d) * 1.6, rot: n > 1 ? d * 7.5 + JITTER[i % 5] : 0 };
}

function bandsFor(start: number, end: number, reach: number, alpha: number, out: RsBand[]) {
  'worklet';
  // `reach` is how far (in days, fractional) the band has grown from start.
  const last = Math.min(end, start + reach);
  let a = start;
  while (a <= last + 1e-6) {
    const row = rsRow(a);
    const rowEnd = Math.min(end, (row + 1) * RS_COLS);
    const b = Math.min(last, rowEnd);
    if (b >= a - 1e-6) {
      const xa = RS_X0 + rsCol(a) * RS_CELL_X;
      const xb = RS_X0 + (b - 1 - row * RS_COLS) * RS_CELL_X;
      out.push({ x0: xa - RS_DOT_R, x1: xb + RS_DOT_R, y: RS_Y0 + row * RS_CELL_Y, alpha });
    }
    a = rowEnd + 1;
  }
}

function emptyTile(): RsTile {
  'worklet';
  return { x: RS_STACK_CX, y: RS_STACK_CY, rot: 0, scale: 0, alpha: 0, room: 0 };
}

export function rsModel(s: RsSel, now: number): RsModel {
  'worklet';
  const dots: RsDot[] = [];
  const bands: RsBand[] = [];
  const ink: number[] = [];
  for (let d = 0; d <= RS_DAYS; d++) ink.push(0);

  // Dots and band for the live range.
  if (s.start > 0) {
    const sc = spring(now - s.startAt, 520, 26);
    dots.push({ day: s.start, scale: sc });
    ink[s.start] = clamp01(sc * 1.6);
  }
  if (s.start > 0 && s.end > 0) {
    const grow = easeOutCubic((now - s.endAt) / 0.34);
    const sc = spring(now - s.endAt - 0.1, 520, 26);
    dots.push({ day: s.end, scale: sc });
    ink[s.end] = clamp01(sc * 1.6);
    bandsFor(s.start, s.end, (s.end - s.start) * grow, 1, bands);
  }
  // Dots and band of the range that was just cleared fade away.
  const cleared = now - s.clearAt;
  if (cleared >= 0 && cleared < 0.22) {
    const f = 1 - smooth(cleared / 0.22);
    if (s.prevStart > 0 && s.prevStart !== s.start) {
      dots.push({ day: s.prevStart, scale: f });
      ink[s.prevStart] = Math.max(ink[s.prevStart], f);
    }
    if (s.prevEnd > 0 && s.prevEnd !== s.end) {
      dots.push({ day: s.prevEnd, scale: f });
      ink[s.prevEnd] = Math.max(ink[s.prevEnd], f);
    }
    if (s.prevStart > 0 && s.prevEnd > 0) bandsFor(s.prevStart, s.prevEnd, s.prevEnd - s.prevStart, f, bands);
  }

  // Footer.
  const t = now - s.fAt;
  const oldTiles: RsTile[] = [];
  const newTiles: RsTile[] = [];
  const skelTiles: RsTile[] = [];
  const exit = smooth(t / 0.14);
  for (let i = 0; i < RS_MAX_HOMES; i++) {
    const o = emptyTile();
    if (i < s.fFrom && t < 0.14) {
      const f = rsFan(s.fFrom, i);
      o.x = RS_STACK_CX + (f.x - RS_STACK_CX) * (1 - 0.6 * exit);
      o.y = f.y;
      o.rot = f.rot;
      o.scale = 1 - 0.4 * exit;
      o.alpha = 1 - exit;
      o.room = i;
    }
    oldTiles.push(o);
    const nt = emptyTile();
    if (i < s.homes) {
      const at = RS_REVEAL_AT + 0.055 * i;
      const p = spring(t - at, 380, 19);
      const f = rsFan(s.homes, i);
      nt.x = RS_STACK_CX + (f.x - RS_STACK_CX) * p;
      nt.y = f.y + (1 - p) * 9;
      nt.rot = f.rot * p + (1 - p) * -24;
      nt.scale = 0.35 + 0.65 * p;
      nt.alpha = smooth((t - at) / 0.08);
      nt.room = i;
    }
    newTiles.push(nt);
  }
  for (let i = 0; i < 3; i++) {
    const f = rsFan(3, i);
    skelTiles.push({ x: f.x, y: f.y, rot: f.rot * 0.8, scale: 1, alpha: 1, room: 0 });
  }
  const skelIn = smooth((t - RS_SKELETON_AT) / 0.1);
  const skelOut = s.homes > 0 ? 1 - smooth((t - (RS_REVEAL_AT - 0.04)) / 0.12) : 1;
  const idleSettled = s.homes === 0;
  // Idle footer: ghost tiles and the prompt, after the old stack has gone.
  const idleIn = idleSettled ? smooth((t - 0.14) / 0.2) : 0;
  return {
    dots,
    bands,
    ink,
    oldTiles,
    newTiles,
    skeleton: s.homes > 0 && t >= 0 ? skelIn * skelOut : 0,
    shimmer: (now * 1.3) % 1,
    skelTiles,
    labelOld: s.fFrom > 0 && t >= 0 && t < 0.14 ? 1 - exit : 0,
    labelNew: s.homes > 0 ? smooth((t - RS_REVEAL_AT) / 0.2) : idleIn,
    labelNewY: s.homes > 0 ? 7 * (1 - easeOutCubic((t - RS_REVEAL_AT) / 0.35)) : 0,
    idleGhost: idleIn,
  };
}
