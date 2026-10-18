export type PendulumPointer = { x: number; y: number; active: number };

export type PendulumConfig = {
  originX: number;
  originY: number;
  pixelsPerMeter: number;
};

export type PendulumPhysics = {
  gravity: number;
  m1: number;
  m2: number;
  l1: number;
  l2: number;
  drag: number;
};

export type PendulumState = {
  th1: number;
  th2: number;
  w1: number;
  w2: number;
  time: number;
  acc: number;
  stepIndex: number;
  grabbed: number;
  hx: number;
  hy: number;
  trail1: Float32Array;
  trail2: Float32Array;
  head: number;
  count: number;
};

export const PENDULUM_DEFAULTS = {
  gravity: 9.81,
  m1: 1,
  m2: 1,
  l1: 1,
  l2: 1,
  drag: 0,
  fixedDt: 1 / 960,
  sampleEvery: 8,
  trailLength: 480,
  grabRate: 20,
  velocitySmoothing: 0.03,
  maxOmega: 32,
  startTh1: 2.1,
  startTh2: 2.6,
};

export type PendulumOptions = typeof PENDULUM_DEFAULTS;

export function createPendulum(opts: PendulumOptions): PendulumState {
  "worklet";
  return {
    th1: opts.startTh1,
    th2: opts.startTh2,
    w1: 0,
    w2: 0,
    time: 0,
    acc: 0,
    stepIndex: 0,
    grabbed: 0,
    hx: 0,
    hy: 0,
    trail1: new Float32Array(opts.trailLength * 2),
    trail2: new Float32Array(opts.trailLength * 2),
    head: 0,
    count: 0,
  };
}

export function restPendulum(s: PendulumState, th1: number, th2: number) {
  "worklet";
  s.th1 = th1;
  s.th2 = th2;
  s.w1 = 0;
  s.w2 = 0;
  s.time = 0;
  s.acc = 0;
  s.stepIndex = 0;
  s.grabbed = 0;
  s.head = 0;
  s.count = 0;
}

export function pendulumAccel(
  th1: number,
  th2: number,
  w1: number,
  w2: number,
  p: PendulumPhysics,
  out: number[],
) {
  "worklet";
  const d = th1 - th2;
  const sd = Math.sin(d);
  const cd = Math.cos(d);
  const den = 2 * p.m1 + p.m2 - p.m2 * Math.cos(2 * d);
  const a1 =
    (-p.gravity * (2 * p.m1 + p.m2) * Math.sin(th1) -
      p.m2 * p.gravity * Math.sin(th1 - 2 * th2) -
      2 * sd * p.m2 * (w2 * w2 * p.l2 + w1 * w1 * p.l1 * cd)) /
    (p.l1 * den);
  const a2 =
    (2 *
      sd *
      (w1 * w1 * p.l1 * (p.m1 + p.m2) +
        p.gravity * (p.m1 + p.m2) * Math.cos(th1) +
        w2 * w2 * p.l2 * p.m2 * cd)) /
    (p.l2 * den);
  out[0] = a1 - p.drag * w1;
  out[1] = a2 - p.drag * w2;
}

export function rk4Step(s: PendulumState, dt: number, p: PendulumPhysics) {
  "worklet";
  const a = [0, 0];
  pendulumAccel(s.th1, s.th2, s.w1, s.w2, p, a);
  const k1t1 = s.w1, k1t2 = s.w2, k1w1 = a[0], k1w2 = a[1];
  const h = dt / 2;
  pendulumAccel(s.th1 + h * k1t1, s.th2 + h * k1t2, s.w1 + h * k1w1, s.w2 + h * k1w2, p, a);
  const k2t1 = s.w1 + h * k1w1, k2t2 = s.w2 + h * k1w2, k2w1 = a[0], k2w2 = a[1];
  pendulumAccel(s.th1 + h * k2t1, s.th2 + h * k2t2, s.w1 + h * k2w1, s.w2 + h * k2w2, p, a);
  const k3t1 = s.w1 + h * k2w1, k3t2 = s.w2 + h * k2w2, k3w1 = a[0], k3w2 = a[1];
  pendulumAccel(s.th1 + dt * k3t1, s.th2 + dt * k3t2, s.w1 + dt * k3w1, s.w2 + dt * k3w2, p, a);
  const k4t1 = s.w1 + dt * k3w1, k4t2 = s.w2 + dt * k3w2, k4w1 = a[0], k4w2 = a[1];
  s.th1 += (dt / 6) * (k1t1 + 2 * k2t1 + 2 * k3t1 + k4t1);
  s.th2 += (dt / 6) * (k1t2 + 2 * k2t2 + 2 * k3t2 + k4t2);
  s.w1 += (dt / 6) * (k1w1 + 2 * k2w1 + 2 * k3w1 + k4w1);
  s.w2 += (dt / 6) * (k1w2 + 2 * k2w2 + 2 * k3w2 + k4w2);
}

export function pendulumEnergy(th1: number, th2: number, w1: number, w2: number, p: PendulumPhysics) {
  "worklet";
  const kinetic =
    0.5 * (p.m1 + p.m2) * p.l1 * p.l1 * w1 * w1 +
    0.5 * p.m2 * p.l2 * p.l2 * w2 * w2 +
    p.m2 * p.l1 * p.l2 * w1 * w2 * Math.cos(th1 - th2);
  const potential = -(p.m1 + p.m2) * p.gravity * p.l1 * Math.cos(th1) - p.m2 * p.gravity * p.l2 * Math.cos(th2);
  return kinetic + potential;
}

