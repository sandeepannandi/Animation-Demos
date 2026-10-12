"use client";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { BACKGROUND_SCALE, DIM_OPACITY, STAGGER_MS, cornerRadius, crossedDismiss, dismissOutcome, dragToProgress, dragTranslateX, heroHeightFor, lerp, shouldCaptureDismiss, staggerDelay, type Rect } from '../../packages/ui/src/components/expanding-card/expandingLogic';
import styles from './expanding-card.module.css';

type Story = { id: string; eyebrow: string; title: string; color: string; art: ReactNode; blocks: ReactNode[] };
const CARD_H = 230;
const HERO_H = 330;
const CARD_RADIUS = 26;
const CARD_TITLE = 28;
const OPEN_TITLE = 34;
const circle = (size: number, style: CSSProperties): CSSProperties => ({ position: 'absolute', width: size, height: size, borderRadius: '50%', ...style });
const STORIES: Story[] = [
  {
    id: 'mornings', eyebrow: 'The Daily List', title: 'Slow mornings, better days', color: '#d9892b',
    art: <><span style={circle(230, { right: -60, bottom: -80, background: '#ffffff33' })} /><span style={circle(120, { right: 70, bottom: 36, background: '#ffe2a8' })} /></>,
    blocks: [
      <p key="a" className={styles.lead}>Start before the screen does.</p>,
      <p key="b" className={styles.text}>Five small habits that make the first hour feel like yours: water, light, one page, one stretch, then the phone.</p>,
      <div key="c" className={styles.chips}><span>Water</span><span>Light</span><span>One page</span></div>,
      <blockquote key="d" className={styles.quote}>The morning you protect pays for the afternoon you will not.</blockquote>,
    ],
  },
  {
    id: 'market', eyebrow: 'Out and about', title: 'The night market guide', color: '#2f6f5a',
    art: <><span style={circle(180, { left: -40, bottom: -70, background: '#ffffff22' })} /><span style={circle(90, { right: 40, top: 70, background: '#f4c95d' })} /><span style={circle(40, { right: 150, bottom: 40, background: '#e86f51' })} /></>,
    blocks: [
      <p key="a" className={styles.lead}>Go hungry. Go late.</p>,
      <p key="b" className={styles.text}>Walk the whole row once before you buy anything. The best stall is rarely the first one with a queue.</p>,
      <div key="c" className={styles.chips}><span>Cash</span><span>Small bags</span><span>Share plates</span></div>,
      <blockquote key="d" className={styles.quote}>Order one thing at every stall and finish none of it.</blockquote>,
    ],
  },
  {
    id: 'tools', eyebrow: 'Make something', title: 'Small tools that last', color: '#5b5bb5',
    art: <><span style={circle(210, { right: -70, top: -70, background: '#ffffff26' })} /><span style={{ position: 'absolute', left: 36, bottom: 30, width: 110, height: 14, borderRadius: 7, background: '#ffffff80', transform: 'rotate(-18deg)' }} /></>,
    blocks: [
      <p key="a" className={styles.lead}>Do one thing, and do it well.</p>,
      <p key="b" className={styles.text}>A tool you finish in a weekend and still use in five years beats a platform you never ship.</p>,
      <div key="c" className={styles.chips}><span>Scope</span><span>Ship</span><span>Repeat</span></div>,
      <blockquote key="d" className={styles.quote}>Boring and finished wins.</blockquote>,
    ],
  },
];

type Active = { id: string; origin: Rect; size: { width: number; height: number }; reduce: boolean };

