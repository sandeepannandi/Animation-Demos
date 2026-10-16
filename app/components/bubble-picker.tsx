"use client";
import { useEffect, useReducer, useRef, useState } from 'react';
import { insetBounds, pickBody, popKick, shade, spawnBodies, stepBodies, wobbleScale, DEFAULT_PHYSICS, type BubbleBody } from '../../packages/ui/src/components/bubble-picker/physicsMath';
import styles from './bubble-picker.module.css';

const topics = [
  { id: 'music', label: 'Music', color: '#e2725b' },
  { id: 'travel', label: 'Travel', color: '#5ca4a9' },
  { id: 'food', label: 'Food', color: '#f2a65a' },
  { id: 'tech', label: 'Tech', color: '#8e7cc3' },
  { id: 'art', label: 'Art', color: '#d6679a' },
  { id: 'sport', label: 'Sport', color: '#7fb069' },
  { id: 'books', label: 'Books', color: '#f0c05a' },
  { id: 'film', label: 'Film', color: '#588b8b' },
  { id: 'photo', label: 'Photo', color: '#c8553d' },
  { id: 'games', label: 'Games', color: '#5b8e7d' },
];
const W = 340, H = 380, PAD = 10;
const bounds = insetBounds(W, H, PAD);
function inkFor(color: string) { const n = parseInt(color.slice(1), 16); const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; return r * 0.3 + g * 0.59 + b * 0.11 > 150 ? '#23312b' : '#ffffff'; }

