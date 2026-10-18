export type CoinPointer = { x: number; y: number; active: number };

export const COIN_DEFAULTS = {
  radius: 1,
  halfThickness: 0.1,
  mass: 1,
  fixedDt: 1 / 480,
  damping: 0.2,
  grabStiffness: 46,
  grabDamping: 7,
  maxForce: 60,
  maxOmega: 26,
  velocitySmoothing: 0.35,
  startOmega1: 1.1,
  startOmega2: 0.45,
  startOmega3: 5.2,
  startTilt: 0.5,
};

export type CoinOptions = typeof COIN_DEFAULTS;

export type CoinState = {
  qw: number;
  qx: number;
  qy: number;
  qz: number;
  w1: number;
  w2: number;
  w3: number;
  time: number;
  acc: number;
  grabbed: number;
  gx: number;
  gy: number;
  gz: number;
  tx: number;
  ty: number;
  vx: number;
  vy: number;
};

export function coinInertia(opts: CoinOptions) {
  "worklet";
  const r2 = opts.radius * opts.radius;
  const h = opts.halfThickness * 2;
  return {
    transverse: opts.mass * (r2 / 4 + (h * h) / 12),
    axial: (opts.mass * r2) / 2,
  };
}

export function createCoin(opts: CoinOptions): CoinState {
  "worklet";
  const half = opts.startTilt / 2;
  return {
    qw: Math.cos(half),
    qx: Math.sin(half),
    qy: 0,
    qz: 0,
    w1: opts.startOmega1,
    w2: opts.startOmega2,
    w3: opts.startOmega3,
    time: 0,
    acc: 0,
    grabbed: 0,
    gx: 0,
    gy: 0,
    gz: 0,
    tx: 0,
    ty: 0,
    vx: 0,
    vy: 0,
  };
}

export function restCoin(s: CoinState, tilt: number) {
  "worklet";
  const half = tilt / 2;
  s.qw = Math.cos(half);
  s.qx = Math.sin(half);
  s.qy = Math.sin(half) * 0.4;
  s.qz = 0;
  const n = Math.sqrt(s.qw * s.qw + s.qx * s.qx + s.qy * s.qy + s.qz * s.qz);
  s.qw /= n;
  s.qx /= n;
  s.qy /= n;
  s.w1 = 0;
  s.w2 = 0;
  s.w3 = 0;
  s.grabbed = 0;
}

export function rotate(q: { qw: number; qx: number; qy: number; qz: number }, x: number, y: number, z: number, out: number[]) {
  "worklet";
  const { qw, qx, qy, qz } = q;
  const tx = 2 * (qy * z - qz * y);
  const ty = 2 * (qz * x - qx * z);
  const tz = 2 * (qx * y - qy * x);
  out[0] = x + qw * tx + (qy * tz - qz * ty);
  out[1] = y + qw * ty + (qz * tx - qx * tz);
  out[2] = z + qw * tz + (qx * ty - qy * tx);
}

export function rotateInverse(q: { qw: number; qx: number; qy: number; qz: number }, x: number, y: number, z: number, out: number[]) {
  "worklet";
  rotate({ qw: q.qw, qx: -q.qx, qy: -q.qy, qz: -q.qz }, x, y, z, out);
}

export function coinAxes(s: CoinState, out: number[]) {
  "worklet";
  const v = [0, 0, 0];
  rotate(s, 1, 0, 0, v);
  out[0] = v[0];
  out[1] = v[1];
  out[2] = v[2];
  rotate(s, 0, 1, 0, v);
  out[3] = v[0];
  out[4] = v[1];
  out[5] = v[2];
  rotate(s, 0, 0, 1, v);
  out[6] = v[0];
  out[7] = v[1];
  out[8] = v[2];
}

export function kineticEnergy(s: CoinState, opts: CoinOptions) {
  "worklet";
  const { transverse, axial } = coinInertia(opts);
  return 0.5 * (transverse * (s.w1 * s.w1 + s.w2 * s.w2) + axial * s.w3 * s.w3);
}

export function angularMomentumBody(s: CoinState, opts: CoinOptions, out: number[]) {
  "worklet";
  const { transverse, axial } = coinInertia(opts);
  out[0] = transverse * s.w1;
  out[1] = transverse * s.w2;
  out[2] = axial * s.w3;
}

export function angularMomentumWorld(s: CoinState, opts: CoinOptions, out: number[]) {
  "worklet";
  const b = [0, 0, 0];
  angularMomentumBody(s, opts, b);
  rotate(s, b[0], b[1], b[2], out);
}

function derivative(y: number[], t1: number, t2: number, t3: number, i1: number, i3: number, out: number[]) {
  "worklet";
  const w1 = y[0];
  const w2 = y[1];
  const w3 = y[2];
  const qw = y[3];
  const qx = y[4];
  const qy = y[5];
  const qz = y[6];
  out[0] = ((i1 - i3) * w2 * w3 + t1) / i1;
  out[1] = ((i3 - i1) * w3 * w1 + t2) / i1;
  out[2] = t3 / i3;
  out[3] = 0.5 * (-qx * w1 - qy * w2 - qz * w3);
  out[4] = 0.5 * (qw * w1 + qy * w3 - qz * w2);
  out[5] = 0.5 * (qw * w2 + qz * w1 - qx * w3);
  out[6] = 0.5 * (qw * w3 + qx * w2 - qy * w1);
}

