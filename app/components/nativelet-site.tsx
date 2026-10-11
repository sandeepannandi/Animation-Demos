"use client";

import { useState, useRef, useEffect } from "react";
import {
  motion,
  AnimatePresence,
  MotionConfig,
  useReducedMotion,
} from "framer-motion";
import {
  ArrowUpRight,
  ArrowRight,
  Github,
  Play,
  Pause,
  Check,
  Copy,
  Code2,
  Smartphone,
  Layers,
  Sparkles,
  X,
} from "lucide-react";
import { PreviewRail } from "./preview-rail";
import { MorphCapsule, CAPSULE_STATES, type CapsuleState } from "./morph-capsule";
import { LiquidTabsPreview } from "./liquid-tabs";
import { ToastStackPreview } from "./toast-stack";
import { SourceDropdown } from "./source-dropdown";
import styles from "../page.module.css";
import gallery from "./component-gallery.module.css";

type ComponentId = "rail" | "capsule" | "toast" | "glass";
const META = {
  glass: { title: "Liquid Tabs", number: "04", folder: "liquid-tabs", note: "Real React Native source. Install expo-glass-effect and expo-blur with expo install. Keep LICENSE. iOS native glass needs availability checks; Android uses an opaque fallback. See README for integration and device-test limits.", footer: "Preview: CSS glass study. Source: React Native · Expo" },
  toast: { title: "Toast Stack", number: "03", folder: "toast-stack", note: "React Native source for Expo. Copy ToastStack.tsx and toastLogic.ts together and keep the LICENSE. The web adapter shares the queue, timer and gesture helpers, not the native render. Pass safe-area insets from your app.", footer: "Preview: React · Framer Motion. Source: React Native" },
  rail: {
    title: "Preview Rail",
    number: "01",
    folder: "preview-rail",
    note: "React Native source for Expo. Copy PreviewRail.tsx and selection.ts together and keep the LICENSE. The preview shows a web version, not this code. Scroll to read more; focus the code to scroll with arrow keys.",
    footer: "Preview: React · Framer Motion · Tailwind CSS. Source: React Native",
  },
  capsule: {
    title: "Morph Capsule",
    number: "02",
    folder: "morph-capsule",
    note: "React Native source for Expo. Copy MorphCapsule.tsx and morphMath.ts together and keep the LICENSE. The preview shows a web version that shares morphMath.ts, not the native component. Scroll to read more; focus the code to scroll with arrow keys.",
    footer: "Preview: React · Framer Motion. Source: React Native",
  },
} as const;
const capsuleDescriptions: Record<CapsuleState, string> = {
  idle: "No session running.",
  compact: "24 minutes left.",
  expanded: "24 minutes and 10 seconds left.",
};
const capsuleContent: Record<CapsuleState, React.ReactNode> = {
  idle: <span style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600 }}>Ready</span>,
  compact: <span style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "space-between", padding: "0 20px", fontSize: 13, fontWeight: 600 }}><span>Focus session</span><span>24:10</span></span>,
  expanded: <span style={{ display: "flex", height: "100%", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}><span style={{ fontSize: 10, letterSpacing: 1.5, fontWeight: 700, color: "#9fc7b0" }}>FOCUS SESSION</span><span style={{ fontSize: 44, fontWeight: 700, letterSpacing: -1.5, lineHeight: 1 }}>24:10</span><span style={{ fontSize: 12, color: "#9fc7b0" }}>Tap or drag to collapse</span></span>,
};
const REPO = "https://github.com/sandeepannandi/Nativelet";
const studies = ["Focus", "Listen", "Move"] as const;
const sections = [
  {
    id: "focus",
    label: "Focus",
    description: "A quiet place to start.",
    href: "#rail-detail",
  },
  {
    id: "listen",
    label: "Listen",
    description: "A little rhythm in your day.",
    href: "#rail-detail",
  },
  {
    id: "move",
    label: "Move",
    description: "Room for a fresh perspective.",
    href: "#rail-detail",
  },
];

