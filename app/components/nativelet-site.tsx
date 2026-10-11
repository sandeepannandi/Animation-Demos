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
  Plus,
} from "lucide-react";
import { PreviewRail } from "./preview-rail";
import { SourceDropdown } from "./source-dropdown";
import styles from "../page.module.css";

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
const snippet = `import { PreviewRail } from "./preview-rail";

const items = [
  { id: "intro", label: "Introduction", href: "#intro" },
  { id: "work", label: "Selected work", href: "#work" },
];

<PreviewRail items={items} />;`;

export default function NativeletSite({
  sources,
}: {
  sources: { name: string; code: string }[];
}) {
  const reduce = useReducedMotion();
  const [study, setStudy] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState("focus");
  const [panel, setPanel] = useState<"preview" | "code">("preview");
  const [source, setSource] = useState(0);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  async function copy() {
    try {
      await navigator.clipboard.writeText(sources[source].code);
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
                One working web component today.
                <br />
                Try it, read the code, make it yours.
              </p>
            </div>
            <div className={styles.workbench}>
              <div className={styles.workbenchHead}>
                <div>
                  <span className={styles.live}>WEB COMPONENT</span>
                  <h3>
                    Preview Rail <span>01</span>
                  </h3>
                </div>
                <div
                  className={styles.viewTabs}
                  role="group"
                  aria-label="Preview Rail view"
                >
                  <button
                    aria-pressed={panel === "preview"}
                    onClick={() => setPanel("preview")}
                  >
                    Preview
                  </button>
                  <button
                    aria-pressed={panel === "code"}
                    onClick={() => setPanel("code")}
                  >
                    <Code2 size={14} /> Code
                  </button>
                </div>
              </div>
              {panel === "preview" ? (
                <div className={styles.demo}>
                  <div className={styles.demoNavigation}>
                    <PreviewRail
                      items={sections}
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
                          {s.label}
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
              ) : (
                <div className={styles.sourcePanel}>
                  <div className={styles.sourceToolbar}>
                    <label id="source-file-label" htmlFor="source-file">Source file</label>
                    <SourceDropdown
                      id="source-file"
                      labelId="source-file-label"
                      options={sources.map((s) => s.name)}
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
                      : "Exact repository source. Include the helper files and configure the @/ alias."}
                  </p>
                  <pre tabIndex={0} aria-label={sources[source].name}>
                    <code>{sources[source].code}</code>
                  </pre>
                </div>
              )}
              <div className={styles.demoFooter}>
                <span>React · Framer Motion · Tailwind CSS</span>
                <a href={`${REPO}/tree/main/app/components`}>
                  View in repository <ArrowUpRight size={15} />
                </a>
              </div>
            </div>
            <details className={styles.quickstart}>
              <summary>
                Using the web Preview Rail <Plus size={17} />
              </summary>
              <div>
                <p>
                  Copy Preview Rail and its three helper files from the Code
                  view. It needs React, Framer Motion, Tailwind CSS, the theme
                  tokens, and an <code>@/</code> path alias. The complete
                  working setup is in the repository. This is web React, not a
                  React Native install command.
                </p>
                <pre>
                  <code>{snippet}</code>
                </pre>
                <a href={REPO}>
                  Open the complete project <ArrowUpRight size={15} />
                </a>
              </div>
            </details>
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
                  <small>Available now · Preview Rail</small>
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