export function BubblePickerPreview() {
  const [selected, setSelected] = useState<string[]>([]);
  const [slow, setSlow] = useState(false);
  const [forcedReduce, setForcedReduce] = useState(false);
  const [systemReduce, setSystemReduce] = useState(false);
  const reduce = systemReduce || forcedReduce;
  const bodies = useRef<BubbleBody[]>(spawnBodies(topics, bounds));
  const pointer = useRef({ x: 0, y: 0, active: 0 });
  const grabbed = useRef(-1);
  const trail = useRef<{ x: number; y: number; t: number }[]>([]);
  const downAt = useRef<{ x: number; y: number; t: number } | null>(null);
  const groups = useRef<(SVGGElement | null)[]>([]);
  const balls = useRef<(SVGCircleElement | null)[]>([]);
  const rings = useRef<(SVGCircleElement | null)[]>([]);
  const labels = useRef<(SVGTextElement | null)[]>([]);
  const selRef = useRef(selected);
  selRef.current = selected;
  const [, bump] = useReducer((c: number) => c + 1, 0);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setSystemReduce(mq.matches);
    const fn = (e: MediaQueryListEvent) => setSystemReduce(e.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  useEffect(() => {
    let raf = 0, last = performance.now();
    const tick = (now: number) => {
      const rawDt = Math.min(now - last, 48); last = now;
      const dt = reduce ? rawDt : slow ? rawDt * 0.25 : rawDt;
      const opts = reduce ? { ...DEFAULT_PHYSICS, gravity: 0, drag: 2.6 } : DEFAULT_PHYSICS;
      let next = stepBodies(bodies.current, dt, bounds, pointer.current, opts);
      if (reduce) next = next.map(b => ({ ...b, wob: 0, wobV: 0, scale: 1, scaleV: 0 }));
      bodies.current = next;
      for (let i = 0; i < next.length; i++) {
        const b = next[i], g = groups.current[i], ball = balls.current[i], ring = rings.current[i], label = labels.current[i];
        if (!g || !ball || !ring || !label) continue;
        const w = wobbleScale(b.wob);
        g.setAttribute('transform', `translate(${b.x} ${b.y}) scale(${w.scaleX} ${w.scaleY})`);
        const r = b.r * b.scale;
        ball.setAttribute('r', String(r));
        ring.setAttribute('r', String(r));
        ring.setAttribute('opacity', String(b.selected));
        label.setAttribute('x', String(b.x)); label.setAttribute('y', String(b.y));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [slow, reduce]);

  function toggle(id: string) {
    const cur = selRef.current, on = cur.includes(id);
    setSelected(on ? cur.filter(x => x !== id) : [...cur, id]);
    bodies.current = bodies.current.map(b => b.id === id ? { ...b, selected: on ? 0 : 1, scaleV: b.scaleV + popKick(on ? 0 : 1) } : b);
    bump();
  }
  function localPoint(e: React.PointerEvent) {
    const el = e.currentTarget as HTMLElement, rect = el.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * W, y: ((e.clientY - rect.top) / rect.height) * H };
  }
  function onDown(e: React.PointerEvent) {
    const p = localPoint(e);
    downAt.current = { ...p, t: performance.now() };
    trail.current = [{ ...p, t: performance.now() }];
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }
  function onMove(e: React.PointerEvent) {
    const down = downAt.current; if (!down) return;
    const p = localPoint(e), now = performance.now();
    trail.current.push({ ...p, t: now });
    if (trail.current.length > 6) trail.current.shift();
    if (grabbed.current < 0 && Math.hypot(p.x - down.x, p.y - down.y) > 6) {
      const idx = pickBody(bodies.current, down.x, down.y);
      grabbed.current = idx;
      if (idx >= 0) bodies.current = bodies.current.map((b, i) => (i === idx ? { ...b, grabbed: 1 } : b));
    }
    if (grabbed.current >= 0) pointer.current = { x: p.x, y: p.y, active: 1 };
  }
  function onUp(e: React.PointerEvent) {
    const down = downAt.current; downAt.current = null;
    if (!down) return;
    if (grabbed.current >= 0) {
      const idx = grabbed.current; grabbed.current = -1;
      pointer.current = { x: 0, y: 0, active: 0 };
      const t = trail.current, now = performance.now();
      const old = t.find(s => now - s.t > 70) ?? t[0];
      const lastPt = t[t.length - 1];
      const dtm = Math.max(16, lastPt.t - old.t);
      const vx = ((lastPt.x - old.x) / dtm) * 900, vy = ((lastPt.y - old.y) / dtm) * 900;
      bodies.current = bodies.current.map((b, i) => (i === idx ? { ...b, grabbed: 0, vx, vy } : b));
    } else if (Math.hypot(localPoint(e).x - down.x, localPoint(e).y - down.y) <= 6 && performance.now() - down.t < 600) {
      const idx = pickBody(bodies.current, down.x, down.y);
      if (idx >= 0) toggle(bodies.current[idx].id);
    }
  }
  function onKey(e: React.KeyboardEvent, id: string) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(id); }
  }

  return <div className={styles.root}>
    <div className={styles.status} aria-live="polite">{selected.length === 0 ? 'Tap bubbles to pick topics' : `Picked ${selected.length}: ${selected.join(', ')}`}</div>
    <div className={styles.stage} role="group" aria-label="Choose topics" style={{ width: W, height: H }}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      <svg className={styles.svg} width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <defs>
          {topics.map((t, i) => {
            const b = bodies.current[i], R = b.baseR;
            return <radialGradient key={t.id} id={`bub-${t.id}`} gradientUnits="userSpaceOnUse" cx={-R * 0.3} cy={-R * 0.35} r={R * 1.75}>
              <stop offset="0" stopColor={shade(t.color, 0.55)} /><stop offset="0.55" stopColor={t.color} /><stop offset="1" stopColor={shade(t.color, -0.14)} />
            </radialGradient>;
          })}
        </defs>
        {topics.map((t, i) => {
          const b = bodies.current[i], R = b.baseR;
          return <g key={t.id} className={styles.bubble} role="button" tabIndex={0} aria-label={t.label} aria-pressed={selected.includes(t.id)} onKeyDown={e => onKey(e, t.id)} ref={el => { groups.current[i] = el; }}>
            <circle ref={el => { balls.current[i] = el; }} cx={0} cy={0} r={R} fill={`url(#bub-${t.id})`} />
            <circle cx={-R * 0.3} cy={-R * 0.36} r={R * 0.24} fill="#ffffff" opacity={0.5} />
            <circle className="ring" ref={el => { rings.current[i] = el; }} cx={0} cy={0} r={R} fill="none" stroke="#ffffff" strokeWidth={3.5} opacity={0} />
          </g>;
        })}
        {topics.map((t, i) => <text key={t.id} ref={el => { labels.current[i] = el; }} className={styles.label} x={bodies.current[i].x} y={bodies.current[i].y} fill={inkFor(t.color)}>{t.label}</text>)}
      </svg>
    </div>
    <div className={styles.note}><span>Drag to fling. Tap a bubble to select it.</span><button aria-pressed={slow} onClick={() => setSlow(!slow)}>Slow motion: {slow ? 'on' : 'off'}</button><button aria-pressed={forcedReduce} onClick={() => setForcedReduce(!forcedReduce)}>Motion: {reduce ? 'reduced' : 'system'}</button></div>
  </div>;
}
// End of Bubble Picker web preview.
