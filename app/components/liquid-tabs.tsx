"use client";
import { useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Home, Compass, Heart, UserRound } from "lucide-react";
import styles from "./liquid-tabs.module.css";
const tabs = [
  { id: "home", label: "Home", icon: Home, title: "A little room to wander.", subtitle: "Make space for the things you love.", tag: "YOUR EVERYDAY", color: "#d3ead9" },
  { id: "explore", label: "Explore", icon: Compass, title: "Follow a different path.", subtitle: "Something good is just around the corner.", tag: "NEW PERSPECTIVES", color: "#d6e5ee" },
  { id: "saved", label: "Saved", icon: Heart, title: "Keep the good things.", subtitle: "A small collection, all your own.", tag: "LITTLE FAVORITES", color: "#ebd9dd" },
  { id: "you", label: "You", icon: UserRound, title: "Find your own rhythm.", subtitle: "There is no one way to spend a day.", tag: "YOUR SPACE", color: "#e5dfcd" },
];
export function LiquidTabsPreview() {
  const [active, setActive] = useState(0);
  const [opaque, setOpaque] = useState(false);
  const reduce = useReducedMotion();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const item = tabs[active];
  function select(index: number) { setActive(index); refs.current[index]?.focus(); }
  return <div className={styles.wrapper}>
    <div className={styles.controls}><span>CSS glass study</span><button type="button" aria-pressed={opaque} onClick={() => setOpaque(!opaque)}>{opaque ? "Opaque fallback" : "Try opaque fallback"}</button></div>
    <div className={styles.scene} style={{ backgroundColor: item.color }}>
      <span className={styles.orb} aria-hidden="true" />
      <div className={styles.content} id="liquid-tab-panel" role="tabpanel" aria-labelledby={`liquid-tab-${item.id}`}>
        <span className={styles.tag}>{item.tag}</span><h4>{item.title}</h4><p>{item.subtitle}</p>
        <div className={styles.landscape} aria-hidden="true"><span /><span /><span /></div>
        <span className={styles.sceneNote}>SELECT A TAB BELOW</span>
      </div>
      <div className={`${styles.bar} ${opaque ? styles.opaque : ""}`} role="tablist" aria-label="Demo navigation">
        <motion.span aria-hidden="true" className={styles.lens} animate={{ x: `${active * 100}%` }} transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 280, damping: 27, mass: .85 }} />
        {tabs.map((tab, index) => <button key={tab.id} ref={node => { refs.current[index] = node; }} id={`liquid-tab-${tab.id}`} type="button" role="tab" aria-selected={index === active} aria-controls="liquid-tab-panel" tabIndex={index === active ? 0 : -1} onClick={() => setActive(index)} onKeyDown={event => {
          if (["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) { event.preventDefault(); select(event.key === "Home" ? 0 : event.key === "End" ? 3 : (active + (event.key === "ArrowRight" ? 1 : 3)) % 4); }
        }}><tab.icon size={21} strokeWidth={index === active ? 2.2 : 1.7} aria-hidden="true" /><span>{tab.label}</span></button>)}
      </div>
    </div>
    <p className={styles.note}>Web preview, not native glass. Not yet tested on a device.<br />iOS 26+: native glass when available. Earlier iOS: blur. Android: opaque fallback.</p>
  </div>;
}
