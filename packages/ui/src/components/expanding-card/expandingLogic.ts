// MIT License. Copyright (c) 2026 Sandeepan Nandi. Keep the accompanying LICENSE.
// Pure geometry and gesture rules for ExpandingCard. No React, no platform imports, so the
// native component and the web preview use exactly the same numbers.
export interface Rect { x: number; y: number; width: number; height: number }
export type DismissOutcome = 'close' | 'restore';

/** Drag distance (px) past which letting go closes the card. */
export const DISMISS_DISTANCE = 140;
/** Downward fling speed (px/ms) that closes the card even on a short drag. */
export const DISMISS_VELOCITY = 0.9;
/** Vertical travel (px) before the open card claims the touch. */
export const CAPTURE_SLOP = 6;
/** How far the card shrinks while dragged all the way down (1 = full size, 0.5 = half). */
export const MIN_DRAG_PROGRESS = 0.5;
/** The screen behind the card scales to this when the card is fully open. */
export const BACKGROUND_SCALE = 0.93;
/** Opacity of the dim layer over the background when the card is fully open. */
export const DIM_OPACITY = 0.45;
/** Delay (ms) between one content block entering and the next. */
export const STAGGER_MS = 70;
/** Wait (ms) after opening starts before the first block enters. */
export const ENTER_DELAY_MS = 170;

const finite = (value: number, fallback = 0) => (Number.isFinite(value) ? value : fallback);
export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, finite(value, min)));
export const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

/** Rect between the measured card (p = 0) and the full host (p = 1). */
export function lerpRect(from: Rect, to: Rect, p: number): Rect {
  const t = clamp(p, 0, 1);
  return { x: lerp(from.x, to.x, t), y: lerp(from.y, to.y, t), width: lerp(from.width, to.width, t), height: lerp(from.height, to.height, t) };
}

/** Expanded progress while the user drags the open card down. 1 at rest, falls toward MIN_DRAG_PROGRESS. */
export function dragToProgress(dy: number, hostHeight: number) {
  const travel = Math.max(1, finite(hostHeight, 1) * 0.6);
  const t = clamp(dy / travel, 0, 1);
  // ease-out so the first pixels shrink the card noticeably, then resistance
  const eased = 1 - (1 - t) * (1 - t);
  return 1 - eased * (1 - MIN_DRAG_PROGRESS);
}

/** The card follows the finger sideways, less as it shrinks. */
export function dragTranslateX(dx: number, progress: number) {
  return finite(dx) * clamp(progress, 0, 1);
}

/** Take the touch from the scroll view only when it is at the top and the move is a downward drag. */
export function shouldCaptureDismiss(scrollY: number, dx: number, dy: number) {
  return finite(scrollY, 1) <= 0.5 && dy > CAPTURE_SLOP && dy > Math.abs(dx) * 1.2;
}

export function dismissOutcome(dy: number, vy: number): DismissOutcome {
  return dy > DISMISS_DISTANCE || (dy > 24 && vy > DISMISS_VELOCITY) ? 'close' : 'restore';
}

export function crossedDismiss(previousDy: number, dy: number) {
  return (previousDy > DISMISS_DISTANCE) !== (dy > DISMISS_DISTANCE);
}

export function backgroundScale(p: number) { return lerp(1, BACKGROUND_SCALE, clamp(p, 0, 1)); }
export function dimOpacity(p: number) { return lerp(0, DIM_OPACITY, clamp(p, 0, 1)); }
export function cornerRadius(p: number, cardRadius: number, openRadius: number) {
  // keep the card radius for most of the drag, relax it to the screen radius only near full size
  const t = clamp((clamp(p, 0, 1) - 0.7) / 0.3, 0, 1);
  return lerp(cardRadius, openRadius, t);
}
export function staggerDelay(index: number, reduced = false) {
  return reduced ? 0 : ENTER_DELAY_MS + Math.max(0, index) * STAGGER_MS;
}
/** Hero height never exceeds the host, and never falls below the card it grew from. */
export function heroHeightFor(cardHeight: number, requested: number, hostHeight: number) {
  return clamp(requested, cardHeight, Math.max(cardHeight, hostHeight * 0.7));
}
