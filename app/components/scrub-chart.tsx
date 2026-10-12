"use client";
import { useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { bubbleLeft, chartGeometry, clamp, curveY, DEMO_DATA, nearestIndex, revealPhase } from '../../packages/ui/src/components/scrub-chart/chartMath';
import styles from './scrub-chart.module.css';
const W = 300, H = 220, g = chartGeometry(DEMO_DATA, W, H);
export function ScrubChartPreview() {
  const systemReduce = useReducedMotion(), [forced, setForced] = useState(false), reduce = !!systemReduce || forced;
  const [index, setIndex] = useState(0), [replay, setReplay] = useState(0);
  const point = g.points[index], drag = useRef(false), [length, setLength] = useState(500);
  const line = useRef<SVGPathElement>(null);
  const clock = useMotionValue(0), rawX = useMotionValue(point.x);
  const springX = useSpring(rawX, { stiffness: 300, damping: 24, mass: 0.8 });
  const cx = useTransform(springX, x => clamp(x, g.left, g.right));
  const cy = useTransform(cx, x => curveY(x, g.points, g.segments));
  const bubbleX = useTransform(cx, x => `${bubbleLeft(x, W) / W * 100}%`);
  const offset = useTransform(clock, t => length * (1 - revealPhase(t, 0, .72)));
  const areaWidth = useTransform(clock, t => W * revealPhase(t, .16, .86));
  const areaOpacity = useTransform(clock, t => revealPhase(t, .16, .86));
  const entrance = useTransform(clock, t => revealPhase(t, .62, 1));
  const bubbleY = useTransform(entrance, t => 6 * (1 - t));
  useEffect(() => {
    clock.set(reduce ? 1 : 0);
    if (reduce) return;
    const animation = animate(clock, 1, { duration: 1.45, ease: 'linear' });
    return () => animation.stop();
  }, [clock, reduce, replay]);
  useEffect(() => { rawX.set(point.x); if (reduce) springX.jump(point.x); }, [point.x, rawX, springX, reduce]);
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
        <defs><linearGradient id="nativelet-chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#57dfb6" stopOpacity=".5"/><stop offset="1" stopColor="#57dfb6" stopOpacity="0"/></linearGradient><clipPath id="nativelet-chart-clip"><motion.rect x={0} y={0} height={H} width={areaWidth} /></clipPath></defs>
        {[0,.5,1].map(t => <line key={t} x1={g.left} x2={g.right} y1={g.top+t*(g.bottom-g.top)} y2={g.top+t*(g.bottom-g.top)} stroke="#294641" />)}
        <motion.path d={g.area} fill="url(#nativelet-chart-fill)" clipPath="url(#nativelet-chart-clip)" style={{ opacity: areaOpacity }}/>
        <motion.path ref={line} d={g.line} fill="none" stroke="#57dfb6" strokeWidth={3} strokeLinecap="round" strokeDasharray={length} style={{ strokeDashoffset: offset }}/>
        <motion.g style={{ opacity: entrance }}><motion.line x1={cx} x2={cx} y1={g.top} y2={g.bottom} stroke="#a5cec4"/>
          {!reduce && <motion.circle key={`pulse-${index}-${replay}`} cx={cx} cy={cy} fill="#57dfb6" initial={{ r: 9, opacity: .28 }} animate={{ r: 19, opacity: 0 }} transition={{ duration: .55, ease: 'easeOut', delay: clock.get() < .62 ? .9 : 0 }}/>}<motion.circle cx={cx} cy={cy} r={10} fill="#57dfb633"/><motion.circle cx={cx} cy={cy} r={4.5} fill="#57dfb6"/><motion.circle cx={cx} cy={cy} r={2} fill="#132d2b"/></motion.g>
        <text x={18} y={211} fill="#accec3" fontSize={11}>Mon</text><text x={282} y={211} textAnchor="end" fill="#accec3" fontSize={11}>Sun</text>
      </svg>
      <motion.div className={styles.bubble} style={{ left: bubbleX, opacity: entrance, y: bubbleY }}><motion.span style={{ display: 'inline-block' }} key={`${index}-${reduce}`} initial={{ scale: reduce ? 1 : .94 }} animate={{ scale: 1 }} transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 360, damping: 18 }}>{point.label} · {point.value} pts</motion.span></motion.div>
    </div>
    <div className={styles.controls}><button onClick={() => { setIndex(0); setReplay(v=>v+1); }}>Replay</button><button aria-pressed={forced} onClick={() => setForced(v=>!v)}>Motion: {reduce ? 'reduced' : 'system'}</button></div>
    <p className={styles.note}>Drag, or focus and use the arrow keys.<br/>SVG adapter, not Skia. Source uses Skia + Reanimated.</p>
  </div>;
        }
