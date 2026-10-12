"use client";
import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { clamp, edgeSpeed, indexAt, move, slotFor } from '../../packages/ui/src/components/drag-to-sort/sortLogic';
import styles from './drag-to-sort.module.css';
const STEP = 82, ROW = 72;
const TASKS = ['Sketch the idea', 'Pick a direction', 'Build the prototype', 'Test the gestures', 'Refine the details', 'Review the source', 'Ship the update', 'Take a breath'].map((title, i) => ({ id: String(i), title, subtitle: i < 3 ? 'Today · Creative work' : 'This week · Small steps' }));
type Drag = { id: string; from: number; to: number; startY: number; startScroll: number; dy: number; localY: number; top: number; settling: boolean; pointer: number };
export function DragToSortPreview() {
  const [order, setOrder] = useState(TASKS.map(t => t.id)); const [active, setActive] = useState<Drag | null>(null);
  const [message, setMessage] = useState('Grab a handle. Keep it near an edge to scroll.');
  const reduceSystem = useReducedMotion(); const [reduceOverride, setReduceOverride] = useState(false); const reduce = reduceOverride || reduceSystem;
  const viewport = useRef<HTMLDivElement>(null); const drag = useRef<Drag | null>(null); const latestOrder = useRef(order); latestOrder.current = order;
  const frameId = useRef<number>(); const last = useRef(0); const timer = useRef<ReturnType<typeof setTimeout>>();
  const handles = useRef<Record<string, HTMLButtonElement | null>>({});
  const refresh = () => { const d = drag.current, el = viewport.current; if (!d || !el || d.settling) return;
    d.top = clamp(d.from * STEP + d.dy + el.scrollTop - d.startScroll, 0, (latestOrder.current.length - 1) * STEP);
    d.to = indexAt(d.top, STEP, latestOrder.current.length); setActive({ ...d });
  };
  const tick = (time: number) => { const d = drag.current, el = viewport.current; if (!d || !el || d.settling) return;
    const dt = Math.min(32, Math.max(0, time - last.current)); last.current = time;
    el.scrollTop += edgeSpeed(d.localY, el.clientHeight) * dt / 1000; refresh(); frameId.current = requestAnimationFrame(tick);
  };
  const stop = () => { if (frameId.current !== undefined) cancelAnimationFrame(frameId.current); };
  const finish = (cancel = false) => { const d = drag.current; if (!d || d.settling) return; stop(); d.settling = true;
    const target = cancel ? d.from : d.to; d.to = target; d.top = target * STEP; setActive({ ...d });
    setMessage(cancel ? 'Canceled. Original order restored.' : `${TASKS.find(t => t.id === d.id)!.title} moved to position ${target + 1}.`);
    timer.current = setTimeout(() => { const next = cancel ? latestOrder.current : move(latestOrder.current, d.from, target); setOrder(next); drag.current = null; setActive(null); handles.current[d.id]?.focus({ preventScroll: true }); }, reduce ? 110 : 380);
  };
  const ops = useRef({ finish }); ops.current = { finish };
  useEffect(() => { const key = (e: KeyboardEvent) => { if (e.key === 'Escape' && drag.current) { e.preventDefault(); e.stopPropagation(); ops.current.finish(true); } }; window.addEventListener('keydown', key, true); const blur = () => ops.current.finish(true); window.addEventListener('blur', blur); return () => { stop(); clearTimeout(timer.current); window.removeEventListener('keydown', key, true); window.removeEventListener('blur', blur); }; }, []);
  function shift(id: string, delta: number) { if (drag.current) return; const from = order.indexOf(id), to = clamp(from + delta, 0, order.length - 1); if (to === from) return; setOrder(move(order, from, to)); setMessage(`${TASKS.find(t => t.id === id)!.title} moved to position ${to + 1}.`); const el = viewport.current; if (el && (to * STEP < el.scrollTop || to * STEP + ROW > el.scrollTop + el.clientHeight)) el.scrollTop = to * STEP; }
  const transition = reduce ? { duration: .1 } : { type: 'spring' as const, stiffness: 310, damping: 27, mass: .8 };
  return <div className={styles.stage}>
    <div className={styles.panel}><p className={styles.eyebrow}>YOUR DAILY LIST</p><h3>Make room.</h3><p className={styles.subtitle}>A little order. A clearer head.</p>
      <div ref={viewport} className={styles.viewport} data-testid="sort-viewport" onScroll={refresh}>
        <div className={styles.canvas} style={{ height: order.length * STEP - 10 }} role="list" aria-label="Tasks in priority order">
          {order.map((id, index) => { const task = TASKS.find(t => t.id === id)!; const lifted = active?.id === id; const slot = active ? slotFor(index, active.from, active.to) : index;
            return <motion.div key={id} role="listitem" data-row={id} data-slot={slot} className={styles.row} initial={false} animate={{ y: lifted ? active.top : slot * STEP, scale: lifted && !reduce ? 1.035 : 1, boxShadow: lifted ? '0 12px 28px #173c2c30' : '0 2px 4px #173c2c05' }} transition={lifted && !active.settling ? { y: { duration: 0 }, scale: transition, boxShadow: transition } : transition} style={{ zIndex: lifted ? 10 : 0 }}>
              <span className={styles.number}>{String(slot + 1).padStart(2,'0')}</span><span className={styles.text}><b>{task.title}</b><small>{task.subtitle}</small></span>
              <button ref={node => { handles.current[id] = node; }} className={styles.handle} aria-label={`Reorder ${task.title}, position ${slot + 1} of ${order.length}`} aria-describedby="sort-help" data-handle={id} onKeyDown={e => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); shift(id, e.key === 'ArrowUp' ? -1 : 1); } }}
                onPointerDown={e => { if (e.button !== 0 || drag.current) return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); const el = viewport.current!; const from = order.indexOf(id); const d: Drag = { id, from, to: from, startY: e.clientY, dy: 0, startScroll: el.scrollTop, localY: e.clientY - el.getBoundingClientRect().top, top: from * STEP, settling: false, pointer: e.pointerId }; drag.current = d; setActive({ ...d }); setMessage(`Lifted ${task.title}. Escape cancels.`); last.current = performance.now(); frameId.current = requestAnimationFrame(tick); }}
                onPointerMove={e => { const d = drag.current; if (!d || d.pointer !== e.pointerId || d.settling) return; d.dy = e.clientY - d.startY; d.localY = e.clientY - viewport.current!.getBoundingClientRect().top; refresh(); }}
                onPointerUp={() => finish()} onPointerCancel={() => finish(true)} onLostPointerCapture={() => { if (drag.current && !drag.current.settling) finish(true); }}><span aria-hidden="true">⠿</span></button>
            </motion.div>;
          })}
        </div>
      </div>
      <div className={styles.controls}><button onClick={() => finish(true)} disabled={!active || active.settling}>Cancel</button><button onClick={() => setReduceOverride(v => !v)} aria-pressed={reduceOverride}>Motion: {reduce ? 'reduced' : 'system'}</button></div>
    </div>
    <p className={styles.help} id="sort-help">Grab the dotted handle. Arrows reorder when focused. Escape cancels.</p><p className={styles.log} role="status">{message}</p>
  </div>;
}