export function ExpandingCardPreview() {
  const reduce = useReducedMotion() ?? false;
  const stage = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [active, setActive] = useState<Active | null>(null);
  const [log, setLog] = useState('Tap a card.');
  const p = useMotionValue(0);
  const dragX = useMotionValue(0);
  const closing = useRef(false);

  const open = useCallback((id: string) => {
    const host = stage.current; const card = cardRefs.current[id];
    if (!host || !card || active || closing.current) return;
    const h = host.getBoundingClientRect(); const c = card.getBoundingClientRect();
    p.set(0); dragX.set(0);
    setActive({ id, origin: { x: c.left - h.left, y: c.top - h.top, width: c.width, height: c.height }, size: { width: h.width, height: h.height }, reduce });
    setLog(`Opened: ${STORIES.find(s => s.id === id)?.title}`);
  }, [active, dragX, p, reduce]);

  const springTo = useCallback((to: number, done?: () => void) => {
    const options = reduce ? { duration: 0.16, ease: 'easeOut' as const } : { type: 'spring' as const, stiffness: to === 1 ? 190 : 230, damping: to === 1 ? 24 : 26, mass: 1 };
    animate(p, to, { ...options, onComplete: done });
  }, [p, reduce]);

  const close = useCallback(() => {
    if (!active || closing.current) return;
    closing.current = true;
    const id = active.id;
    animate(dragX, 0, { type: 'spring', stiffness: 260, damping: 28 });
    springTo(0, () => { closing.current = false; setActive(null); p.set(0); window.setTimeout(() => cardRefs.current[id]?.focus({ preventScroll: true }), 40); });
    setLog('Closed.');
  }, [active, dragX, p, springTo]);

  useEffect(() => {
    if (!active) return;
    springTo(1);
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  const bgScale = useTransform(p, value => reduce ? 1 : lerp(1, BACKGROUND_SCALE, Math.min(1, Math.max(0, value))));
  const dim = useTransform(p, value => lerp(0, DIM_OPACITY, Math.min(1, Math.max(0, value))));

  return <div className={styles.stage}>
    <div ref={stage} className={styles.phone} data-open={active ? 'true' : 'false'}>
      <motion.div className={styles.feed} style={{ scale: bgScale }} aria-hidden={active ? true : undefined} {...(active ? { inert: '' as unknown as boolean } : {})}>
        <p className={styles.date}>MONDAY, OCTOBER 12</p>
        <h3 className={styles.today}>Today</h3>
        {STORIES.map(story => <button key={story.id} ref={node => { cardRefs.current[story.id] = node; }} className={styles.card} data-hidden={active?.id === story.id ? 'true' : 'false'} style={{ background: story.color, height: CARD_H, borderRadius: CARD_RADIUS }} onClick={() => open(story.id)} aria-label={`${story.eyebrow}. ${story.title}`} aria-haspopup="dialog">
          <span className={styles.art} aria-hidden="true">{story.art}</span>
          <span className={styles.eyebrow}>{story.eyebrow.toUpperCase()}</span>
          <span className={styles.cardTitle} style={{ fontSize: CARD_TITLE, lineHeight: 1.08 }}>{story.title}</span>
        </button>)}
      </motion.div>
      <motion.div className={styles.dim} style={{ opacity: dim }} aria-hidden="true" />
      {active ? <Detail key={active.id} active={active} story={STORIES.find(s => s.id === active.id)!} p={p} dragX={dragX} onClose={close} springTo={springTo} /> : null}
    </div>
    <p className={styles.log} aria-live="polite">{log}</p>
  </div>;
}

function Detail({ active, story, p, dragX, onClose, springTo }: { active: Active; story: Story; p: ReturnType<typeof useMotionValue<number>>; dragX: ReturnType<typeof useMotionValue<number>>; onClose: () => void; springTo: (to: number, done?: () => void) => void }) {
  const { origin, size, reduce } = active;
  const hero = heroHeightFor(origin.height, HERO_H, size.height);
  const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
  const left = useTransform(p, v => lerp(origin.x, 0, clamp01(v)));
  const top = useTransform(p, v => lerp(origin.y, 0, clamp01(v)));
  const width = useTransform(p, v => lerp(origin.width, size.width, clamp01(v)));
  const height = useTransform(p, v => lerp(origin.height, size.height, clamp01(v)));
  const radius = useTransform(p, v => cornerRadius(clamp01(v), CARD_RADIUS, 0));
  const heroH = useTransform(p, v => lerp(origin.height, hero, clamp01(v)));
  const titleSize = useTransform(p, v => lerp(CARD_TITLE, OPEN_TITLE, clamp01(v)));
  const padTop = useTransform(p, v => lerp(20, 30, clamp01(v)));
  const chrome = useTransform(p, v => clamp01((v - 0.6) / 0.4));
  const shadow = useTransform(p, v => `0 ${lerp(10, 22, clamp01(v))}px ${lerp(24, 60, clamp01(v))}px rgba(0,0,0,${lerp(0.12, 0.3, clamp01(v))})`);
  const frame = useRef<HTMLDivElement | null>(null);
  const scroller = useRef<HTMLDivElement | null>(null);
  const closeButton = useRef<HTMLButtonElement | null>(null);
  const latest = useRef({ size, onClose, springTo });
  latest.current = { size, onClose, springTo };

  useEffect(() => { const t = window.setTimeout(() => closeButton.current?.focus({ preventScroll: true }), 300); return () => window.clearTimeout(t); }, []);

  // Drag to dismiss: mouse and touch. Touch uses a non-passive listener so the page does not scroll under the drag.
  useEffect(() => {
    const element = frame.current; const scrollEl = scroller.current;
    if (!element || !scrollEl) return;
    let startX = 0, startY = 0, dragging = false, tracking = false, lastDy = 0, lastT = 0, vy = 0;
    const begin = (x: number, y: number) => { startX = x; startY = y; tracking = true; dragging = false; lastDy = 0; lastT = performance.now(); vy = 0; };
    const move = (x: number, y: number, event: Event) => {
      if (!tracking) return;
      const dx = x - startX, dy = y - startY;
      if (!dragging) {
        if (!shouldCaptureDismiss(scrollEl.scrollTop, dx, dy)) { if (Math.abs(dy) > 12 || Math.abs(dx) > 12) tracking = scrollEl.scrollTop <= 0 && dy > 0 ? tracking : false; return; }
        dragging = true; scrollEl.style.overflowY = 'hidden';
      }
      if (event.cancelable) event.preventDefault();
      const now = performance.now();
      vy = (dy - lastDy) / Math.max(1, now - lastT); lastT = now;
      const progress = dragToProgress(dy, latest.current.size.height);
      p.set(progress); dragX.set(dragTranslateX(dx, progress));
      if (crossedDismiss(lastDy, dy)) element.dataset.past = String(dy > 140);
      lastDy = dy;
    };
    const finish = () => {
      if (!tracking) return; tracking = false;
      if (!dragging) return; dragging = false; scrollEl.style.overflowY = '';
      if (dismissOutcome(lastDy, vy) === 'close') { latest.current.onClose(); return; }
      animate(dragX, 0, { type: 'spring', stiffness: 220, damping: 22 });
      latest.current.springTo(1);
    };
    const ts = (e: TouchEvent) => begin(e.touches[0].clientX, e.touches[0].clientY);
    const tm = (e: TouchEvent) => move(e.touches[0].clientX, e.touches[0].clientY, e);
    const md = (e: MouseEvent) => { if (e.button !== 0) return; begin(e.clientX, e.clientY); };
    const mm = (e: MouseEvent) => move(e.clientX, e.clientY, e);
    element.addEventListener('touchstart', ts, { passive: true });
    element.addEventListener('touchmove', tm, { passive: false });
    element.addEventListener('touchend', finish); element.addEventListener('touchcancel', finish);
    element.addEventListener('mousedown', md); window.addEventListener('mousemove', mm); window.addEventListener('mouseup', finish);
    return () => {
      element.removeEventListener('touchstart', ts); element.removeEventListener('touchmove', tm);
      element.removeEventListener('touchend', finish); element.removeEventListener('touchcancel', finish);
      element.removeEventListener('mousedown', md); window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', finish);
    };
  }, [dragX, p]);

  return <motion.div ref={frame} role="dialog" aria-modal="true" aria-label={`${story.title}, details`} className={styles.detail} data-testid="expanding-detail"
    style={{ left, top, width, height, borderRadius: radius, x: dragX, boxShadow: shadow }}>
    <div ref={scroller} className={styles.scroll} style={{ width: size.width }}>
      <motion.div className={styles.hero} style={{ height: heroH, background: story.color, paddingTop: padTop }}>
        <span className={styles.art} aria-hidden="true">{story.art}</span>
        <span className={styles.eyebrow}>{story.eyebrow.toUpperCase()}</span>
        <motion.h4 className={styles.openTitle} style={{ fontSize: titleSize }}>{story.title}</motion.h4>
      </motion.div>
      <div className={styles.sheet}>
        {story.blocks.map((block, index) => <motion.div key={index}
          initial={{ opacity: 0, y: reduce ? 0 : 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduce ? { duration: 0.12 } : { type: 'spring', stiffness: 170, damping: 20, delay: staggerDelay(index) / 1000 }}>{block}</motion.div>)}
        <p className={styles.hint}>Drag down to close · Esc</p>
      </div>
    </div>
    <motion.button ref={closeButton} className={styles.close} style={{ opacity: chrome }} onClick={onClose} aria-label="Close" type="button">✕</motion.button>
  </motion.div>;
}
export { STAGGER_MS };
