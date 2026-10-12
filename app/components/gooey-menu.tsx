"use client";
import { useEffect, useId, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { gooMatrix, itemPose, layout, mainRotation, type GooeyGeometry } from '../../packages/ui/src/components/gooey-menu/gooeyMath';
import styles from './gooey-menu.module.css';
const items = [
  { id: 'note', label: 'New note', glyph: '✎' },
  { id: 'photo', label: 'Add photo', glyph: '◐' },
  { id: 'voice', label: 'Record voice memo', glyph: '●' },
  { id: 'link', label: 'Save link', glyph: '↗' },
];
const MAIN = 32, ITEM = 26, DISTANCE = 104, BLUR = 9, color = '#204835';
const box = layout(DISTANCE, MAIN, ITEM, 24);
type Progress = ReturnType<typeof useMotionValue<number>>;
function Blob({ progress, index, geo }: { progress: Progress; index: number; geo: GooeyGeometry }) {
  const cx = useTransform(progress, p => geo.originX + itemPose(p, index, items.length, geo).x), cy = useTransform(progress, p => geo.originY + itemPose(p, index, items.length, geo).y), r = useTransform(progress, p => itemPose(p, index, items.length, geo).radius);
  return <motion.circle cx={cx} cy={cy} r={r} />;
}
function Item({ progress, index, geo, open, choose }: { progress: Progress; index: number; geo: GooeyGeometry; open: boolean; choose: (i: number) => void }) {
  const x = useTransform(progress, p => itemPose(p, index, items.length, geo).x), y = useTransform(progress, p => itemPose(p, index, items.length, geo).y), opacity = useTransform(progress, p => Math.max(0, Math.min(1, (itemPose(p, index, items.length, geo).t - 0.5) / 0.4))), scale = useTransform(progress, p => Math.max(0.01, Math.min(1.2, itemPose(p, index, items.length, geo).radius / ITEM)));
  return <motion.button type="button" className={styles.item} aria-label={items[index].label} disabled={!open} tabIndex={open ? 0 : -1} aria-hidden={!open} style={{ left: geo.originX - ITEM, top: geo.originY - ITEM, width: ITEM * 2, height: ITEM * 2, x, y, opacity, scale, pointerEvents: open ? 'auto' : 'none' }} onClick={() => choose(index)}>{items[index].glyph}</motion.button>;
}
export function GooeyMenuPreview() {
  const systemReduce = useReducedMotion(), [forcedReduce, setForcedReduce] = useState(false), reduce = !!systemReduce || forcedReduce;
  const progress = useMotionValue(0), [open, setOpen] = useState(false), [last, setLast] = useState('Nothing yet'), [announce, setAnnounce] = useState('');
  const anim = useRef<ReturnType<typeof animate>>(), mainRef = useRef<HTMLButtonElement>(null), id = useId().replace(/:/g, '');
  const geo: GooeyGeometry = { distance: DISTANCE, mainRadius: MAIN, itemRadius: ITEM, start: -165, end: -15, stagger: reduce ? 0 : 0.3, originX: box.originX, originY: box.originY };
  const rotate = useTransform(progress, p => mainRotation(p));
  useEffect(() => () => anim.current?.stop(), []);
  function move(next: boolean) { setOpen(next); setAnnounce(next ? 'Create menu open' : 'Create menu closed'); anim.current?.stop(); anim.current = animate(progress, next ? 1 : 0, reduce ? { duration: 0.14 } : { type: 'spring', stiffness: 170, damping: 14, mass: 1 }); }
  function choose(i: number) { setLast(items[i].label); move(false); mainRef.current?.focus(); }
  const m = gooMatrix();
  return <div className={styles.root}>
    <div className={styles.status} aria-live="polite">Last action: {last}</div>
    <div className={styles.stage} style={{ width: box.width, height: box.height }} data-gooey-stage onKeyDown={e => { if (e.key === 'Escape' && open) { e.preventDefault(); e.stopPropagation(); move(false); mainRef.current?.focus(); } }}>
      <svg className={styles.svg} width={box.width} height={box.height} viewBox={`0 0 ${box.width} ${box.height}`} aria-hidden="true" data-gooey-svg>
        <defs><filter id={`goo-${id}`} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB"><feGaussianBlur stdDeviation={BLUR} /><feColorMatrix type="matrix" values={m.join(' ')} /></filter></defs>
        <g filter={`url(#goo-${id})`} fill={color}><circle cx={box.originX} cy={box.originY} r={MAIN} />{items.map((it, i) => <Blob key={it.id} progress={progress} index={i} geo={geo} />)}</g>
      </svg>
      {items.map((it, i) => <Item key={it.id} progress={progress} index={i} geo={geo} open={open} choose={choose} />)}
      <button ref={mainRef} type="button" className={styles.main} aria-label="Create" aria-expanded={open} style={{ left: box.originX - MAIN, top: box.originY - MAIN, width: MAIN * 2, height: MAIN * 2 }} onClick={() => move(!open)}><motion.span className={styles.plus} style={{ rotate }} /></button>
    </div>
    <span className="sr-only" role="status" aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{announce}</span>
    <div className={styles.note}><span>Tap the plus. Escape closes.</span><button aria-pressed={forcedReduce} onClick={() => setForcedReduce(!forcedReduce)}>Motion: {reduce ? 'reduced' : 'system'}</button></div>
  </div>;
}
// End of Gooey Menu web preview.
