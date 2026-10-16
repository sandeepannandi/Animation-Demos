// Pure 2D physics for the Bubble Picker. Every function is a worklet so
// Reanimated can step the simulation on the UI thread; plain JS (tests, web
// preview) ignores the tag. No randomness: spawns and sizes are deterministic
// so tests, native and web all agree.

export type BubbleBody = {
  id: string;
  x: number; y: number;       // center, px
  vx: number; vy: number;     // velocity, px/s
  r: number;                  // current radius, px (springs toward target)
  baseR: number;              // resting radius, px
  rv: number;                 // radius spring velocity
  selected: number;           // 0 or 1
  scale: number; scaleV: number; // pop spring (1 = rest)
  wob: number; wobV: number;  // impact wobble oscillator (0 = still)
  grabbed: number;            // 0 or 1
};
export type BubbleBounds = { left: number; top: number; right: number; bottom: number };
export type BubblePointer = { x: number; y: number; active: number };
export type PhysicsOptions = {
  gravity: number;      // constant pull toward the bounds center, px/s^2
  drag: number;         // exponential velocity damping, 1/s
  restitution: number;  // bounce energy kept, 0..1
  maxSpeed: number;     // px/s, stability cap
};

export const DEFAULT_PHYSICS: PhysicsOptions = { gravity: 34, drag: 1.05, restitution: 0.86, maxSpeed: 2600 };

// Springs: radius breathes toward its target, scale pops on selection, wobble
// rings after an impact. Tuned so a tap feels like a soft rubber ball.
const RADIUS_SPRING = { k: 210, c: 17 };
const SCALE_SPRING = { k: 300, c: 13 };
const WOBBLE_SPRING = { k: 130, c: 4.2 };
const GRAB_SPRING = { k: 150, c: 15 };
const SELECTED_GROWTH = 1.24;
const IMPACT_WOBBLE = 0.0035;   // wobble kick per px/s of impact speed
const MAX_WOBBLE = 0.09;

export function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

// Small deterministic hash so bubble sizes and spawn jitter are stable across
// platforms and test runs.
export function hashSeed(id: string, salt: number) {
  'worklet';
  let h = (2166136261 + salt * 101) >>> 0;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619) >>> 0;
  return (h % 100000) / 100000;
}

export function bubbleRadius(id: string, index: number) {
  'worklet';
  return 34 + Math.floor(hashSeed(id, index * 7 + 1) * 3) * 5; // 34, 39 or 44
}

export function insetBounds(width: number, height: number, pad: number): BubbleBounds {
  'worklet';
  const p = Math.max(0, pad);
  return { left: p, top: p, right: Math.max(p, width - p), bottom: Math.max(p, height - p) };
}

// Golden-angle spiral from the center: bubbles start clustered, never stacked.
export function spawnBodies(items: readonly { id: string }[], bounds: BubbleBounds): BubbleBody[] {
  'worklet';
  const cx = (bounds.left + bounds.right) / 2, cy = (bounds.top + bounds.bottom) / 2;
  const golden = Math.PI * (3 - Math.sqrt(5));
  return items.map((item, i) => {
    const r = bubbleRadius(item.id, i);
    const angle = i * golden;
    const ring = 8 + Math.sqrt(i + 0.5) * (r + 14);
    return {
      id: item.id,
      x: clamp(cx + Math.cos(angle) * ring, bounds.left + r, bounds.right - r),
      y: clamp(cy + Math.sin(angle) * ring * 0.82, bounds.top + r, bounds.bottom - r),
      vx: 0, vy: 0, r, baseR: r, rv: 0, selected: 0, scale: 1, scaleV: 0, wob: 0, wobV: 0, grabbed: 0,
    };
  });
}

// Topmost body under a point: the last spawned wins, like painter order.
export function pickBody(bodies: readonly BubbleBody[], x: number, y: number) {
  'worklet';
  for (let i = bodies.length - 1; i >= 0; i--) {
    const b = bodies[i], dx = x - b.x, dy = y - b.y, rr = b.r * b.scale + 6;
    if (dx * dx + dy * dy <= rr * rr) return i;
  }
  return -1;
}

export function totalSpeed(bodies: readonly BubbleBody[]) {
  'worklet';
  let s = 0;
  for (let i = 0; i < bodies.length; i++) s += Math.abs(bodies[i].vx) + Math.abs(bodies[i].vy);
  return s;
}

