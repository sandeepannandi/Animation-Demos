"use client";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { ACTION_WIDTH, dragOffset, isHorizontalIntent, openOffset, outermostIndex, pastCommit, settleOutcome, type SwipeGeometry, type SwipeSide } from '../../packages/ui/src/components/swipe-row/swipeLogic';
import styles from './swipe-row.module.css';

type Action = { id: string; label: string; icon: string; color: string; removes?: boolean; done?: string; run: () => void };
type Message = { id: string; from: string; subject: string; preview: string; time: string; pinned: boolean };
const SEED: Message[] = [
  { id: '1', from: 'Asha Rao', subject: 'Lunch on Thursday?', preview: 'The new place near the station has a table at 1.', time: '9:41', pinned: false },
  { id: '2', from: 'Ravi Iyer', subject: 'Build is green again', preview: 'Reverted the lockfile change and it passes.', time: '9:12', pinned: false },
  { id: '3', from: 'Mina Das', subject: 'Photos from the trip', preview: 'Sending the full album in a minute.', time: 'Yesterday', pinned: false },
  { id: '4', from: 'Kabir Shah', subject: 'Invoice 1042', preview: 'Attached, due at the end of the month.', time: 'Yesterday', pinned: false },
];
const UNDO_MS = 4000;

export function SwipeRowPreview() {
  const [items, setItems] = useState(SEED);
  const [openId, setOpenId] = useState<string | null>(null);
  const [log, setLog] = useState('Swipe a row.');
  const [version, setVersion] = useState(0);
  const drop = useCallback((item: Message, what: string) => { setItems(list => list.filter(entry => entry.id !== item.id)); setLog(`${what}: ${item.subject}`); }, []);
  return <div className={styles.stage}>
    <p className={styles.hint}>Swipe right to pin. Swipe left to archive or delete. Keep going past the line to run the outer action, then undo it. On the keyboard: focus a row, use the arrow keys, Escape closes.</p>
    <div className={styles.list} key={version} aria-label="Messages">
      {items.map(item => {
        const leading: Action[] = [{ id: 'pin', label: item.pinned ? 'Unpin' : 'Pin', icon: '⌃', color: '#d99a2b', run: () => { setItems(list => list.map(entry => entry.id === item.id ? { ...entry, pinned: !entry.pinned } : entry)); setLog(`${item.pinned ? 'Unpinned' : 'Pinned'}: ${item.subject}`); } }];
        const trailing: Action[] = [
          { id: 'archive', label: 'Archive', icon: '▣', color: '#4f8a6a', removes: true, done: 'Archived', run: () => drop(item, 'Archived') },
          { id: 'delete', label: 'Delete', icon: '✕', color: '#b84a4a', removes: true, done: 'Deleted', run: () => drop(item, 'Deleted') },
        ];
        return <Row key={item.id} id={item.id} openId={openId} setOpenId={setOpenId} leading={leading} trailing={trailing} onUndo={a => setLog(`Undid ${a.label.toLowerCase()}: ${item.subject}`)} onTap={() => setLog(`Opened: ${item.subject}`)} label={`${item.pinned ? 'Pinned. ' : ''}${item.from}. ${item.subject}. ${item.preview}`}>
          <div className={styles.body}>
            <div className={styles.head}><strong>{item.pinned ? '▲ ' : ''}{item.from}</strong><span>{item.time}</span></div>
            <div className={styles.subject}>{item.subject}</div><div className={styles.preview}>{item.preview}</div>
          </div>
        </Row>;
      })}
      {items.length === 0 && <p className={styles.empty}>Inbox zero. Reset to try again.</p>}
    </div>
    <p className={styles.log} aria-live="polite">{log}</p>
    <div className={styles.toolbar}><button onClick={() => { setItems(SEED); setOpenId(null); setLog('Swipe a row.'); setVersion(v => v + 1); }}>Reset</button></div>
    <p className={styles.hint}>Web preview of the React Native Swipe Row, using the same gesture rules. Not yet tested on a device.</p>
  </div>;
}