export function rk4Step(s: CoinState, dt: number, t1: number, t2: number, t3: number, opts: CoinOptions) {
  "worklet";
  const { transverse, axial } = coinInertia(opts);
  const y0 = [s.w1, s.w2, s.w3, s.qw, s.qx, s.qy, s.qz];
  const k1 = [0, 0, 0, 0, 0, 0, 0];
  const k2 = [0, 0, 0, 0, 0, 0, 0];
  const k3 = [0, 0, 0, 0, 0, 0, 0];
  const k4 = [0, 0, 0, 0, 0, 0, 0];
  const tmp = [0, 0, 0, 0, 0, 0, 0];
  derivative(y0, t1, t2, t3, transverse, axial, k1);
  for (let i = 0; i < 7; i++) tmp[i] = y0[i] + 0.5 * dt * k1[i];
  derivative(tmp, t1, t2, t3, transverse, axial, k2);
  for (let i = 0; i < 7; i++) tmp[i] = y0[i] + 0.5 * dt * k2[i];
  derivative(tmp, t1, t2, t3, transverse, axial, k3);
  for (let i = 0; i < 7; i++) tmp[i] = y0[i] + dt * k3[i];
  derivative(tmp, t1, t2, t3, transverse, axial, k4);
  const y = [0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 7; i++) y[i] = y0[i] + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
  const n = Math.sqrt(y[3] * y[3] + y[4] * y[4] + y[5] * y[5] + y[6] * y[6]);
  s.w1 = y[0];
  s.w2 = y[1];
  s.w3 = y[2];
  s.qw = y[3] / n;
  s.qx = y[4] / n;
  s.qy = y[5] / n;
  s.qz = y[6] / n;
  s.time += dt;
}

export function grabCoin(s: CoinState, x: number, y: number, opts: CoinOptions) {
  "worklet";
  const n = [0, 0, 0];
  rotate(s, 0, 0, 1, n);
  let z = 0;
  if (Math.abs(n[2]) > 0.15) z = -(n[0] * x + n[1] * y) / n[2];
  let px = x;
  let py = y;
  const len = Math.sqrt(px * px + py * py + z * z);
  const limit = opts.radius;
  if (len > limit) {
    px = (px * limit) / len;
    py = (py * limit) / len;
    z = (z * limit) / len;
  }
  const b = [0, 0, 0];
  rotateInverse(s, px, py, z, b);
  const side = n[2] >= 0 ? 1 : -1;
  s.gx = b[0];
  s.gy = b[1];
  s.gz = side * opts.halfThickness;
  s.grabbed = 1;
  s.tx = x;
  s.ty = y;
  s.vx = 0;
  s.vy = 0;
}

function gripTorque(s: CoinState, opts: CoinOptions, out: number[]) {
  "worklet";
  const rw = [0, 0, 0];
  rotate(s, s.gx, s.gy, s.gz, rw);
  const wb = [s.w1, s.w2, s.w3];
  const ww = [0, 0, 0];
  rotate(s, wb[0], wb[1], wb[2], ww);
  const vcx = ww[1] * rw[2] - ww[2] * rw[1];
  const vcy = ww[2] * rw[0] - ww[0] * rw[2];
  let fx = opts.grabStiffness * (s.tx - rw[0]) + opts.grabDamping * (s.vx - vcx);
  let fy = opts.grabStiffness * (s.ty - rw[1]) + opts.grabDamping * (s.vy - vcy);
  const f = Math.sqrt(fx * fx + fy * fy);
  if (f > opts.maxForce) {
    fx = (fx * opts.maxForce) / f;
    fy = (fy * opts.maxForce) / f;
  }
  const tw = [rw[1] * 0 - rw[2] * fy, rw[2] * fx - rw[0] * 0, rw[0] * fy - rw[1] * fx];
  rotateInverse(s, tw[0], tw[1], tw[2], out);
}

export function stepCoinFixed(s: CoinState, dt: number, pointer: CoinPointer, opts: CoinOptions) {
  "worklet";
  const frame = Math.min(0.05, Math.max(0, dt));
  if (pointer.active) {
    if (!s.grabbed) grabCoin(s, pointer.x, pointer.y, opts);
    else if (frame > 0) {
      const a = opts.velocitySmoothing;
      s.vx += ((pointer.x - s.tx) / frame - s.vx) * a;
      s.vy += ((pointer.y - s.ty) / frame - s.vy) * a;
      s.tx = pointer.x;
      s.ty = pointer.y;
    }
  } else if (s.grabbed) {
    s.grabbed = 0;
  }
  const { transverse, axial } = coinInertia(opts);
  s.acc += frame;
  const h = opts.fixedDt;
  const torque = [0, 0, 0];
  while (s.acc >= h) {
    torque[0] = 0;
    torque[1] = 0;
    torque[2] = 0;
    if (s.grabbed) gripTorque(s, opts, torque);
    torque[0] -= opts.damping * transverse * s.w1;
    torque[1] -= opts.damping * transverse * s.w2;
    torque[2] -= opts.damping * axial * s.w3;
    rk4Step(s, h, torque[0], torque[1], torque[2], opts);
    const w = Math.sqrt(s.w1 * s.w1 + s.w2 * s.w2 + s.w3 * s.w3);
    if (w > opts.maxOmega) {
      const k = opts.maxOmega / w;
      s.w1 *= k;
      s.w2 *= k;
      s.w3 *= k;
    }
    s.acc -= h;
  }
}
