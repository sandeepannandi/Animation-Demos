"use client";
import { useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { depth, dragPosition, snap } from '../../packages/ui/src/components/stacked-carousel/carouselLogic';
import styles from './stacked-carousel.module.css';
const items = [
  { id: 'quiet', label: 'Find your quiet', color: '#dce9c6', glyph: '◉', subtitle: 'A little room to think.' },
  { id: 'rhythm', label: 'Follow a rhythm', color: '#cfe1e9', glyph: '≋', subtitle: 'Let the day find its pace.' },
  { id: 'outside', label: 'Take the long way', color: '#f1d9c3', glyph: '↗', subtitle: 'There is more around the corner.' },
  { id: 'rest', label: 'Leave some space', color: '#ded4e9', glyph: '☾', subtitle: 'Not everything needs doing.' },
  { id: 'make', label: 'Make something', color: '#eae3ba', glyph: '✳', subtitle: 'Start with a small thought.' },
];
type Position = ReturnType<typeof useMotionValue<number>>;
function Card({ item, i, position, front, active, reduce, select }: { item: typeof items[number]; i: number; position: Position; front: number; active: number; reduce: boolean; select: (i: number) => void }) {
  const x = useTransform(position, p => depth(i-p).x), y = useTransform(position, p => reduce ? 0 : depth(i-p).y), scale = useTransform(position, p => reduce ? 1 : depth(i-p).scale), opacity = useTransform(position, p => Math.max(0, Math.min(1, 3-Math.abs(i-p)))), rotateY = useTransform(position, p => reduce ? 0 : depth(i-p).tilt);
  return <motion.div className={styles.card} data-card={i} aria-hidden={i !== active} style={{ x, y, scale, opacity, rotateY, zIndex: 100-Math.abs(i-front), background: item.color, pointerEvents: Math.abs(i-front)<=1 ? 'auto':'none' }} onClick={() => select(i)}><span>0{i+1} / DAILY RITUALS</span><strong className={styles.glyph}>{item.glyph}</strong><div><h4>{item.label}</h4><p>{item.subtitle}</p></div><small>A SMALL MOMENT <b>↗</b></small></motion.div>;
}
function Dot({ position, i, reduce }: { position: Position; i: number; reduce: boolean }) { const opacity = useTransform(position,p=>Math.max(0.35,1-Math.abs(i-p)*0.65)), scaleX = useTransform(position,p=>reduce?1:1+Math.max(0,1-Math.abs(i-p))*1.8);return <motion.span style={{opacity,scaleX}}/>; }
export function StackedCarouselPreview() {
  const systemReduce = useReducedMotion(), [forcedReduce,setForcedReduce] = useState(false), reduce = !!systemReduce || forcedReduce;
  const position = useMotionValue(2), [active,setActive] = useState(2), [front,setFront] = useState(2);
  const selected=useRef(2), animation=useRef<ReturnType<typeof animate>>(), epoch=useRef(0), gesture=useRef<{id:number;x:number;y:number;start:number;lastX:number;time:number;velocity:number;moved:boolean}|null>(null), suppressClick=useRef(false);
  useEffect(()=>position.on('change',p=>setFront(Math.round(Math.max(0,Math.min(4,p))))),[position]);
  useEffect(()=>()=>{epoch.current++;animation.current?.stop();},[]);
  function settle(i:number) { const next=Math.max(0,Math.min(4,i)), token=++epoch.current;animation.current?.stop();gesture.current=null;animation.current=animate(position,next,reduce?{duration:0.1}:{type:'spring',stiffness:260,damping:25,mass:0.9});animation.current.then(()=>{if(token!==epoch.current)return;selected.current=next;setActive(next);}); }
  return <div className={styles.root}>
    <div className={styles.stage} role="region" aria-roledescription="carousel" aria-label="Daily rituals cards" tabIndex={0} data-carousel-stage onKeyDown={e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();settle(selected.current+(e.key==='ArrowRight'?1:-1));}else if(e.key==='Escape'&&gesture.current?.moved){e.preventDefault();e.stopPropagation();suppressClick.current=true;settle(selected.current);}}}
      onPointerDown={e=>{if(e.button!==0)return;epoch.current++;animation.current?.stop();suppressClick.current=false;gesture.current={id:e.pointerId,x:e.clientX,y:e.clientY,start:position.get(),lastX:e.clientX,time:e.timeStamp,velocity:0,moved:false};}}
      onPointerMove={e=>{const g=gesture.current;if(!g||g.id!==e.pointerId)return;const dx=e.clientX-g.x,dy=e.clientY-g.y;if(!g.moved){if(Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>7){gesture.current=null;return;}if(Math.abs(dx)<7)return;g.moved=true;e.currentTarget.setPointerCapture(e.pointerId);}const dt=e.timeStamp-g.time;g.velocity=dt>0?(e.clientX-g.lastX)/dt:0;g.lastX=e.clientX;g.time=e.timeStamp;position.set(dragPosition(g.start,dx,5));}}
      onPointerUp={e=>{const g=gesture.current;if(!g||g.id!==e.pointerId)return;gesture.current=null;if(g.moved){suppressClick.current=true;settle(snap(position.get(),e.timeStamp-g.time>100?0:g.velocity,Math.round(g.start),5));}}}
      onPointerCancel={()=>{if(gesture.current){suppressClick.current=true;settle(selected.current);}}} onLostPointerCapture={e=>{if(e.target===e.currentTarget&&gesture.current?.moved){suppressClick.current=true;settle(selected.current);}}}>
      {items.map((item,i)=><Card key={item.id} item={item} i={i} position={position} front={front} active={active} reduce={reduce} select={i=>{if(!suppressClick.current)settle(i);}}/>)}
    </div>
    <div className={styles.dots}>{items.map((item,i)=><button key={item.id} aria-label={`Show ${item.label}`} aria-pressed={active===i} onClick={()=>settle(i)}><Dot position={position} i={i} reduce={reduce}/></button>)}</div>
    <div className={styles.controls}><button disabled={active===0} onClick={()=>settle(selected.current-1)} aria-label="Previous card">← Previous</button><span role="status" aria-live="polite" data-carousel-status>{active+1} / 5</span><button disabled={active===4} onClick={()=>settle(selected.current+1)} aria-label="Next card">Next →</button></div>
    <div className={styles.note}><span>Drag or swipe. Tap a side card to focus.</span><button aria-pressed={forcedReduce} onClick={()=>setForcedReduce(!forcedReduce)}>Motion: {reduce?'reduced':'system'}</button></div>
  </div>;
}
// End of Stacked Carousel web preview.
