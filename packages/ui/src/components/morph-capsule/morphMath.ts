// Nativelet Morph Capsule. MIT: retain the accompanying LICENSE.
// Pure helpers. "progress" is a position along the states: 0 = idle, 1 = compact, 2 = expanded.

export const FLICK_VELOCITY = 0.003; // progress units per ms
const PROJECTION_MS = 120; // how far ahead the finger's momentum is projected
const RESISTANCE = 0.25;

export function clampState(index: number | undefined, count: number) {
  if (count <= 0) return -1;
  if (index === undefined || !Number.isFinite(index)) return 0;
  return Math.max(0, Math.min(count - 1, Math.round(index)));
}

/** A tap steps up one state and wraps back to the first. */
export function cycleState(current: number, count: number) {
  return count > 0 ? (current + 1) % count : -1;
}

/** Move one state up (+1) or down (-1), stopping at the ends. */
export function stepState(current: number, direction: -1 | 1, count: number) {
  return count > 0 ? Math.max(0, Math.min(count - 1, current + direction)) : -1;
}

/** Finger position to progress. Past either end the capsule resists instead of stopping dead. */
export function dragProgress(start: number, delta: number, range: number, count: number) {
  if (count <= 0 || range <= 0 || !Number.isFinite(delta)) return start;
  const raw = start + delta / range;
  const last = count - 1;
  if (raw > last) return last + (raw - last) * RESISTANCE;
  if (raw < 0) return raw * RESISTANCE;
  return raw;
}

/** Picks the state a released capsule settles on. `velocity` is progress units per ms, positive = expanding. */
export function resolveState(progress: number, velocity: number, count: number) {
  if (count <= 0 || !Number.isFinite(progress)) return count > 0 ? 0 : -1;
  const v = Number.isFinite(velocity) ? velocity : 0;
  const pick = (value: number) => Math.max(0, Math.min(count - 1, Math.round(value)));
  const here = pick(progress);
  let target = pick(progress + v * PROJECTION_MS);
  // A flick always moves at least one state in its direction.
  if (v >= FLICK_VELOCITY && target <= here) target = Math.min(count - 1, here + 1);
  if (v <= -FLICK_VELOCITY && target >= here) target = Math.max(0, here - 1);
  return target;
}

/** Crossfade weight for one state's content: 1 near its own position, 0 once the neighbour takes over. */
export function contentOpacity(progress: number, index: number) {
  const distance = Math.abs(progress - index);
  if (distance <= 0.3) return 1;
  if (distance >= 0.7) return 0;
  return (0.7 - distance) / 0.4;
}
