export const PENDULUM_W = 320;
export const PENDULUM_H = 340;
export const PENDULUM_ORIGIN_X = 160;
export const PENDULUM_ORIGIN_Y = 170;
export const PENDULUM_PX_PER_M = 70;
export const PENDULUM_BACKGROUND = "#0b1020";
export const PENDULUM_ARM = "#c9d1ee";
export const PENDULUM_BOB = "#f6f1e4";
export const BOB_RADIUS = 10;
export const TRAIL_BUCKETS = 12;

export const TRAIL_LAYERS = [
  { width: 9, alpha: 0.14 },
  { width: 4.5, alpha: 0.32 },
  { width: 1.8, alpha: 0.95 },
] as const;

export type TrailSpec = { head: string; tail: string; strength: number };

export const TIP_TRAIL: TrailSpec = { head: "#ffd27a", tail: "#ff4f8b", strength: 1 };
export const ELBOW_TRAIL: TrailSpec = { head: "#8ce8ff", tail: "#5a63ff", strength: 0.7 };

function channel(hex: string, at: number) {
  return parseInt(hex.slice(at, at + 2), 16);
}

export function trailStyle(spec: TrailSpec, bucket: number, buckets: number) {
  const t = bucket / Math.max(1, buckets - 1);
  const mix = (at: number) => Math.round(channel(spec.head, at) + (channel(spec.tail, at) - channel(spec.head, at)) * t);
  const fade = Math.pow(1 - bucket / buckets, 1.5) * spec.strength;
  return { color: `rgb(${mix(1)},${mix(3)},${mix(5)})`, alpha: fade };
}