export function energyScale(p: PendulumPhysics) {
  "worklet";
  return (p.m1 + p.m2) * p.gravity * p.l1 + p.m2 * p.gravity * p.l2;
}

export function bobPositions(s: PendulumState, cfg: PendulumConfig, p: PendulumPhysics, out: number[]) {
  "worklet";
  const sc = cfg.pixelsPerMeter;
  const x1 = cfg.originX + sc * p.l1 * Math.sin(s.th1);
  const y1 = cfg.originY + sc * p.l1 * Math.cos(s.th1);
  out[0] = x1;
  out[1] = y1;
  out[2] = x1 + sc * p.l2 * Math.sin(s.th2);
  out[3] = y1 + sc * p.l2 * Math.cos(s.th2);
}

function wrapAngle(a: number) {
  "worklet";
  const t = Math.PI * 2;
  return a - t * Math.floor((a + Math.PI) / t);
}

export function trailIndex(s: PendulumState, trailLength: number, age: number) {
  "worklet";
  if (age >= s.count) return -1;
  return (s.head - 1 - age + trailLength) % trailLength;
}

function pushTrail(s: PendulumState, cfg: PendulumConfig, p: PendulumPhysics, trailLength: number, pos: number[]) {
  "worklet";
  bobPositions(s, cfg, p, pos);
  const i = s.head * 2;
  s.trail1[i] = pos[0];
  s.trail1[i + 1] = pos[1];
  s.trail2[i] = pos[2];
  s.trail2[i + 1] = pos[3];
  s.head = (s.head + 1) % trailLength;
  if (s.count < trailLength) s.count += 1;
}

function followHand(s: PendulumState, p: PendulumPhysics, dt: number, opts: PendulumOptions) {
  "worklet";
  const ease = 1 - Math.exp(-opts.grabRate * dt);
  const reachMax = p.l1 + p.l2 - 0.002;
  const reachMin = Math.abs(p.l1 - p.l2) + 0.002;
  let tx = s.hx;
  let ty = s.hy;
  const dist = Math.hypot(tx, ty);
  if (dist > reachMax || dist < reachMin) {
    const f = (dist > reachMax ? reachMax : reachMin) / (dist || 1);
    tx = dist === 0 ? 0 : tx * f;
    ty = dist === 0 ? reachMin : ty * f;
  }
  const bx = p.l1 * Math.sin(s.th1) + p.l2 * Math.sin(s.th2);
  const by = p.l1 * Math.cos(s.th1) + p.l2 * Math.cos(s.th2);
  const nx = bx + (tx - bx) * ease;
  const ny = by + (ty - by) * ease;
  const d = Math.min(reachMax, Math.max(reachMin, Math.hypot(nx, ny)));
  const phi = Math.atan2(nx, ny);
  const cosA = Math.max(-1, Math.min(1, (p.l1 * p.l1 + d * d - p.l2 * p.l2) / (2 * p.l1 * d)));
  const alpha = Math.acos(cosA);
  const c1 = phi + alpha;
  const c2 = phi - alpha;
  const pick = Math.abs(wrapAngle(c1 - s.th1)) <= Math.abs(wrapAngle(c2 - s.th1)) ? c1 : c2;
  const th1 = s.th1 + wrapAngle(pick - s.th1);
  const ex = nx * (d / (Math.hypot(nx, ny) || 1)) - p.l1 * Math.sin(th1);
  const ey = ny * (d / (Math.hypot(nx, ny) || 1)) - p.l1 * Math.cos(th1);
  const th2 = s.th2 + wrapAngle(Math.atan2(ex, ey) - s.th2);
  const blend = 1 - Math.exp(-dt / opts.velocitySmoothing);
  s.w1 += ((th1 - s.th1) / dt - s.w1) * blend;
  s.w2 += ((th2 - s.th2) / dt - s.w2) * blend;
  s.th1 = th1;
  s.th2 = th2;
}

export function stepPendulumFixed(
  s: PendulumState,
  cfg: PendulumConfig,
  dtFrame: number,
  pointer: PendulumPointer,
  opts: PendulumOptions,
) {
  "worklet";
  if (pointer.active) {
    s.hx = (pointer.x - cfg.originX) / cfg.pixelsPerMeter;
    s.hy = (pointer.y - cfg.originY) / cfg.pixelsPerMeter;
    if (!s.grabbed) {
      s.grabbed = 1;
      s.w1 = 0;
      s.w2 = 0;
    }
  } else if (s.grabbed) {
    s.grabbed = 0;
    s.w1 = Math.max(-opts.maxOmega, Math.min(opts.maxOmega, s.w1));
    s.w2 = Math.max(-opts.maxOmega, Math.min(opts.maxOmega, s.w2));
  }
  s.acc += Math.min(dtFrame, 0.05);
  const dt = opts.fixedDt;
  const pos = [0, 0, 0, 0];
  while (s.acc >= dt) {
    if (s.grabbed) followHand(s, opts, dt, opts);
    else rk4Step(s, dt, opts);
    s.acc -= dt;
    s.time += dt;
    s.stepIndex += 1;
    if (s.stepIndex % opts.sampleEvery === 0) pushTrail(s, cfg, opts, opts.trailLength, pos);
  }
}
