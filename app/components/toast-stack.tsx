"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, type PanInfo } from 'framer-motion';
import { remainingAfterPause, shouldDismiss, upsertToast, visibleToasts, type ToastOptions, type ToastRecord } from '../../packages/ui/src/components/toast-stack/toastLogic';
import styles from './toast-stack.module.css';
let sequence = 0;
export function ToastStackPreview() {
  const [items, setItems] = useState<ToastRecord[]>([]);
  const [position, setPosition] = useState<'top'|'bottom'>('bottom');
  const toast = useCallback((options: ToastOptions) => {
    const id = options.id ?? `preview-${++sequence}`;
    setItems(previous => upsertToast(previous, options, id));
  }, []);
  const dismiss = useCallback((id: string) => setItems(previous => previous.filter(item => item.id !== id)), []);
  const visible = visibleToasts(items, 3);
  return <div className={styles.stage}>
    <div className={styles.toolbar}>
      <button onClick={() => toast({ message: 'Saved to collection', description: 'A little less to carry.', variant: 'success', action: { label: 'Undo', onPress: () => toast({ message: 'Save undone', variant: 'info' }) } })}>Save + Undo</button>
      <button onClick={() => { for(let i=1;i<=5;i++) toast({ message: `Message ${i} of 5`, description: 'My timer starts when I appear.', duration: 4000 }); }}>Queue five</button>
      <button onClick={() => toast({ id: 'error', message: 'Upload failed', description: 'Check your connection and try again.', variant: 'error', duration: 0 })}>Persistent error</button>
      <button onClick={() => setPosition(position === 'top' ? 'bottom' : 'top')}>Position: {position}</button>
      <button onClick={() => setItems([])}>Clear all</button>
    </div>
    <p className={styles.hint}>Swipe a card in any direction. Hold to pause. {Math.max(0, items.length-visible.length)} queued.</p>
    <div className={styles.canvas} aria-label="Toast playground">
      <span className={styles.caption}>A SMALL MOMENT OF FEEDBACK</span>
      <div className={`${styles.stack} ${position === 'top' ? styles.top : styles.bottom}`}>
        {visible.map((item) => <Card key={item.id} item={item} dismiss={dismiss} />)}
      </div>
    </div>
    <p className={styles.hint}>Web adapter of the RN source. Try the Expo screen for React Native Web rendering.</p>
  </div>;
}
function Card({ item, dismiss }: { item: ToastRecord; dismiss: (id: string) => void }) {
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const reduced = useReducedMotion();
  const remaining = useRef(item.duration);
  const block = useRef(0);
  useEffect(() => { remaining.current = item.duration; }, [item.revision, item.duration]);
  useEffect(() => {
    const update = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', update); update();
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  useEffect(() => {
    if (paused || hidden || item.duration === 0 || !Number.isFinite(remaining.current)) return;
    const start = Date.now(); const timer = setTimeout(() => dismiss(item.id), remaining.current);
    return () => { clearTimeout(timer); remaining.current = remainingAfterPause(remaining.current,start,Date.now()); };
  }, [paused, hidden, item.revision, item.id, item.duration, dismiss]);
  function release(_: MouseEvent|TouchEvent|PointerEvent, info: PanInfo) {
    block.current = Date.now()+200;
    if (shouldDismiss(info.offset.x,info.offset.y,info.velocity.x/1000,info.velocity.y/1000)) dismiss(item.id);
    setPaused(false);
  }
  return <motion.div layout={!reduced} initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity:1, y:0 }} transition={{ type:'spring', stiffness:260, damping:24 }} drag dragConstraints={{ left:0, right:0, top:0, bottom:0 }} dragElastic={1} onDragStart={() => setPaused(true)} onDragEnd={release} onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)} onPointerCancel={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }} className={styles.card} style={{ touchAction:'none' }}>
    <div role="status" className={styles.text}><strong className={item.variant === 'error' ? styles.error : ''}>{item.variant === 'success' ? '✓ ' : item.variant === 'error' ? '! ' : item.variant === 'info' ? 'i ' : ''}{item.message}</strong>{item.description && <span>{item.description}</span>}</div>
    {item.action && <button onClick={() => { if(Date.now()<block.current)return;try{item.action?.onPress();}finally{dismiss(item.id);} }}>{item.action.label}</button>}
    <button aria-label={`Dismiss ${item.message}`} onClick={() => { if(Date.now()>=block.current)dismiss(item.id); }}>×</button>
  </motion.div>;
}