function substep(bodies: BubbleBody[], h: number, bounds: BubbleBounds, pointer: BubblePointer, opts: PhysicsOptions) {
  'worklet';
  const cx = (bounds.left + bounds.right) / 2, cy = (bounds.top + bounds.bottom) / 2;
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    let ax = 0, ay = 0;
    if (b.grabbed) {
      // Grab joint: a stiff damped spring to the finger. Fling velocity comes
      // for free because the spring is still catching up when you let go.
      ax = GRAB_SPRING.k * (pointer.x - b.x) - GRAB_SPRING.c * b.vx;
      ay = GRAB_SPRING.k * (pointer.y - b.y) - GRAB_SPRING.c * b.vy;
    } else if (opts.gravity > 0) {
      const dx = cx - b.x, dy = cy - b.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d > 2) { ax = (opts.gravity * dx) / d; ay = (opts.gravity * dy) / d; }
    }
    b.vx += ax * h; b.vy += ay * h;
    const f = Math.exp(-opts.drag * h);
    b.vx *= f; b.vy *= f;
    const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    if (speed > opts.maxSpeed) { b.vx = (b.vx / speed) * opts.maxSpeed; b.vy = (b.vy / speed) * opts.maxSpeed; }
    b.x += b.vx * h; b.y += b.vy * h;
    // Radius breathes toward selected/resting size.
    const targetR = b.baseR * (b.selected ? SELECTED_GROWTH : 1);
    b.rv += (RADIUS_SPRING.k * (targetR - b.r) - RADIUS_SPRING.c * b.rv) * h;
    b.r = Math.max(4, b.r + b.rv * h);
    // Pop spring relaxes to 1; selection toggles kick scaleV from outside.
    b.scaleV += (SCALE_SPRING.k * (1 - b.scale) - SCALE_SPRING.c * b.scaleV) * h;
    b.scale += b.scaleV * h;
    // Impact wobble rings down.
    b.wobV += (-WOBBLE_SPRING.k * b.wob - WOBBLE_SPRING.c * b.wobV) * h;
    b.wob += b.wobV * h;
    if (Math.abs(b.wob) < 0.0004 && Math.abs(b.wobV) < 0.004) { b.wob = 0; b.wobV = 0; }
  }
  // Circle-circle collisions: positional correction plus an impulse with
  // restitution. Grabbed bubbles push harder, as if heavier.
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i], b = bodies[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const min = a.r + b.r;
      const d2 = dx * dx + dy * dy;
      if (d2 >= min * min || d2 < 1e-6) continue;
      const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
      const ma = a.r * a.r, mb = b.r * b.r;
      const ima = (1 / ma) * (a.grabbed ? 0.15 : 1), imb = (1 / mb) * (b.grabbed ? 0.15 : 1);
      const corr = ((min - d) / (ima + imb)) * 0.8;
      a.x -= nx * corr * ima; a.y -= ny * corr * ima;
      b.x += nx * corr * imb; b.y += ny * corr * imb;
      const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (vn < 0) {
        const jimp = (-(1 + opts.restitution) * vn) / (ima + imb);
        a.vx -= nx * jimp * ima; a.vy -= ny * jimp * ima;
        b.vx += nx * jimp * imb; b.vy += ny * jimp * imb;
        const kick = clamp(Math.abs(vn) * IMPACT_WOBBLE, 0, MAX_WOBBLE * 2);
        a.wobV += kick; b.wobV += kick;
      }
    }
  }
  // Walls: clamp inside, bounce, wobble on a hard hit.
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i], e = opts.restitution;
    if (b.x < bounds.left + b.r) { b.x = bounds.left + b.r; if (b.vx < 0) { b.wobV += clamp(-b.vx * IMPACT_WOBBLE, 0, MAX_WOBBLE * 2); b.vx = -b.vx * e; } }
    if (b.x > bounds.right - b.r) { b.x = bounds.right - b.r; if (b.vx > 0) { b.wobV += clamp(b.vx * IMPACT_WOBBLE, 0, MAX_WOBBLE * 2); b.vx = -b.vx * e; } }
    if (b.y < bounds.top + b.r) { b.y = bounds.top + b.r; if (b.vy < 0) { b.wobV += clamp(-b.vy * IMPACT_WOBBLE, 0, MAX_WOBBLE * 2); b.vy = -b.vy * e; } }
    if (b.y > bounds.bottom - b.r) { b.y = bounds.bottom - b.r; if (b.vy > 0) { b.wobV += clamp(b.vy * IMPACT_WOBBLE, 0, MAX_WOBBLE * 2); b.vy = -b.vy * e; } }
  }
}

// Advance the field by dtMs milliseconds with fixed 120 Hz substeps so fast
// flings stay stable. Returns a fresh array (shared-value friendly).
export function stepBodies(prev: readonly BubbleBody[], dtMs: number, bounds: BubbleBounds, pointer: BubblePointer, opts: PhysicsOptions): BubbleBody[] {
  'worklet';
  const bodies = prev.map(b => ({ ...b }));
  const dt = clamp(dtMs, 0, 48) / 1000;
  if (dt <= 0) return bodies;
  const steps = Math.max(1, Math.ceil(dt * 120));
  const h = dt / steps;
  for (let s = 0; s < steps; s++) substep(bodies, h, bounds, pointer, opts);
  return bodies;
}

// Selection pop: kick the scale spring so the bubble overshoots once.
export function popKick(selected: number) {
  'worklet';
  return selected ? 2.6 : -1.8;
}

// Wobble renders as a skewed squash: scaleX/scaleY oscillate out of phase.
export function wobbleScale(wob: number) {
  'worklet';
  const w = clamp(wob, -MAX_WOBBLE, MAX_WOBBLE);
  return { scaleX: 1 + w, scaleY: 1 - w };
}

export function hexToRgb(hex: string): [number, number, number] {
  'worklet';
  let h = hex.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h.length === 6 ? h : '888888', 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// f > 0 lightens toward white, f < 0 darkens toward black.
export function shade(hex: string, f: number) {
  'worklet';
  const [r, g, b] = hexToRgb(hex);
  const t = f > 0 ? 255 : 0, p = Math.min(1, Math.abs(f));
  const c = (v: number) => Math.round(clamp(v + (t - v) * p, 0, 255));
  return `rgb(${c(r)}, ${c(g)}, ${c(b)})`;
}
