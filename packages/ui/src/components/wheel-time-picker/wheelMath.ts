// Pure motion model for the Wheel Time Picker: three drums (hour, minute,
// AM/PM) that carry real inertia and snap to a row. Every function is a
// worklet so Reanimated can step it on the UI thread; plain JS (tests, web
// preview) ignores the tag. Fixed-step integration, so native, web and tests
// agree frame for frame.
//
// Each drum is a cylinder seen from the side. A row at distance `offset`
// (rows) from the centre sits at angle offset * WHEEL_DTH, so its height is
// R sin(angle) and its text is squashed by cos(angle) - the curved-drum look.

export const WHEEL_W = 320;
export const WHEEL_H = 300;
export const WHEEL_CY = 150;
export const WHEEL_ROW_H = 40;
export const WHEEL_DTH = 0.36; // rad between rows
export const WHEEL_R = WHEEL_ROW_H / WHEEL_DTH;
export const WHEEL_COLS = [84, 170, 252];
export const WHEEL_SIZES = [12, 60, 2];
export const WHEEL_WRAP = [1, 1, 0];
export const WHEEL_SLOW = 0.25;
export const WHEEL_SETTLE = 2.2;

const FRICTION = 2.3;      // 1/s, exponential velocity decay while coasting
const SNAP_SPEED = 5;      // rows/s: below this the drum snaps to a row
const SNAP_K = 280;        // spring stiffness of the snap
const SNAP_C = 2 * Math.sqrt(SNAP_K) * 0.9;
const EDGE_K = 140;        // rubber band past the first/last row (no wrap)
const MAX_SPEED = 90;
const STEP = 1 / 240;

export function clamp01(x: number) {
  'worklet';
  return Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));
}
export function wheelMod(x: number, n: number) {
  'worklet';
  return ((x % n) + n) % n;
}

export type Drum = {
  p: number;        // position in rows (float); row index = round(p) mod n
  v: number;        // rows/s
  drag: number;     // 1 while a finger holds it
  base: number;     // p when the drag began
  target: number;   // snap target while snapping, NaN while coasting
  lastRow: number;  // last whole row, to count ticks
  ticks: number;    // rows crossed since the last read
};
export type WheelState = { drums: Drum[]; acc: number; time: number; seq: number; ticked: number };

export function wheelCreate(hour = 7, minute = 30, pm = 0): WheelState {
  'worklet';
  const start = [hour - 1, minute, pm];
  return {
    drums: start.map((p) => ({ p, v: 0, drag: 0, base: p, target: NaN, lastRow: p, ticks: 0 })),
    acc: 0, time: 0, seq: 0, ticked: 0,
  };
}

export function wheelGrab(s: WheelState, d: number, dyPx: number) {
  'worklet';
  const m = s.drums[d];
  if (!m.drag) {
    m.drag = 1;
    m.base = m.p + dyPx / WHEEL_ROW_H;
    m.target = NaN;
  }
  m.v = 0;
  const n = WHEEL_SIZES[d];
  let p = m.base - dyPx / WHEEL_ROW_H;
  if (!WHEEL_WRAP[d]) {
    // Past the ends the finger moves the drum at a third of the speed.
    if (p < 0) p = p / 3;
    if (p > n - 1) p = n - 1 + (p - (n - 1)) / 3;
  }
  m.p = p;
}

export function wheelRelease(s: WheelState, d: number, vyPxPerMs: number) {
  'worklet';
  const m = s.drums[d];
  m.drag = 0;
  const v = (-vyPxPerMs * 1000) / WHEEL_ROW_H;
  m.v = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, Number.isFinite(v) ? v : 0));
  m.target = NaN;
}

/** Flick a drum as if a finger had thrown it at `v` rows/s. */
export function wheelFling(s: WheelState, d: number, v: number) {
  'worklet';
  const m = s.drums[d];
  m.drag = 0;
  m.v = v;
  m.target = NaN;
}

