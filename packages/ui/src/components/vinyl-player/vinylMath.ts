// Pure turntable physics: platter spin with real inertia, a sprung tonearm
// pivot, and the start/stop sequencing of a real deck. Every function is a
// worklet so the math can run anywhere; plain JS (tests, web preview)
// ignores the tag. No randomness: tests, native and web all agree.

export type VinylState = {
  speed: number;   // platter speed, revolutions per second
  angle: number;   // platter rotation, degrees (unbounded)
  arm: number;     // tonearm angle, absolute degrees on the canvas (y down)
  armVel: number;  // tonearm angular velocity, degrees per second
};

export type VinylOptions = {
  rpm: number;        // target platter speed (33 1/3 by default)
  spinTauMs: number;  // platter inertia time constant (heavy platter = slow spin-up)
  armOmega: number;   // tonearm spring natural frequency, rad/s
  armZeta: number;    // tonearm damping ratio (<1 = a little overshoot on the drop)
  wow: number;        // speed wobble depth as a fraction (0 = off)
  armParkDeg: number; // tonearm angle resting on its post
  armPlayDeg: number; // tonearm angle with the needle in the lead-in groove
};

export const DEFAULT_VINYL: Omit<VinylOptions, 'armParkDeg' | 'armPlayDeg'> = {
  rpm: 33 + 1 / 3,
  spinTauMs: 1100,
  armOmega: 5.2,
  armZeta: 0.62,
  wow: 0.004,
};

// Absolute tonearm angles for a deck layout: pivot at (px, py), platter
// center (cx, cy) radius r. The needle drops on the outer groove on the
// upper-right of the platter; parked it swings ~30 deg further out onto its
// rest post. Both renderers call this so geometry and physics never disagree.
export function armAngles(px: number, py: number, cx: number, cy: number, r: number): { park: number; play: number; len: number } {
  'worklet';
  const drop = { x: cx + r * 0.92 * Math.cos(-0.44), y: cy + r * 0.92 * Math.sin(-0.44) };
  const play = (Math.atan2(drop.y - py, drop.x - px) * 180) / Math.PI;
  const len = Math.hypot(drop.x - px, drop.y - py);
  return { park: play + 30, play, len };
}

export function makeVinyl(armParkDeg: number): VinylState {
  'worklet';
  return { speed: 0, angle: 0, arm: armParkDeg, armVel: 0 };
}

// True while anything is still moving (the clock can skip publishing when false).
export function vinylActive(s: VinylState, playing: boolean, opts: VinylOptions): boolean {
  'worklet';
  const armTarget = playing ? opts.armPlayDeg : opts.armParkDeg;
  return s.speed > 0.0005 || playing || Math.abs(s.arm - armTarget) > 0.02 || Math.abs(s.armVel) > 0.5;
}

export type VinylStep = { state: VinylState; active: boolean; spinUp: number };

// One tick. Start: the arm swings in first; the platter only gets power once
// the needle is nearly down. Stop: power cuts immediately (the classic drag
// to a halt) while the arm lifts and parks itself. Each direction falls out
// of one coupling, no explicit phase machine.
export function stepVinyl(s: VinylState, playing: boolean, dtMs: number, opts: VinylOptions, reduced: boolean): VinylStep {
  'worklet';
  const dt = Math.min(dtMs, 100) / 1000;
  const fullSpeed = opts.rpm / 60; // revolutions per second
  if (reduced) {
    const target = playing ? fullSpeed : 0;
    const state: VinylState = {
      speed: target,
      angle: s.angle + target * 360 * dt,
      arm: playing ? opts.armPlayDeg : opts.armParkDeg,
      armVel: 0,
    };
    return { state, active: false, spinUp: playing ? 1 : 0 };
  }

  // Tonearm spring (damped, a whisper of overshoot when the needle drops).
  const armTarget = playing ? opts.armPlayDeg : opts.armParkDeg;
  const acc = opts.armOmega * opts.armOmega * (armTarget - s.arm) - 2 * opts.armZeta * opts.armOmega * s.armVel;
  let armVel = s.armVel + acc * dt;
  let arm = s.arm + armVel * dt;
  // Snap to rest so a settled arm does not micro-jitter forever.
  if (Math.abs(arm - armTarget) < 0.02 && Math.abs(armVel) < 0.5) {
    arm = armTarget;
    armVel = 0;
  }

  // Platter power: on start gated by the arm being nearly down; on stop, cut.
  const targetSpeed = playing && Math.abs(arm - opts.armPlayDeg) < 3 ? fullSpeed : 0;
  const k = 1 - Math.exp(-dtMs / opts.spinTauMs);
  let speed = s.speed + (targetSpeed - s.speed) * k;
  if (targetSpeed === 0 && Math.abs(speed) < 0.0005) speed = 0;

  // Wow: a tiny speed wobble once per revolution, like a real belt drive.
  const wobble = opts.wow > 0 && speed > 0 ? 1 + opts.wow * Math.sin((s.angle * Math.PI) / 180) : 1;
  const angle = s.angle + speed * 360 * dt * wobble;

  const spinUp = fullSpeed > 0 ? Math.min(1, speed / fullSpeed) : 0;
  const state: VinylState = { speed, angle, arm, armVel };
  return { state, active: vinylActive(state, playing, opts), spinUp };
}

// Tonearm tip (needle) position. Both renderers draw through this so the
// needle lands in the groove on every platform.
export function armTip(px: number, py: number, len: number, aDeg: number): { x: number; y: number } {
  'worklet';
  const a = (aDeg * Math.PI) / 180;
  return { x: px + Math.cos(a) * len, y: py + Math.sin(a) * len };
}
