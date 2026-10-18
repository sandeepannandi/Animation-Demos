"use client";
import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { Home, Compass, Heart, UserRound } from "lucide-react";
import styles from "./liquid-tabs.module.css";
const tabs = [
  { id: "home", label: "Home", icon: Home, title: "A little room to wander.", subtitle: "Make space for the things you love.", tag: "YOUR EVERYDAY", color: "#d3ead9" },
  { id: "explore", label: "Explore", icon: Compass, title: "Follow a different path.", subtitle: "Something good is just around the corner.", tag: "NEW PERSPECTIVES", color: "#d6e5ee" },
  { id: "saved", label: "Saved", icon: Heart, title: "Keep the good things.", subtitle: "A small collection, all your own.", tag: "LITTLE FAVORITES", color: "#ebd9dd" },
  { id: "you", label: "You", icon: UserRound, title: "Find your own rhythm.", subtitle: "There is no one way to spend a day.", tag: "YOUR SPACE", color: "#e5dfcd" },
];
const HOLD_DELAY = 280;
export function LiquidTabsPreview() {
  const [active, setActive] = useState(0);
  const [opaque, setOpaque] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const reduce = useReducedMotion();
  const lensPos = useMotionValue(0); // lens position in tab-widths; follows the finger while sliding
  const lensX = useTransform(lensPos, value => `${value * 100}%`);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const bar = useRef<HTMLDivElement | null>(null);
  const hold = useRef<number | null>(null);
  const scrub = useRef(false);
  const activeRef = useRef(0);
  activeRef.current = active;
  const item = tabs[active];
  function select(index: number) { setActive(index); refs.current[index]?.focus(); }
  function clearHold() { if (hold.current !== null) { window.clearTimeout(hold.current); hold.current = null; } }
  function pressTab(index: number) {
    clearHold();
    if (index !== activeRef.current) { setActive(index); return; }
    hold.current = window.setTimeout(() => { hold.current = null; scrub.current = true; setScrubbing(true); }, HOLD_DELAY);
  }
  useEffect(() => {
    if (!scrubbing) return undefined;
    const move = (event: PointerEvent) => {
      const node = bar.current;
      if (!node || !scrub.current) return;
      const rect = node.getBoundingClientRect();
      const pad = 6; // bar padding
      const cell = (rect.width - pad * 2) / tabs.length;
      if (cell <= 0) return;
      const x = Math.min(Math.max(event.clientX - rect.left - pad, 0), rect.width - pad * 2 - 0.01);
      const next = Math.min(tabs.length - 1, Math.floor(x / cell));
      lensPos.set(Math.min(Math.max(x / cell - 0.5, 0), tabs.length - 1)); // the lens follows the finger
      if (next !== activeRef.current) setActive(next);
    };
    const up = () => { scrub.current = false; setScrubbing(false); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); };
  }, [scrubbing, lensPos]);
  useEffect(() => {
    if (scrubbing) return undefined; // the finger owns the lens while sliding
    if (reduce) { lensPos.set(active); return undefined; }
    // Small, bouncy settle into the tab where the slide stopped.
    const controls = animate(lensPos, active, { type: "spring", stiffness: 340, damping: 15, mass: 0.8 });
    return () => controls.stop();
  }, [active, scrubbing, reduce, lensPos]);
  useEffect(() => () => clearHold(), []);
  return <div className={styles.wrapper}>
    <div className={styles.controls}><span>CSS glass study · hold the active tab, then slide</span><button type="button" aria-pressed={opaque} onClick={() => setOpaque(!opaque)}>{opaque ? "Opaque fallback" : "Try opaque fallback"}</button></div>
    <div className={styles.scene} style={{ backgroundColor: item.color }}>
      <span className={styles.orb} aria-hidden="true" />
      <div className={styles.content} id="liquid-tab-panel" role="tabpanel" aria-labelledby={`liquid-tab-${item.id}`}>
        <span className={styles.tag}>{item.tag}</span><h4>{item.title}</h4><p>{item.subtitle}</p>
        <div className={styles.landscape} aria-hidden="true"><span /><span /><span /></div>
        <span className={styles.sceneNote}>TAP A TAB, OR HOLD THE ACTIVE TAB AND SLIDE</span>
      </div>
      <div ref={bar} className={`${styles.bar} ${opaque ? styles.opaque : ""}`} role="tablist" aria-label="Demo navigation"
        onPointerUp={clearHold} onPointerCancel={clearHold} onPointerLeave={clearHold}
        onContextMenu={event => { if (scrub.current) event.preventDefault(); }}>
        <motion.span aria-hidden="true" className={styles.lens} style={{ x: lensX }} animate={{ scaleX: scrubbing ? 1.1 : 1, scaleY: scrubbing ? 1.12 : 1 }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 11, mass: 0.8 }} />
        {tabs.map((tab, index) => <button key={tab.id} ref={node => { refs.current[index] = node; }} id={`liquid-tab-${tab.id}`} type="button" role="tab" aria-selected={index === active} aria-controls="liquid-tab-panel" tabIndex={index === active ? 0 : -1}
          onClick={() => setActive(index)} onPointerDown={() => pressTab(index)} onKeyDown={event => {
            if (["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) { event.preventDefault(); select(event.key === "Home" ? 0 : event.key === "End" ? 3 : (active + (event.key === "ArrowRight" ? 1 : 3)) % 4); }
          }}><tab.icon size={21} strokeWidth={index === active ? 2.2 : 1.7} aria-hidden="true" /><span>{tab.label}</span></button>)}
      </div>
    </div>
  </div>;
}