function Row({ id, openId, setOpenId, leading, trailing, onUndo, onTap, label, children }: { id: string; openId: string | null; setOpenId: (id: string | null) => void; leading: Action[]; trailing: Action[]; onUndo: (a: Action) => void; onTap: () => void; label: string; children: ReactNode }) {
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const leadW = useTransform(x, v => Math.max(0, v));
  const trailW = useTransform(x, v => Math.max(0, -v));
  const el = useRef<HTMLDivElement>(null);
  const height = useRef(0);
  const [phase, setPhase] = useState<'idle' | 'pending' | 'gone'>('idle');
  const [side, setSide] = useState<SwipeSide | null>(null);
  const [strip, setStrip] = useState<Action | null>(null);
  const [collapsing, setCollapsing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const drag = useRef({ active: false, started: false, sx: 0, sy: 0, start: 0, samples: [] as { t: number; x: number }[], crossed: false, pointer: -1 });
  const lastDrag = useRef(0);
  const pending = useRef<{ action: Action; timer: ReturnType<typeof setTimeout> | null } | null>(null);
  const geometry = (): SwipeGeometry => ({ rowWidth: el.current?.offsetWidth ?? 0, leadingWidth: leading.length * ACTION_WIDTH, trailingWidth: trailing.length * ACTION_WIDTH, leadingFull: leading.length > 0, trailingFull: trailing.length > 0 });
  const latest = useRef({ leading, trailing });
  latest.current = { leading, trailing };

  const moveTo = useCallback((to: number, velocity = 0, done?: () => void) => {
    const options = reduced ? { duration: 0.14, ease: 'easeOut' as const } : { type: 'spring' as const, stiffness: 320, damping: 26, velocity: velocity * 1000 };
    animate(x, to, { ...options, onComplete: done });
  }, [x, reduced]);
  const close = useCallback(() => { if (phase !== 'idle') return; setSide(null); moveTo(0); }, [moveTo, phase]);
  useEffect(() => { if (openId !== id && side) close(); }, [openId, id, side, close]);

  const finalize = useCallback(() => {
    const current = pending.current; if (!current) return;
    if (current.timer) clearTimeout(current.timer); current.timer = null;
    height.current = el.current?.offsetHeight ?? height.current;
    setCollapsing(true);
    setTimeout(() => { if (pending.current !== current) return; pending.current = null; setPhase('gone'); current.action.run(); }, reduced ? 0 : 230);
  }, [reduced]);
  useEffect(() => () => { const current = pending.current; if (!current) return; pending.current = null; if (current.timer) clearTimeout(current.timer); current.action.run(); }, []);

  const run = useCallback((action: Action, from: SwipeSide) => {
    if (phase !== 'idle') return;
    setSide(null);
    if (!action.removes) { moveTo(0); action.run(); return; }
    const width = el.current?.offsetWidth ?? 0;
    height.current = el.current?.offsetHeight ?? 0;
    setStrip(action); setPhase('pending');
    const entry = { action, timer: setTimeout(finalize, UNDO_MS) as ReturnType<typeof setTimeout> | null };
    pending.current = entry;
    moveTo(from === 'leading' ? width : -width);
  }, [phase, moveTo, finalize]);
  const undo = () => {
    const current = pending.current; if (!current) return;
    if (current.timer) clearTimeout(current.timer);
    pending.current = null; setCollapsing(false); setPhase('idle'); setStrip(null); setSide(null);
    onUndo(current.action); moveTo(0);
  };

  function down(event: ReactPointerEvent<HTMLDivElement>) {
    if (phase !== 'idle' || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const d = drag.current; d.active = true; d.started = false; d.sx = event.clientX; d.sy = event.clientY; d.start = x.get(); d.samples = [{ t: performance.now(), x: event.clientX }]; d.crossed = false; d.pointer = event.pointerId;
  }
  function move(event: ReactPointerEvent<HTMLDivElement>) {
    const d = drag.current; if (!d.active || event.pointerId !== d.pointer) return;
    const dx = event.clientX - d.sx; const dy = event.clientY - d.sy;
    if (!d.started) {
      if (!isHorizontalIntent(dx, dy)) return;
      d.started = true; setDragging(true); setOpenId(id); x.stop();
      d.start = x.get();
      try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* pointer already gone */ }
    }
    x.set(dragOffset(d.start, dx, geometry()));
    d.samples.push({ t: performance.now(), x: event.clientX }); if (d.samples.length > 6) d.samples.shift();
    d.crossed = pastCommit(x.get(), geometry());
  }
  function up(event: ReactPointerEvent<HTMLDivElement>) {
    const d = drag.current; if (!d.active || event.pointerId !== d.pointer) return;
    d.active = false;
    if (!d.started) return;
    setDragging(false); lastDrag.current = Date.now();
    const first = d.samples[0]; const last = d.samples[d.samples.length - 1];
    const vx = last.t - first.t > 0 && performance.now() - last.t < 120 ? (last.x - first.x) / (last.t - first.t) : 0;
    const geo = geometry(); const outcome = settleOutcome(x.get(), vx, geo);
    if (outcome.type === 'close') { setSide(null); moveTo(0, vx); return; }
    if (outcome.type === 'open') { setSide(outcome.side); moveTo(openOffset(outcome.side, geo), vx); return; }
    const list = outcome.side === 'leading' ? latest.current.leading : latest.current.trailing;
    run(list[outermostIndex(outcome.side, list.length)], outcome.side);
  }
  function key(event: KeyboardEvent<HTMLDivElement>) {
    if (phase !== 'idle' || event.target !== event.currentTarget) return;
    const geo = geometry();
    const open = (to: SwipeSide) => { setSide(to); setOpenId(id); moveTo(openOffset(to, geo)); };
    if (event.key === 'ArrowLeft') { event.preventDefault(); if (side === 'leading') close(); else open('trailing'); }
    else if (event.key === 'ArrowRight') { event.preventDefault(); if (side === 'trailing') close(); else open('leading'); }
    else if (event.key === 'Escape' && side) { event.preventDefault(); event.stopPropagation(); close(); }
    else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (side) close(); else onTap(); }
  }
  function layer(which: SwipeSide, actions: Action[]) {
    const outer = outermostIndex(which, actions.length); const shown = side === which;
    return <motion.div key={which} className={`${styles.layer} ${which === 'leading' ? styles.leading : styles.trailing}`} style={{ width: which === 'leading' ? leadW : trailW, pointerEvents: shown ? 'auto' : 'none' }} aria-hidden={!shown} inert={!shown}>
      {actions.map((action, index) => <button key={action.id} type="button" tabIndex={shown ? 0 : -1} className={styles.action} style={{ background: action.color, maxWidth: index === outer ? undefined : ACTION_WIDTH }} onClick={() => run(action, which)}>
        <span aria-hidden="true">{action.icon}</span><span>{action.label}</span>
      </button>)}
    </motion.div>;
  }
  if (phase === 'gone') return null;
  return <motion.div ref={el} className={styles.row} animate={collapsing ? { height: 0 } : { height: 'auto' }} initial={false} transition={{ duration: reduced ? 0 : 0.22, ease: 'easeOut' }} style={collapsing ? { height: height.current } : undefined}>
    {layer('leading', leading)}{layer('trailing', trailing)}
    {phase === 'pending' && strip && <div className={styles.strip} style={{ background: strip.color }} role="status"><span>{strip.done ?? strip.label}</span><button type="button" onClick={undo}>Undo</button></div>}
    <motion.div className={`${styles.content} ${dragging ? styles.dragging : ''}`} style={{ x }} tabIndex={0} role="group" aria-label={label} aria-roledescription="swipeable row" aria-hidden={phase !== 'idle'}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key}
      onClick={() => { if (Date.now() - lastDrag.current < 400) return; if (side) close(); else onTap(); }}>
      {children}
    </motion.div>
  </motion.div>;
}
// Web adapter: shares swipeLogic.ts with the React Native SwipeRow.