function stepDrum(m: Drum, d: number, h: number) {
  'worklet';
  if (m.drag) return;
  const n = WHEEL_SIZES[d];
  const wrap = WHEEL_WRAP[d] === 1;
  if (Number.isNaN(m.target)) {
    if (Math.abs(m.v) < SNAP_SPEED) {
      // Land on the row the drum was drifting toward.
      let t = Math.round(m.p + m.v * 0.1);
      if (!wrap) t = Math.max(0, Math.min(n - 1, t));
      m.target = t;
    } else {
      m.v *= Math.exp(-FRICTION * h);
    }
  }
  let a = 0;
  if (!Number.isNaN(m.target)) a = -SNAP_K * (m.p - m.target) - SNAP_C * m.v;
  else if (!wrap) {
    if (m.p < 0) a = -EDGE_K * m.p - 14 * m.v;
    else if (m.p > n - 1) a = -EDGE_K * (m.p - (n - 1)) - 14 * m.v;
  }
  m.v += a * h;
  m.p += m.v * h;
  if (!Number.isNaN(m.target) && Math.abs(m.p - m.target) < 0.0005 && Math.abs(m.v) < 0.01) {
    m.p = m.target;
    m.v = 0;
  }
  if (!wrap && !Number.isNaN(m.target)) m.target = Math.max(0, Math.min(n - 1, m.target));
}

/** Advance the whole picker by dt seconds (fixed internal step). */
export function wheelStep(s: WheelState, dt: number) {
  'worklet';
  s.acc += Math.min(dt, 0.05);
  while (s.acc >= STEP) {
    s.acc -= STEP;
    s.time += STEP;
    for (let d = 0; d < 3; d++) {
      const m = s.drums[d];
      stepDrum(m, d, STEP);
      const row = Math.round(m.p);
      if (row !== m.lastRow) {
        m.ticks += Math.abs(row - m.lastRow);
        s.ticked += Math.abs(row - m.lastRow);
        m.lastRow = row;
      }
    }
  }
}

export function wheelSettled(s: WheelState) {
  'worklet';
  for (let d = 0; d < 3; d++) {
    const m = s.drums[d];
    if (m.drag || Math.abs(m.v) > 0.01 || Math.abs(m.p - Math.round(m.p)) > 0.001) return false;
  }
  return true;
}

export function wheelValue(s: WheelState) {
  'worklet';
  return {
    hour: wheelMod(Math.round(s.drums[0].p), 12) + 1,
    minute: wheelMod(Math.round(s.drums[1].p), 60),
    period: wheelMod(Math.round(s.drums[2].p), 2) === 0 ? "AM" : "PM",
  } as { hour: number; minute: number; period: "AM" | "PM" };
}

export function rowLabel(d: number, i: number) {
  'worklet';
  if (d === 0) return String(i + 1);
  if (d === 1) return i < 10 ? `0${i}` : String(i);
  return i === 0 ? "AM" : "PM";
}

/** Signed distance in rows from the drum centre to row i. */
export function rowOffset(m: Drum, d: number, i: number) {
  'worklet';
  const n = WHEEL_SIZES[d];
  let o = i - m.p;
  if (WHEEL_WRAP[d]) o = wheelMod(o + n / 2, n) - n / 2;
  return o;
}

export type RowGeom = { y: number; s: number; a: number; blur: number; lit: number; visible: boolean };
/** Where and how one row is drawn. `speed` (rows/s) adds motion blur. */
export function rowGeom(offset: number, speed: number): RowGeom {
  'worklet';
  const th = offset * WHEEL_DTH;
  if (Math.abs(th) >= 1.45) return { y: 0, s: 0, a: 0, blur: 0, lit: 0, visible: false };
  const c = Math.cos(th);
  return {
    y: WHEEL_CY + WHEEL_R * Math.sin(th),
    s: c,
    a: Math.pow(c, 1.6),
    blur: Math.min(5, Math.abs(offset) * 1.25 + Math.min(2.2, speed * 0.03)),
    lit: clamp01(1 - Math.abs(offset) / 0.85),
    visible: true,
  };
}

/** Tick marks on a drum: half-row spacing. Sharp and bright when slow, long
 *  soft streaks when fast. */
export type Tick = { y: number; len: number; w: number; a: number };
export function drumTicks(p: number, speed: number): { ticks: Tick[]; blur: number } {
  'worklet';
  const sharp = 1 - clamp01(speed / 16);
  const out: Tick[] = [];
  const base = Math.floor(p * 2) / 2;
  for (let k = -9; k <= 9; k++) {
    const row = base + k / 2;
    const off = row - p;
    const th = off * WHEEL_DTH;
    if (Math.abs(th) >= 1.4) continue;
    const c = Math.cos(th);
    const whole = Math.abs(row - Math.round(row)) < 0.01;
    out.push({
      y: WHEEL_CY + WHEEL_R * Math.sin(th),
      len: (whole ? 7 : 4) * c * (1 + (1 - sharp) * 0.9),
      w: (whole ? 1.6 : 1.1) * (0.6 + c * 0.4),
      a: (0.18 + 0.5 * sharp) * c * (whole ? 1 : 0.7),
    });
  }
  return { ticks: out, blur: 2.6 * (1 - sharp) };
}
