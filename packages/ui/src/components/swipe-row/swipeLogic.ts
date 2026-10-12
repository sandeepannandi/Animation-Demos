// MIT License. Copyright (c) 2026 Sandeepan Nandi. Keep the accompanying LICENSE.
// Pure gesture math for SwipeRow. No React, no platform imports, so the native component
// and the web preview use exactly the same rules.
export type SwipeSide = 'leading' | 'trailing';
export interface SwipeGeometry {
  rowWidth: number;
  leadingWidth: number;
  trailingWidth: number;
  /** A full swipe on this side commits its outermost action. */
  leadingFull: boolean;
  trailingFull: boolean;
}
export type SwipeOutcome = { type: 'close' } | { type: 'open'; side: SwipeSide } | { type: 'commit'; side: SwipeSide };

export const ACTION_WIDTH = 76;
/** A drag past this share of the row width commits a full swipe... */
export const FULL_SWIPE_RATIO = 0.5;
/** ...but on wide rows never needs more than this many px beyond the revealed actions. */
export const FULL_SWIPE_MAX_EXTRA = 140;
/** Fling speed (px/ms) that commits once the actions are fully revealed. */
export const COMMIT_VELOCITY = 1.1;
/** Fling speed (px/ms) toward the edge that is enough to snap open or closed. */
export const FLICK_VELOCITY = 0.3;
/** How far ahead (ms) the release velocity is projected when choosing where to settle. */
export const PROJECT_MS = 120;
/** Horizontal travel (px) before the row claims the touch. */
export const CAPTURE_SLOP = 8;

const finite = (value: number) => (Number.isFinite(value) ? value : 0);

/** Classic resistance curve: grows with distance but never passes `dimension`. */
export function rubberBand(distance: number, dimension: number, coefficient = 0.55) {
  const d = Math.max(0, finite(distance));
  const size = Math.max(1, finite(dimension));
  return (1 - 1 / ((d * coefficient) / size + 1)) * size;
}

export function sideWidth(side: SwipeSide, g: SwipeGeometry) {
  return side === 'leading' ? g.leadingWidth : g.trailingWidth;
}
export function sideIsFull(side: SwipeSide, g: SwipeGeometry) {
  return side === 'leading' ? g.leadingFull && g.leadingWidth > 0 : g.trailingFull && g.trailingWidth > 0;
}
/** Which side an offset belongs to. Positive offsets reveal leading actions. */
export function sideOf(offset: number): SwipeSide | null {
  return offset > 0 ? 'leading' : offset < 0 ? 'trailing' : null;
}
/** Offset (px, absolute) where letting go commits the full-swipe action. */
export function commitThreshold(side: SwipeSide, g: SwipeGeometry) {
  const width = sideWidth(side, g);
  return Math.max(width + 40, Math.min(g.rowWidth * FULL_SWIPE_RATIO, width + FULL_SWIPE_MAX_EXTRA));
}
/** Signed resting offset for a side that is fully open. */
export function openOffset(side: SwipeSide, g: SwipeGeometry) {
  return side === 'leading' ? g.leadingWidth : -g.trailingWidth;
}

/**
 * Where the row sits for a finger that started at `start` and moved `dx`.
 * Follows the finger one to one while the actions are being revealed. Past them, a side
 * with a full-swipe action keeps moving with light resistance toward the commit point;
 * a side without one, or without any actions, is rubber-banded.
 */
export function dragOffset(start: number, dx: number, g: SwipeGeometry) {
  const raw = finite(start) + finite(dx);
  const side = sideOf(raw);
  if (!side) return 0;
  const sign = side === 'leading' ? 1 : -1;
  const distance = Math.abs(raw);
  const width = sideWidth(side, g);
  const rowWidth = Math.max(1, g.rowWidth);
  if (width <= 0) return sign * rubberBand(distance, rowWidth * 0.25);
  if (distance <= width) return raw;
  const over = distance - width;
  if (sideIsFull(side, g)) return sign * Math.min(rowWidth, width + over * 0.85);
  return sign * (width + rubberBand(over, rowWidth * 0.2));
}

/** True when the current offset is far enough that releasing would commit the full swipe. */
export function pastCommit(offset: number, g: SwipeGeometry) {
  const side = sideOf(offset);
  if (!side || !sideIsFull(side, g)) return false;
  return Math.abs(offset) >= commitThreshold(side, g);
}

/** Decide what happens on release. `velocity` is the horizontal finger speed in px/ms (right is positive). */
export function settleOutcome(offset: number, velocity: number, g: SwipeGeometry): SwipeOutcome {
  const side = sideOf(offset);
  if (!side) return { type: 'close' };
  const width = sideWidth(side, g);
  if (width <= 0) return { type: 'close' };
  const toward = (side === 'leading' ? 1 : -1) * finite(velocity); // positive: still moving outward
  const distance = Math.abs(offset);
  if (sideIsFull(side, g)) {
    if (distance >= commitThreshold(side, g)) return { type: 'commit', side };
    if (distance > width && toward >= COMMIT_VELOCITY) return { type: 'commit', side };
  }
  if (toward <= -FLICK_VELOCITY) return { type: 'close' };
  if (toward >= FLICK_VELOCITY && distance > width * 0.2) return { type: 'open', side };
  return distance + toward * PROJECT_MS >= width * 0.5 ? { type: 'open', side } : { type: 'close' };
}

/** True when the movement is a deliberate horizontal swipe rather than a vertical scroll. */
export function isHorizontalIntent(dx: number, dy: number) {
  const x = Math.abs(finite(dx));
  return x > CAPTURE_SLOP && x > Math.abs(finite(dy)) * 1.5;
}

/** The action a full swipe commits: the one nearest the screen edge on that side. */
export function outermostIndex(side: SwipeSide, count: number) {
  return side === 'leading' ? 0 : count - 1;
    }
