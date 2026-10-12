"use client";
import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { bubbleLeft, chartGeometry, DEMO_DATA, nearestIndex } from '../../packages/ui/src/components/scrub-chart/chartMath';
import styles from './scrub-chart.module.css';
const W = 300, H = 220, g = chartGeometry(DEMO_DATA, W, H);
export function ScrubChartPreview() {
  const systemReduce = useReducedMotion(), [forced, setForced] = useState(false), reduce = !!systemReduce || forced;
  const [index, setIndex] = useState(0), [replay, setReplay] = useState(0);
  const point = g.points[index], drag = useRef(false), [length, setLength] = useState(500);
  const line = useRef<SVGPathElement>(null);
  useEffect(() => { if (line.current) setLength(line.current.getTotalLength()); }, []);
  function choose(x: number) { setIndex(nearestIndex(x, g.points)); }
  function local(e: React.PointerEvent) { const r = e.currentTarget.getBoundingClientRect(); return (e.clientX - r.left) * W / r.width; }
  function key(e: React.KeyboardEvent) {
    let i = index;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') i++;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') i--;
    else if (e.key === 'Home') i = 0;
    else if (e.key === 'End') i = g.points.length - 1;
    else return;
    e.preventDefault(); setIndex(Math.max(0, Math.min(g.points.length - 1, i)));
  }
  return <div className={styles.root}>
    <div className={styles.header}><small>WEEKLY ACTIVITY · SAMPLE DATA</small><h3>Small steps, steady gains.</h3></div>
    <div className={styles.stage} data-chart-stage role="slider" tabIndex={0} aria-label="Weekly activity, sample data" aria-valuemin={0} aria-valuemax={6} aria-valuenow={index} aria-valuetext={`${point.label}, ${point.value} points`} onKeyDown={key}
      onPointerDown={e => { drag.current = true; e.currentTarget.focus(); e.currentTarget.setPointerCapture(e.pointerId); choose(local(e)); }}
      onPointerMove={e => { if (drag.current) choose(local(e)); }} onPointerUp={() => { drag.current = false; }} onPointerCancel={() => { drag.current = false; }}>
      <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <defs><linearGradient id="nativelet-chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#57dfb6" stopOpacity=".5"/><stop offset="1" stopColor="#57dfb6" stopOpacity="0"/></linearGradient><clipPath id="nativelet-chart-clip"><motion.rect key={`clip-${replay}-${reduce}`} x={0} y={0} height={H} initial={{ width: reduce ? W : 0 }} animate={{ width: W }} transition={{ duration: reduce ? 0 : 1.1, ease: [0.22,1,0.36,1] }} /></clipPath></defs>
        {[0,.5,1].map(t => <line key={t} x1={g.left} x2={g.right} y1={g.top+t*(g.bottom-g.top)} y2={g.top+t*(g.bottom-g.top)} stroke="#294641" />)}
        <path d={g.area} fill="url(#nativelet-chart-fill)" clipPath="url(#nativelet-chart-clip)"/>
        <motion.path ref={line} key={`line-${replay}-${reduce}`} d={g.line} fill="none" stroke="#57dfb6" strokeWidth={3} strokeLinecap="round" strokeDasharray={length} initial={{ strokeDashoffset: reduce ? 0 : length }} animate={{ strokeDashoffset: 0 }} transition={{ duration: reduce ? 0 : 1.1, ease: [0.22,1,0.36,1] }}/>
        <motion.g animate={{ opacity: 1 }} initial={{ opacity: reduce ? 1 : 0 }} transition={{ delay: reduce ? 0 : .8 }} key={`cursor-${replay}-${reduce}`}><line x1={point.x} x2={point.x} y1={g.top} y2={g.bottom} stroke="#a5cec4"/><circle cx={point.x} cy={point.y} r={10} fill="#57dfb633"/><circle cx={point.x} cy={point.y} r={4.5} fill="#57dfb6"/><circle cx={point.x} cy={point.y} r={2} fill="#132d2b"/></motion.g>
        <text x={18} y={211} fill="#accec3" fontSize={11}>Mon</text><text x={282} y={211} textAnchor="end" fill="#accec3" fontSize={11}>Sun</text>
      </svg>
      <div className={styles.bubble} style={{ left: `${bubbleLeft(point.x,W)/W*100}%` }}>{point.label} · {point.value} pts</div>
    </div>
    <div className={styles.controls}><button onClick={() => setReplay(v=>v+1)}>Replay</button><button aria-pressed={forced} onClick={() => setForced(v=>!v)}>Motion: {reduce ? 'reduced' : 'system'}</button></div>
    <p className={styles.note}>Drag, or focus and use the arrow keys.<br/>SVG adapter, not Skia. Source uses Skia + Reanimated.</p>
  </div>;
}
