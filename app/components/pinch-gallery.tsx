"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { anchorAt, anchorScroll, cellSize, clamp, contentHeight, distance, edgeSpeed, lerpRect, pinchProgress, pinchTarget, rangeSelection, shouldCommit, tileAtPoint, tileRect, type Anchor } from '../../packages/ui/src/components/pinch-gallery/pinchLogic';
import styles from './pinch-gallery.module.css';
const STEPS = [2, 3, 5], GAP = 6, HEIGHT = 400, HOLD = 320;
const hues = [152, 168, 190, 205, 24, 12, 338, 275, 48, 96];
const PHOTOS = Array.from({ length: 48 }, (_, i) => { const hue = hues[(i * 7 + (i >> 2)) % hues.length]; return { id: String(i), title: `Photo ${i + 1}`, base: `hsl(${hue}, 42%, ${46 + (i * 5) % 22}%)`, light: `hsl(${(hue + 24) % 360}, 55%, ${72 + (i * 3) % 14}%)`, shape: i % 3 }; });
const IDS = PHOTOS.map(p => p.id);
type Layout = { from: number; to: number };
export function PinchGalleryPreview() {
  const reduceSystem = useReducedMotion(); const [reduceOverride, setReduceOverride] = useState(false); const reduce = !!(reduceOverride || reduceSystem);
  const reduceRef = useRef(reduce); reduceRef.current = reduce;
  const [cols, setCols] = useState(3); const [layout, setLayoutState] = useState<Layout>({ from: 3, to: 3 }); const layoutRef = useRef(layout);
  const setLayout = (l: Layout) => { layoutRef.current = l; setLayoutState(l); };
  const [t, setT] = useState(0); const tRef = useRef(0); const setTv = (v: number) => { tRef.current = v; setT(v); };
  const [selection, setSelectionState] = useState<string[]>([]); const selRef = useRef<string[]>([]);
  const setSelection = (next: string[]) => { if (next.length === selRef.current.length && next.every((id, i) => id === selRef.current[i])) return; selRef.current = next; setSelectionState(next); };
  const [message, setMessage] = useState('Pinch with two fingers or a trackpad. Hold a photo, then drag to select.');
  const [width, setWidth] = useState(342); const widthRef = useRef(342);
  const viewport = useRef<HTMLDivElement>(null);
  const anchor = useRef<{ a: Anchor; focalY: number } | null>(null); const pinch = useRef<{ d0: number; startCols: number; stepIndex: number; ratio: number } | null>(null);
  const select = useRef<{ base: string[]; from: number; mode: 'add' | 'remove'; last: number } | null>(null);
  const finger = useRef({ x: 0, y: 0 }); const press = useRef<{ timer?: ReturnType<typeof setTimeout>; x: number; y: number; index: number } | null>(null);
  const raf = useRef<number>(); const scrollRaf = useRef<number>(); const wheelTimer = useRef<ReturnType<typeof setTimeout>>(); const animating = useRef(false);
  useEffect(() => { const el = viewport.current!; const ro = new ResizeObserver(() => { widthRef.current = el.clientWidth; setWidth(el.clientWidth); }); ro.observe(el); widthRef.current = el.clientWidth; setWidth(el.clientWidth); return () => ro.disconnect(); }, []);
  const applyAnchor = (value: number) => { const a = anchor.current, el = viewport.current; if (!a || !el) return; el.scrollTop = anchorScroll(a.a, layoutRef.current.from, layoutRef.current.to, value, PHOTOS.length, widthRef.current, GAP, a.focalY, HEIGHT); };
  const animate = (to: number, done: () => void) => {
    cancelAnimationFrame(raf.current!); animating.current = true; const from = tRef.current, start = performance.now(), ms = reduceRef.current ? 100 : 300;
    const step = (now: number) => { const p = clamp((now - start) / ms, 0, 1), eased = 1 - Math.pow(1 - p, 3), v = from + (to - from) * eased; setTv(v); applyAnchor(v); if (p < 1) raf.current = requestAnimationFrame(step); else { animating.current = false; done(); } };
    raf.current = requestAnimationFrame(step);
  };
  const settle = (to: number) => { setLayout({ from: to, to }); setCols(to); anchor.current = null; setTv(0); };
  const local = (clientX: number, clientY: number) => { const r = viewport.current!.getBoundingClientRect(); return { x: clientX - r.left, y: clientY - r.top }; };
  const beginPinch = (d0: number, mid: { x: number; y: number }) => {
    cancelAnimationFrame(raf.current!); animating.current = false; endSelect(true); clearPress();
    const start = layoutRef.current.to, stepIndex = Math.max(0, STEPS.indexOf(start)); setTv(0); setLayout({ from: start, to: start });
    anchor.current = { a: anchorAt(viewport.current!.scrollTop + mid.y, PHOTOS.length, start, widthRef.current, GAP, mid.x), focalY: mid.y };
    pinch.current = { d0: Math.max(1, d0), startCols: start, stepIndex, ratio: 1 };
  };
  const movePinch = (ratio: number, mid: { x: number; y: number }) => {
    const p = pinch.current, a = anchor.current; if (!p || !a) return; p.ratio = ratio; a.focalY = mid.y;
    const target = STEPS[pinchTarget(p.stepIndex, ratio, STEPS)]; if (target !== layoutRef.current.to) setLayout({ from: p.startCols, to: target });
    const progress = target === p.startCols ? 0 : pinchProgress(ratio, cellSize(widthRef.current, p.startCols, GAP), cellSize(widthRef.current, target, GAP)); setTv(progress); applyAnchor(progress);
  };
  const endPinch = () => {
    const p = pinch.current; if (!p) return; pinch.current = null; const to = layoutRef.current.to, commit = to !== p.startCols && shouldCommit(tRef.current), target = commit ? to : p.startCols;
    animate(commit ? 1 : 0, () => { settle(target); setMessage(commit ? `${target} columns.` : 'Eased back.'); });
  };
  const updateSelect = () => { const s = select.current; if (!s) return; const idx = tileAtPoint(finger.current.x, viewport.current!.scrollTop + finger.current.y, PHOTOS.length, layoutRef.current.to, widthRef.current, GAP); if (idx < 0) return; s.last = idx; setSelection(rangeSelection(IDS, s.base, s.from, idx, s.mode)); };
  const startSelect = (index: number) => {
    if (pinch.current || animating.current || select.current) return; clearPress(); const id = IDS[index];
    select.current = { base: [...selRef.current], from: index, last: index, mode: selRef.current.includes(id) ? 'remove' : 'add' }; updateSelect(); setMessage('Selecting. Drag across photos. Keep near an edge to scroll.');
    let last = performance.now(); const tick = (now: number) => { if (!select.current) return; const dt = Math.min(48, now - last); last = now; const el = viewport.current!, speed = edgeSpeed(finger.current.y, HEIGHT); if (speed) { const before = el.scrollTop; el.scrollTop = before + speed * dt / 1000; if (el.scrollTop !== before) updateSelect(); } scrollRaf.current = requestAnimationFrame(tick); }; scrollRaf.current = requestAnimationFrame(tick);
  };
  function endSelect(cancel = false) { const s = select.current; if (!s) return; select.current = null; cancelAnimationFrame(scrollRaf.current!); if (cancel) setSelection(s.base); else setMessage(`${selRef.current.length} selected.`); }
  function clearPress() { if (press.current?.timer) clearTimeout(press.current.timer); press.current = null; }
  const toggle = (index: number) => { const id = IDS[index], cur = selRef.current; setSelection(cur.includes(id) ? cur.filter(x => x !== id) : IDS.filter(x => x === id || cur.includes(x))); };
  const goTo = (n: number) => {
    if (pinch.current || animating.current || n === layoutRef.current.to) return; const el = viewport.current!;
    anchor.current = { a: anchorAt(el.scrollTop + HEIGHT / 2, PHOTOS.length, layoutRef.current.to, widthRef.current, GAP), focalY: HEIGHT / 2 }; setTv(0); setLayout({ from: layoutRef.current.to, to: n }); requestAnimationFrame(() => animate(1, () => { settle(n); setMessage(`${n} columns.`); }));
  };
  const ops = useRef({ beginPinch, movePinch, endPinch, startSelect, updateSelect, endSelect, clearPress, toggle }); ops.current = { beginPinch, movePinch, endPinch, startSelect, updateSelect, endSelect, clearPress, toggle };
  useEffect(() => {
    const el = viewport.current!; const o = () => ops.current;
    const indexFrom = (target: EventTarget | null) => { const node = (target as HTMLElement | null)?.closest?.('[data-index]') as HTMLElement | null; return node ? Number(node.dataset.index) : -1; };
    const startHold = (x: number, y: number, target: EventTarget | null) => { const index = indexFrom(target); finger.current = { x, y }; o().clearPress(); if (index < 0) return; press.current = { x, y, index, timer: setTimeout(() => { press.current && o().startSelect(press.current.index); }, HOLD) }; };
    const touchStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) { const a = local(e.touches[0].clientX, e.touches[0].clientY), b = local(e.touches[1].clientX, e.touches[1].clientY); if (!pinch.current) o().beginPinch(distance(a, b), { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }); return; }
      const p = local(e.touches[0].clientX, e.touches[0].clientY); startHold(p.x, p.y, e.target);
    };
    const touchMove = (e: TouchEvent) => {
      if (pinch.current) { if (e.touches.length >= 2) { const a = local(e.touches[0].clientX, e.touches[0].clientY), b = local(e.touches[1].clientX, e.touches[1].clientY); o().movePinch(distance(a, b) / pinch.current.d0, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }); } if (e.cancelable) e.preventDefault(); return; }
      const p = local(e.touches[0].clientX, e.touches[0].clientY); finger.current = p;
      if (press.current && Math.hypot(p.x - press.current.x, p.y - press.current.y) > 10) o().clearPress();
      if (select.current) { if (e.cancelable) e.preventDefault(); o().updateSelect(); }
    };
    const touchEnd = (e: TouchEvent) => { if (pinch.current && e.touches.length < 2) o().endPinch(); if (e.touches.length === 0) { o().clearPress(); o().endSelect(); } };
    const touchCancel = () => { if (pinch.current) o().endPinch(); o().clearPress(); o().endSelect(true); };
    const down = (e: PointerEvent) => { if (e.pointerType !== 'mouse' || e.button !== 0) return; const p = local(e.clientX, e.clientY); startHold(p.x, p.y, e.target); };
    const move = (e: PointerEvent) => { if (e.pointerType !== 'mouse') return; const p = local(e.clientX, e.clientY); finger.current = p; if (press.current && Math.hypot(p.x - press.current.x, p.y - press.current.y) > 6) o().clearPress(); if (select.current) o().updateSelect(); };
    const up = (e: PointerEvent) => { if (e.pointerType !== 'mouse') return; o().clearPress(); o().endSelect(); };
    let wheelRatio = 1;
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return; e.preventDefault(); const p = local(e.clientX, e.clientY);
      if (!pinch.current) { wheelRatio = 1; o().beginPinch(100, p); }
      wheelRatio = clamp(wheelRatio * Math.exp(-e.deltaY * 0.012), 0.3, 3); o().movePinch(wheelRatio, p); clearTimeout(wheelTimer.current); wheelTimer.current = setTimeout(() => o().endPinch(), 160);
    };
    const suppress = (e: Event) => { if (select.current) e.preventDefault(); };
    el.addEventListener('touchstart', touchStart, { passive: true }); el.addEventListener('touchmove', touchMove, { passive: false }); el.addEventListener('touchend', touchEnd); el.addEventListener('touchcancel', touchCancel);
    el.addEventListener('pointerdown', down); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); el.addEventListener('wheel', wheel, { passive: false }); el.addEventListener('contextmenu', suppress);
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (select.current) o().endSelect(true); } }; window.addEventListener('keydown', key);
    return () => { el.removeEventListener('touchstart', touchStart); el.removeEventListener('touchmove', touchMove); el.removeEventListener('touchend', touchEnd); el.removeEventListener('touchcancel', touchCancel); el.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); el.removeEventListener('wheel', wheel); el.removeEventListener('contextmenu', suppress); window.removeEventListener('keydown', key); cancelAnimationFrame(raf.current!); cancelAnimationFrame(scrollRaf.current!); clearTimeout(wheelTimer.current); clearTimeout(press.current?.timer); };
  }, []);
  const selected = useMemo(() => new Set(selection), [selection]);
  const settled = layout.from === layout.to;
  const full = settled ? contentHeight(PHOTOS.length, layout.to, width, GAP) : Math.max(contentHeight(PHOTOS.length, layout.from, width, GAP), contentHeight(PHOTOS.length, layout.to, width, GAP));
  return <div className={styles.stage}>
    <div className={`${styles.panel} ${reduce ? styles.reduce : ''}`}>
      <div className={styles.head}><div><h3>Library</h3><p className={styles.count}>{selection.length ? `${selection.length} selected` : `${PHOTOS.length} photos`}</p></div>
        {selection.length ? <button className={styles.clear} onClick={() => { setSelection([]); setMessage('Selection cleared.'); }}>Clear</button>
          : <div className={styles.seg} role="group" aria-label="Columns">{STEPS.map(n => <button key={n} aria-pressed={cols === n && settled} aria-label={`${n} columns`} onClick={() => goTo(n)}>{n}</button>)}</div>}
      </div>
      <div ref={viewport} className={styles.viewport} data-testid="pinch-viewport">
        <div className={styles.canvas} style={{ height: full }} role="list" aria-label="Photos">
          {PHOTOS.map((p, i) => { const r = lerpRect(tileRect(i, layout.from, width, GAP), tileRect(i, layout.to, width, GAP), t), sel = selected.has(p.id);
            return <button key={p.id} role="listitem" data-index={i} data-selected={sel} aria-pressed={sel} aria-label={p.title} className={`${styles.tile} ${sel ? styles.selected : ''}`} style={{ left: r.x, top: r.y, width: r.w, height: r.h }}
              onClick={() => { if (selRef.current.length) toggle(i); }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(i); } }}>
              <span className={styles.inner} style={{ background: p.base }}><span className={styles.hill} style={{ background: p.light }} />{p.shape === 0 && <span className={styles.sun} />}{p.shape === 1 && <span className={styles.card} />}</span>
              <span className={styles.badge} aria-hidden="true"><svg viewBox="0 0 12 12"><path d="M2 6.4 4.8 9 10 3.2" /></svg></span>
            </button>; })}
        </div>
      </div>
      <div className={styles.controls}><button onClick={() => setReduceOverride(v => !v)} aria-pressed={reduceOverride}>Motion: {reduce ? 'reduced' : 'system'}</button></div>
    </div>
    <p className={styles.help}>Two-finger pinch, or ctrl + scroll / trackpad pinch. Hold a photo and drag to select. Enter or Space toggles when focused.</p><p className={styles.log} role="status">{message}</p>
  </div>;
}
