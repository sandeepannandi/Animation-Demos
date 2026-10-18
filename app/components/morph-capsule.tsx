"use client";

import { animate, motion, useMotionValue, useReducedMotion, useTransform, type AnimationPlaybackControls, type MotionValue } from "framer-motion";
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import {
  clampState,
  contentOpacity,
  cycleState,
  dragProgress,
  resolveState,
  stepState,
} from "@/packages/ui/src/components/morph-capsule/morphMath";

export type CapsuleState = "idle" | "compact" | "expanded";
export const CAPSULE_STATES: readonly CapsuleState[] = ["idle", "compact", "expanded"];
const SIZES = [
  { width: 124, height: 36, radius: 18 },
  { width: 216, height: 52, radius: 26 },
  { width: 320, height: 172, radius: 34 },
];
const DRAG_RANGE = 120;

function Layer({ progress, index, children }: { progress: MotionValue<number>; index: number; children: ReactNode }) {
  const opacity = useTransform(progress, (value) => contentOpacity(value, index));
  const box = SIZES[index];
  return (
    <motion.span
      aria-hidden="true"
      style={{ opacity, width: box.width, height: box.height, marginLeft: -box.width / 2, marginTop: -box.height / 2, position: "absolute", left: "50%", top: "50%", display: "block", pointerEvents: "none" }}
    >
      {children}
    </motion.span>
  );
}

/** Web preview of the React Native Morph Capsule. It shares morphMath.ts with the native source. */
export function MorphCapsule({
  state,
  onStateChange,
  content,
  label,
  descriptions,
}: {
  state: CapsuleState;
  onStateChange: (state: CapsuleState) => void;
  content: Record<CapsuleState, ReactNode>;
  label: string;
  descriptions: Record<CapsuleState, string>;
}) {
  const reduce = useReducedMotion();
  const count = CAPSULE_STATES.length;
  const index = clampState(CAPSULE_STATES.indexOf(state), count);
  const progress = useMotionValue(index);
  const width = useTransform(progress, [0, 1, 2], SIZES.map((s) => s.width), { clamp: false });
  const height = useTransform(progress, [0, 1, 2], SIZES.map((s) => s.height), { clamp: false });
  const radius = useTransform(progress, [0, 1, 2], SIZES.map((s) => s.radius));
  const controls = useRef<AnimationPlaybackControls | null>(null);
  const lastTarget = useRef(index);
  const drag = useRef({ active: false, start: index, value: index });
  const blockClickUntil = useRef(0);

  function settle(target: number, velocity = 0) {
    controls.current?.stop(); // grabbing mid-morph continues from the current value
    lastTarget.current = target;
    controls.current = animate(
      progress,
      target,
      reduce ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 24, mass: 0.9, velocity: velocity * 1000 },
    );
  }
  useEffect(() => {
    if (!drag.current.active && lastTarget.current !== index) settle(index);
  });
  useEffect(() => () => controls.current?.stop(), []);

  function change(next: number) {
    if (next !== index) onStateChange(CAPSULE_STATES[next]);
  }
  function finish(velocity: number) {
    if (!drag.current.active) return;
    drag.current.active = false;
    blockClickUntil.current = Date.now() + 250;
    const target = resolveState(drag.current.value, velocity, count);
    if (target === index) settle(target, velocity);
    else lastTarget.current = -1;
    change(target);
  }
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      change(stepState(index, 1, count));
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      change(stepState(index, -1, count));
    }
  }
  const name = CAPSULE_STATES[index];
  return (
    <div style={{ height: SIZES[2].height, display: "flex", justifyContent: "center", alignItems: "flex-start", maxWidth: "100%" }}>
      <motion.button
        type="button"
        aria-label={`${label}, ${name}. ${descriptions[name]}`}
        aria-expanded={name === "expanded"}
        onClick={() => {
          if (!drag.current.active && Date.now() > blockClickUntil.current) change(cycleState(index, count));
        }}
        onKeyDown={onKeyDown}
        onPanStart={() => {
          controls.current?.stop();
          drag.current = { active: true, start: progress.get(), value: progress.get() };
        }}
        onPan={(_, info) => {
          if (!drag.current.active) return;
          drag.current.value = dragProgress(drag.current.start, info.offset.y, DRAG_RANGE, count);
          progress.set(drag.current.value);
        }}
        onPanEnd={(_, info) => finish(info.velocity.y / 1000 / DRAG_RANGE)}
        style={{
          width,
          height,
          borderRadius: radius,
          position: "relative",
          display: "block",
          overflow: "hidden",
          padding: 0,
          border: 0,
          background: "#10261d",
          color: "#fff",
          cursor: "grab",
          touchAction: "none",
          maxWidth: "100%",
        }}
      >
        {CAPSULE_STATES.map((layer, i) => (
          <Layer key={layer} progress={progress} index={i}>
            {content[layer]}
          </Layer>
        ))}
      </motion.button>
    </div>
  );
}
