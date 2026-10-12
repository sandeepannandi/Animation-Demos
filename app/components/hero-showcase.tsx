"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./hero-showcase.module.css";

const CHART_PATH =
  "M 20 115 C 40 115 40 84 62 84 S 80 100 97 100 S 117 49 139 49 S 155 65 171 65 S 199 27 220 27";

/* Twelve looping tiles in two vertical columns, one rising and one falling. They are SVG/CSS stand-ins that mimic the motion of the
   Skia components in this repo; they are not the native render. Loops pause when the
   showcase is offscreen or when the visitor presses pause, and the global
   prefers-reduced-motion rule stops them. */
function ColumnA() {
  return (
    <>
        <div className={`${styles.tile} ${styles.chart}`} aria-hidden="true">
          <svg viewBox="0 0 240 150">
            <defs>
              <linearGradient id="hero-chart-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#57dfb6" stopOpacity=".4" />
                <stop offset="1" stopColor="#57dfb6" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path className={styles.area} d={`${CHART_PATH} L 220 132 L 20 132 Z`} fill="url(#hero-chart-fill)" />
            <path className={styles.line} d={CHART_PATH} pathLength={1} />
            <circle className={styles.ring} r="5" />
            <circle className={styles.dot} r="4.5" />
          </svg>
          <span className={styles.name}>Scrub Chart</span>
        </div>
        <div className={`${styles.tile} ${styles.drag}`} aria-hidden="true">
          <div className={styles.rows}><i /><i /><i /></div>
          <span className={styles.name}>Drag to Sort</span>
        </div>
        <div className={`${styles.tile} ${styles.reveal}`} aria-hidden="true">
          <span className={styles.dusk}>Dusk</span>
          <div className={styles.dawn}>
            <span>Dawn</span>
          </div>
          <span className={styles.name}>Theme Reveal</span>
        </div>
        <div className={`${styles.tile} ${styles.swipe}`} aria-hidden="true">
          <div className={styles.swipeAction} />
          <div className={styles.swipeRow} />
          <span className={styles.name}>Swipe Row</span>
        </div>
        <div className={`${styles.tile} ${styles.tabs}`} aria-hidden="true">
          <div className={styles.tabBar}><b /><span>One</span><span>Two</span><span>Three</span></div>
          <span className={styles.name}>Liquid Tabs</span>
        </div>
        <div className={`${styles.tile} ${styles.stack}`} aria-hidden="true">
          <i /><i /><i />
          <span className={styles.name}>Stacked Carousel</span>
        </div>
    </>
  );
}

function ColumnB() {
  return (
    <>
        <div className={`${styles.tile} ${styles.gooey}`} aria-hidden="true">
          <svg width="0" height="0" style={{ position: "absolute" }}>
            <filter id="hero-goo" colorInterpolationFilters="sRGB">
              <feGaussianBlur stdDeviation="5" />
              <feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 22 -9" />
            </filter>
          </svg>
          <div className={styles.goo}>
            <i style={{ "--x": "-58px", "--y": "-14px" } as React.CSSProperties} />
            <i style={{ "--x": "-30px", "--y": "-52px" } as React.CSSProperties} />
            <i style={{ "--x": "30px", "--y": "-52px" } as React.CSSProperties} />
            <i style={{ "--x": "58px", "--y": "-14px" } as React.CSSProperties} />
            <b />
          </div>
          <em className={styles.plus}>+</em>
          <span className={styles.name}>Gooey Menu</span>
        </div>
        <div className={`${styles.tile} ${styles.toast}`} aria-hidden="true">
          <i /><i /><i />
          <span className={styles.name}>Toast Stack</span>
        </div>
        <div className={`${styles.tile} ${styles.lens}`} aria-hidden="true">
          <span className={styles.big}>Aa</span>
          <span className={styles.big2}>Bb</span>
          <div className={styles.glass} />
          <span className={styles.name}>Glass Lens</span>
        </div>
        <div className={`${styles.tile} ${styles.capsule}`} aria-hidden="true">
          <div className={styles.pill}><b /></div>
          <span className={styles.name}>Morph Capsule</span>
        </div>
        <div className={`${styles.tile} ${styles.expand}`} aria-hidden="true">
          <div className={styles.card}><b /><u /></div>
          <span className={styles.name}>Expanding Card</span>
        </div>
        <div className={`${styles.tile} ${styles.rail}`} aria-hidden="true">
          <div className={styles.railTrack}><i /><i /><i /><i /></div>
          <span className={styles.name}>Preview Rail</span>
        </div>
    </>
  );
}

export function HeroShowcase({ paused }: { paused: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const node = root.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.05,
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={root}
      className={`${styles.root} ${visible && !paused ? "" : styles.still}`}
      role="img"
      aria-label="Looping web previews of the twelve Nativelet components"
    >
      <div className={styles.column} data-dir="up">
        <div className={styles.track}>
          <div className={styles.set}>
            <ColumnA />
          </div>
          <div className={styles.set} aria-hidden="true">
            <ColumnA />
          </div>
        </div>
      </div>
      <div className={styles.column} data-dir="down">
        <div className={styles.track}>
          <div className={styles.set}>
            <ColumnB />
          </div>
          <div className={styles.set} aria-hidden="true">
            <ColumnB />
          </div>
        </div>
      </div>
    </div>
  );
}