export default function NativeletSite({
  sources,
}: {
  sources: Record<ComponentId, { name: string; code: string }[]>;
}) {
  const reduce = useReducedMotion();
  const slide = { type: "spring", stiffness: 300, damping: 30, mass: 0.9 } as const;
  const [study, setStudy] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState("focus");
  const [panel, setPanel] = useState<"preview" | "code">("preview");
  const [source, setSource] = useState(0);
  const [which, setWhich] = useState<ComponentId>("rail");
  const [capsule, setCapsule] = useState<CapsuleState>("idle");
  const list = sources[which];
  const meta = META[which];
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [paused, setPaused] = useState(false);
  const [orientation, setOrientation] = useState<"vertical" | "horizontal">("vertical");
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const savedOverflow = useRef("");
  const closing = useRef(false);
  function openComponent(event: React.MouseEvent<HTMLButtonElement>, id: ComponentId, layout: "vertical" | "horizontal" = "vertical") {
    opener.current = event.currentTarget;
    setWhich(id);
    setSource(0);
    setCapsule("idle");
    setOrientation(layout);
    setPanel("preview");
    setActive("focus");
    setCopied(false);
    setCopyError(false);
    savedOverflow.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const modal = dialog.current;
    if (!modal) return;
    modal.showModal();
    const from = originTransform();
    if (from && modal.animate) {
      modal.animate(
        [{ transform: from, opacity: 0.2 }, { transform: "none", opacity: 1 }],
        { duration: 320, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
      );
    }
  }
  function originTransform() {
    const modal = dialog.current;
    const source = opener.current;
    if (!modal || !source) return null;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;
    const card = source.getBoundingClientRect();
    const box = modal.open ? modal.getBoundingClientRect() : null;
    const width = box?.width || Math.min(960, window.innerWidth - 32);
    const height = box?.height || Math.min(720, window.innerHeight - 32);
    const left = box ? box.left : (window.innerWidth - width) / 2;
    const top = box ? box.top : (window.innerHeight - height) / 2;
    const dx = card.left + card.width / 2 - (left + width / 2);
    const dy = card.top + card.height / 2 - (top + height / 2);
    return `translate(${dx}px, ${dy}px) scale(${card.width / width}, ${card.height / height})`;
  }
  function closeComponent() {
    const modal = dialog.current;
    if (!modal || !modal.open || closing.current) return;
    const to = originTransform();
    if (!to || !modal.animate) {
      modal.close();
      return;
    }
    closing.current = true;
    modal.dataset.closing = "true";
    const animation = modal.animate(
      [{ transform: "none", opacity: 1 }, { transform: to, opacity: 0.2 }],
      { duration: 240, easing: "cubic-bezier(0.4, 0, 0.6, 1)", fill: "forwards" },
    );
    const done = () => {
      closing.current = false;
      delete modal.dataset.closing;
      animation.cancel();
      modal.close();
    };
    animation.onfinish = done;
    animation.oncancel = () => {
      closing.current = false;
      delete modal.dataset.closing;
    };
  }
  function afterClose() {
    document.body.style.overflow = savedOverflow.current;
    opener.current?.focus();
  }
  useEffect(() => () => {
    if (dialog.current?.open) document.body.style.overflow = savedOverflow.current;
  }, []);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  async function copy() {
    try {
      await navigator.clipboard.writeText(list[source].code);
      setCopied(true);
      setCopyError(false);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
    }
  }
  return (
    <MotionConfig reducedMotion="user">
      <div className={styles.site}>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <header className={styles.header}>
          <a href="#" className={styles.wordmark} aria-label="Nativelet home">
            <span className={styles.mark}>n.</span> nativelet
            <span className={styles.alpha}>playground</span>
          </a>
          <nav aria-label="Main navigation">
            <a href="#components">Components</a>
            <a href="#direction">The direction</a>
            <a
              href={REPO}
              className={styles.github}
              aria-label="Nativelet on GitHub"
            >
              <Github size={17} />
              <span>GitHub</span>
              <ArrowUpRight size={14} />
            </a>
          </nav>
        </header>
        <main id="main">
          <section className={styles.hero} aria-labelledby="hero-title">
            <motion.div
              className={styles.heroCopy}
              initial={false}
              animate={{ opacity: 1, y: 0 }}
            >
              <p className={styles.eyebrow}>
                <span className={styles.dot} /> AN OPEN-SOURCE INTERFACE
                PLAYGROUND
              </p>
              <h1 id="hero-title">
                Small interactions.
                <br />
                <span>A little more</span>
                <br />
                <em>feeling.</em>
                <span className={styles.asterisk} aria-hidden="true">
                  ✳
                </span>
              </h1>
              <p className={styles.intro}>
                Exploring the details that make an interface feel alive. A
                growing playground, with React Native components and blocks in
                mind.
              </p>
              <div className={styles.actions}>
                <a href="#components" className={styles.primary}>
                  Explore the playground <ArrowUpRight size={19} />
                </a>
                <a href="#direction" className={styles.secondary}>
                  Where we&apos;re headed <ArrowRight size={17} />
                </a>
              </div>
              <p className={styles.status}>
                <Code2 size={15} /> Web preview available. Native library in the
                making.
              </p>
            </motion.div>
            <div className={styles.heroVisual}>
              <div className={styles.visualGrid} aria-hidden="true" />
              <div className={styles.orbit} aria-hidden="true" />
              <span className={styles.visualLabel}>
                INTERACTION STUDY / 001
              </span>
              <motion.div
                className={styles.floatingNote}
                animate={!reduce && !paused ? { y: [0, -8, 0] } : { y: 0 }}
                transition={{ duration: 5, repeat: Infinity }}
              >
                <Sparkles size={15} /> A softer kind of software
              </motion.div>
              <div className={styles.phone}>
                <div className={styles.phoneTop}>
                  <span>9:41</span>
                  <span className={styles.island} />
                  <span>•••</span>
                </div>
                <div className={styles.phoneContent}>
                  <div className={styles.phoneTitle}>
                    <span>
                      Make room
                      <br />
                      <strong>for your day.</strong>
                    </span>
                    <span className={styles.avatar}>n.</span>
                  </div>
                  <div
                    className={styles.phoneTabs}
                    role="group"
                    aria-label="Choose a design study"
                  >
                    {studies.map((s, i) => (
                      <button
                        key={s}
                        aria-pressed={study === i}
                        onClick={() => setStudy(i)}
                      >
                        {study === i && (
                          <motion.span
                            layoutId="study-tab"
                            className={styles.tabPill}
                            transition={slide}
                          />
                        )}
                        <span>{s}</span>
                      </button>
                    ))}
                  </div>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={study}
                      initial={reduce ? false : { opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: reduce ? 0 : -8 }}
                      transition={{ duration: 0.22 }}
                    >
                      <div className={styles.art} aria-hidden="true">
                        <motion.div
                          className={styles.petal}
                          animate={
                            !reduce && !paused
                              ? { rotate: [0, 180] }
                              : { rotate: 0 }
                          }
                          transition={{
                            duration: 25,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        >
                          <i />
                          <i />
                          <i />
                          <i />
                        </motion.div>
                        <span>
                          {study === 0
                            ? "Find your quiet."
                            : study === 1
                              ? "Stay in the rhythm."
                              : "Take a fresh turn."}
                        </span>
                      </div>
                      <div className={styles.phoneCard}>
                        <span className={styles.smallLabel}>
                          {study === 0
                            ? "A MOMENT FOR YOU"
                            : study === 1
                              ? "ON REPEAT"
                              : "A CHANGE OF PACE"}
                        </span>
                        <h3>
                          {study === 0
                            ? "Less noise. More now."
                            : study === 1
                              ? "Slow Sunday"
                              : "A walk, without a plan."}
                        </h3>
                        <div className={styles.track}>
                          <span>
                            {study === 1
                              ? "Illustrative player · no audio"
                              : "Interactive design study"}
                          </span>
                          <button
                            aria-label={
                              playing
                                ? "Pause design animation"
                                : "Play design animation"
                            }
                            aria-pressed={playing}
                            onClick={() => setPlaying(!playing)}
                          >
                            {playing ? <Pause size={18} /> : <Play size={18} />}
                          </button>
                        </div>
                        <div className={styles.progress}>
                          <motion.span
                            animate={{ width: playing ? "82%" : "32%" }}
                            transition={{ duration: reduce ? 0 : 1.5 }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                  <div className={styles.phoneBottom}>
                    <span>
                      <span className={styles.smallLabel}>YOUR SPACE</span>
                      <br />
                      One thing at a time.
                    </span>
                    <ArrowUpRight size={20} />
                  </div>
                </div>
                <div className={styles.homeIndicator} />
              </div>
              <div className={styles.visualCaption}>
                <span>
                  <span className={styles.dot} /> Web design study, not an RN
                  component
                </span>
                <button
                  onClick={() => setPaused(!paused)}
                  aria-pressed={paused}
                  aria-label={
                    paused
                      ? "Resume decorative motion"
                      : "Pause decorative motion"
                  }
                >
                  {paused ? <Play size={14} /> : <Pause size={14} />}
                </button>
              </div>
            </div>
          </section>
          <div className={styles.strip}>
            <span>
              <Layers size={17} /> Start with the interaction
            </span>
            <span>
              <Code2 size={17} /> Explore the source
            </span>
            <span>
              <Smartphone size={17} /> Native is the next chapter
            </span>
          </div>
          <section
            id="components"
            className={styles.components}
            aria-labelledby="component-title"
          >
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>THE PLAYGROUND</p>
                <h2 id="component-title">
                  A small start.
                  <br />
                  Plenty to play with.
                </h2>
              </div>
              <p>
                Four React Native components with web previews.
                <br />
                Open one to try it and copy its React Native source.
              </p>
            </div>
            <div className={gallery.grid}>
              <button className={gallery.tile} onClick={(event) => openComponent(event, "rail")} aria-haspopup="dialog" aria-label="Open Preview Rail web preview">
                <div className={gallery.study} aria-hidden="true">
                  <div className={gallery.miniRail}>
                    {[0, 1, 2].map((tick) => <span key={tick} className={gallery.tick} />)}
                  </div>
                  <div className={gallery.miniCard}><span>A LITTLE CLARITY</span><strong>One thing at a time.</strong></div>
                </div>
                <div className={gallery.caption}>
                  <div><span className={gallery.label}>WEB PREVIEW · 01</span><strong>Preview Rail</strong><small>Vertical and horizontal navigation · switch inside</small></div>
                  <ArrowUpRight size={20} aria-hidden="true" />
                </div>
              </button>
              <button className={gallery.tile} onClick={(event) => openComponent(event, "capsule")} aria-haspopup="dialog" aria-label="Open Morph Capsule web preview">
                <div className={gallery.study} aria-hidden="true">
                  <div className={gallery.miniCapsule}><span>Focus session</span><strong>24:10</strong></div>
                </div>
                <div className={gallery.caption}>
                  <div><span className={gallery.label}>WEB PREVIEW · 02</span><strong>Morph Capsule</strong><small>Idle, compact and expanded · tap or drag inside</small></div>
                  <ArrowUpRight size={20} aria-hidden="true" />
                </div>
              </button>
              <button className={gallery.tile} onClick={(event) => openComponent(event, "toast")} aria-haspopup="dialog" aria-label="Open Toast Stack web preview">
                <div className={gallery.study} aria-hidden="true"><div className={gallery.miniToasts}><span>✓ Saved to collection <b>Undo</b></span><span>A little less to carry.</span></div></div>
                <div className={gallery.caption}><div><span className={gallery.label}>WEB PREVIEW · 03</span><strong>Toast Stack</strong><small>Queue, swipe, pause and undo · feedback that feels right</small></div><ArrowUpRight size={20} aria-hidden="true" /></div>
              </button>
              <button className={gallery.tile} onClick={(event) => openComponent(event, "glass")} aria-haspopup="dialog" aria-label="Open Liquid Tabs web preview">
                <div className={gallery.study} aria-hidden="true"><div className={gallery.miniGlass}><span>⌂<small>Home</small></span><span>◇<small>Explore</small></span><span>♡<small>Saved</small></span><span>○<small>You</small></span></div></div>
                <div className={gallery.caption}><div><span className={gallery.label}>WEB PREVIEW · 04</span><strong>Liquid Tabs</strong><small>A floating tab bar · native iOS glass with fallbacks</small></div><ArrowUpRight size={20} aria-hidden="true" /></div>
              </button>
            </div>
            <dialog ref={dialog} className={gallery.dialog} aria-labelledby="preview-dialog-title" aria-describedby="preview-dialog-description" onClose={afterClose} onCancel={(event) => { event.preventDefault(); closeComponent(); }} onKeyDown={(event) => {
              if (event.key !== "Tab") return;
              const elements = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], select, [tabindex="0"]')).filter((element) => element.getClientRects().length > 0);
              const first = elements[0];
              const last = elements[elements.length - 1];
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
              }
            }} onClick={(event) => {
              if (event.target !== event.currentTarget) return;
              const box = event.currentTarget.getBoundingClientRect();
              if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeComponent();
            }}>
              <div className={gallery.dialogTop}>
                <p id="preview-dialog-description">Web preview of the React Native {meta.title}. Not yet tested on a device.</p>
                <button type="button" className={gallery.close} aria-label="Close component preview" onClick={closeComponent} autoFocus><X size={19} /></button>
              </div>
              <div className={gallery.dialogBody}>
            <div className={styles.workbench}>
              <div className={styles.workbenchHead}>
                <div>
                  <span className={styles.live}>REACT NATIVE · WEB PREVIEW</span>
                  <h3 id="preview-dialog-title">
                    {meta.title} <span>{meta.number}</span>
                  </h3>
                </div>
                <div
                  className={styles.viewTabs}
                  role="group"
                  aria-label={`${meta.title} view`}
                >
                  <button
                    aria-pressed={panel === "preview"}
                    onClick={() => setPanel("preview")}
                  >
                    {panel === "preview" && (
                      <motion.span layoutId="view-pill" className={styles.viewPill} transition={slide} />
                    )}
                    <span className={styles.toggleLabel}>Preview</span>
                  </button>
                  <button
                    aria-pressed={panel === "code"}
                    onClick={() => setPanel("code")}
                  >
                    {panel === "code" && (
                      <motion.span layoutId="view-pill" className={styles.viewPill} transition={slide} />
                    )}
                    <span className={styles.toggleLabel}><Code2 size={14} /> Code</span>
                  </button>
                </div>
              </div>
              {panel === "preview" ? (
                <>
                {which === "glass" ? <LiquidTabsPreview /> : which === "toast" ? <ToastStackPreview /> : which === "capsule" ? (
                  <>
                    <div className={gallery.orientation} role="group" aria-label="Capsule state">
                      {CAPSULE_STATES.map((name) => (
                        <button key={name} type="button" aria-pressed={capsule === name} onClick={() => setCapsule(name)}>
                          {capsule === name && <motion.span layoutId="capsule-pill" className={gallery.orientationPill} transition={slide} />}
                          <span className={gallery.toggleLabel}>{name[0].toUpperCase() + name.slice(1)}</span>
                        </button>
                      ))}
                    </div>
                    <div className={gallery.capsuleStage}>
                      <MorphCapsule state={capsule} onStateChange={setCapsule} content={capsuleContent} label="Focus session" descriptions={capsuleDescriptions} />
                      <p>Tap to step up. Drag down to expand and up to collapse. Grab it mid-morph.</p>
                    </div>
                  </>
                ) : (
                  <>
                <div className={gallery.orientation} role="group" aria-label="Rail orientation">
                  {(["vertical", "horizontal"] as const).map((layout) => (
                    <button key={layout} type="button" aria-pressed={orientation === layout} onClick={() => setOrientation(layout)}>
                      {orientation === layout && <motion.span layoutId="orientation-pill" className={gallery.orientationPill} transition={slide} />}
                      <span className={gallery.toggleLabel}>{layout === "vertical" ? "Vertical" : "Horizontal"}</span>
                    </button>
                  ))}
                </div>
                <div className={styles.demo}>
                  <div className={styles.demoNavigation}>
                    <PreviewRail
                      items={sections}
                      orientation={orientation}
                      activeId={active}
                      onActiveChange={setActive}
                      className="!min-h-44"
                      renderPreview={(item) => (
                        <div className={styles.railTooltip}>
                          <strong>{item.label}</strong>
                          <p>{item.description}</p>
                        </div>
                      )}
                    />
                    <p>
                      Hover or focus the rail.
                      <br />
                      Use the buttons to explore on touch.
                    </p>
                  </div>
                  <div className={styles.demoDetail} id="rail-detail">
                    <div
                      className={styles.demoButtons}
                      role="group"
                      aria-label="Select preview"
                    >
                      {sections.map((s) => (
                        <button
                          aria-pressed={active === s.id}
                          onClick={() => setActive(s.id)}
                          key={s.id}
                        >
                          {active === s.id && (
                            <motion.span layoutId="detail-pill" className={styles.detailPill} transition={slide} />
                          )}
                          <span className={styles.toggleLabel}>{s.label}</span>
                        </button>
                      ))}
                    </div>
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={active}
                        initial={reduce ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={styles.detailCard}
                      >
                        <span
                          className={styles.detailSymbol}
                          aria-hidden="true"
                        >
                          {active === "focus"
                            ? "✳"
                            : active === "listen"
                              ? "≈"
                              : "↗"}
                        </span>
                        <div>
                          <p className={styles.smallLabel}>
                            A LITTLE{" "}
                            {active === "focus"
                              ? "CLARITY"
                              : active === "listen"
                                ? "RHYTHM"
                                : "MOMENTUM"}
                          </p>
                          <h4>
                            {active === "focus"
                              ? "Give the next thing your full attention."
                              : active === "listen"
                                ? "Find a rhythm that feels like you."
                                : "Make space for something different."}
                          </h4>
                          <p>Demo content for the web Preview Rail.</p>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
                  </>
                )}
                </>
              ) : (
                <div className={styles.sourcePanel}>
                  <div className={styles.sourceToolbar}>
                    <label id="source-file-label" htmlFor="source-file">Source file</label>
                    <SourceDropdown
                      id="source-file"
                      labelId="source-file-label"
                      options={list.map((s) => s.name)}
                      value={source}
                      onChange={(value) => {
                        setSource(value);
                        setCopied(false);
                        setCopyError(false);
                      }}
                    />
                    <button onClick={copy}>
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p role="status">
                    {copyError
                      ? "Clipboard unavailable. Select the source below and copy it manually."
                      : meta.note}
                  </p>
                  <pre tabIndex={0} aria-label={list[source].name}>
                    <code>{list[source].code}</code>
                  </pre>
                </div>
              )}
              <div className={styles.demoFooter}>
                <span>{meta.footer}</span>
                <a href={`${REPO}/tree/main/packages/ui/src/components/${meta.folder}`}>
                  View in repository <ArrowUpRight size={15} />
                </a>
              </div>
            </div>
              </div>
            </dialog>
          </section>
          <section
            id="direction"
            className={styles.direction}
            aria-labelledby="direction-title"
          >
            <div>
              <p className={styles.eyebrow}>THE NEXT CHAPTER</p>
              <h2 id="direction-title">
                Same attention to detail.
                <br />
                <em>A native canvas.</em>
              </h2>
              <p>
                The direction is React Native components and blocks. This
                website is the starting point, not a claim that the library has
                shipped.
              </p>
              <a className={styles.primary} href={REPO}>
                Follow the project <ArrowUpRight size={18} />
              </a>
            </div>
            <div className={styles.roadmap}>
              <div>
                <span className={styles.roadmapIcon}>
                  <Check size={19} />
                </span>
                <span>
                  <strong>Web playground</strong>
                  <small>Available now · Preview Rail, Morph Capsule</small>
                </span>
                <span className={styles.now}>NOW</span>
              </div>
              <div>
                <span className={styles.roadmapIcon}>
                  <Smartphone size={19} />
                </span>
                <span>
                  <strong>React Native components</strong>
                  <small>Planned · not available yet</small>
                </span>
              </div>
              <div>
                <span className={styles.roadmapIcon}>
                  <Layers size={19} />
                </span>
                <span>
                  <strong>Native blocks</strong>
                  <small>Planned · no release date</small>
                </span>
              </div>
            </div>
          </section>
          <section className={styles.endnote}>
            <span aria-hidden="true">✳</span>
            <h2>
              Make the ordinary
              <br />
              feel considered.
            </h2>
            <a href={REPO}>
              Build along with Nativelet <ArrowUpRight size={18} />
            </a>
          </section>
        </main>
        <footer className={styles.footer}>
          <a className={styles.wordmark} href="#">
            <span className={styles.mark}>n.</span> nativelet
          </a>
          <p>An open-source playground by Sandeepan Nandi.</p>
          <a href={`${REPO}/blob/main/LICENSE`}>
            MIT license <ArrowUpRight size={14} />
          </a>
          <a href={REPO}>
            <Github size={16} /> GitHub
          </a>
        </footer>
      </div>
    </MotionConfig>
  );
}
