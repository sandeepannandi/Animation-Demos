"use client";
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { VW, VH, createSeatFlow, stepSeatFlow, seatScene, tapVenue, zoomAt, resetFlow, exitToVenue, openReview, closeReview, confirmHold, selectionList, formatPrice, type SeatFlow } from '../../packages/ui/src/components/seat-selection/seatMath';
import { seatGesture } from '../../packages/ui/src/components/seat-selection/seatGesture';
import { demoVenue } from '../../packages/ui/src/components/seat-selection/venueFixture';
import styles from './seat-selection.module.css';
type Meta = { step: string; count: number; total: number; sheetT: number; confirmed: boolean; notice: string; noticeT: number; sectionName: string | null };
function RollingText({ text }: { text: string }) {
  const chars = text.split('');
  return <span className={styles.roll} aria-label={text}>{chars.map((ch, i) => /\d/.test(ch)
    ? <span key={chars.length - i} className={styles.digitCol} aria-hidden><span className={styles.digitStrip} style={{ transform: `translateY(${-Number(ch) * 1.2}em)` }}>{[0,1,2,3,4,5,6,7,8,9].map(d => <span key={d}>{d}</span>)}</span></span>
    : <span key={chars.length - i}>{ch}</span>)}</span>;
}
export function SeatSelectionPreview() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const model = useRef<SeatFlow>(createSeatFlow(demoVenue(), 6));
  const [meta, setMeta] = useState<Meta>(() => { const s = seatScene(model.current); return { step: s.step, count: s.count, total: s.total, sheetT: s.sheetT, confirmed: s.confirmed, notice: s.notice, noticeT: s.noticeT, sectionName: s.sectionName }; });
  const [slow, setSlow] = useState(false);
  const reduce = useReducedMotion(), flags = useRef({ slow, reduce }); flags.current = { slow, reduce };
  useEffect(() => {
    const c = canvas.current; if (!c) return; const ctx = c.getContext('2d'); if (!ctx) return;
    let alive = true, raf = 0, prev = performance.now(), emit = 0;
    const gesture = seatGesture(model.current, (x, y) => tapVenue(model.current, x, y), () => model.current.step !== 'review');
    const points = new Map<number, { x: number; y: number }>();
    const local = (e: PointerEvent) => { const r = c.getBoundingClientRect(); return { x: (e.clientX - r.left) * VW / r.width, y: (e.clientY - r.top) * VH / r.height }; };
    const down = (e: PointerEvent) => { c.setPointerCapture(e.pointerId); points.set(e.pointerId, local(e)); gesture.move(Array.from(points.values()), performance.now()); };
    const move = (e: PointerEvent) => { if (!points.has(e.pointerId)) return; points.set(e.pointerId, local(e)); gesture.move(Array.from(points.values()), performance.now()); };
    const up = (e: PointerEvent) => { points.delete(e.pointerId); if (points.size === 0) gesture.up(performance.now()); else gesture.move(Array.from(points.values()), performance.now()); };
    const cancel = () => { points.clear(); gesture.cancel(); };
    const wheel = (e: WheelEvent) => { e.preventDefault(); const r = c.getBoundingClientRect(); zoomAt(model.current, Math.exp(-e.deltaY * .004), (e.clientX - r.left) * VW / r.width, (e.clientY - r.top) * VH / r.height); };
    c.addEventListener('pointerdown', down); c.addEventListener('pointermove', move); c.addEventListener('pointerup', up); c.addEventListener('pointercancel', cancel); c.addEventListener('lostpointercapture', up); c.addEventListener('wheel', wheel, { passive: false });
    const draw = (now: number) => {
      if (!alive) return;
      stepSeatFlow(model.current, (now - prev) / 1000 * (flags.current.slow ? .25 : 1), !!flags.current.reduce); prev = now;
      const dpr = window.devicePixelRatio || 1; if (c.width !== VW * dpr) { c.width = VW * dpr; c.height = VH * dpr; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, VW, VH);
      const scene = seatScene(model.current);
      for (const q of scene.shapes) {
        ctx.globalAlpha = q.opacity; ctx.beginPath(); ctx.roundRect(q.x, q.y, q.w, q.h, q.r ?? 0);
        ctx.fillStyle = q.color; ctx.fill();
        if (q.stroke) { ctx.strokeStyle = q.stroke; ctx.lineWidth = q.strokeWidth ?? 1; ctx.stroke(); }
      }
      for (const l of scene.labels) { ctx.globalAlpha = l.opacity; ctx.fillStyle = l.color; ctx.font = `${l.weight ?? 400} ${l.size}px Geist, sans-serif`; ctx.textAlign = l.align ?? 'left'; ctx.fillText(l.text, l.x, l.y); }
      ctx.globalAlpha = 1;
      if (now - emit > 80) { setMeta({ step: scene.step, count: scene.count, total: scene.total, sheetT: scene.sheetT, confirmed: scene.confirmed, notice: scene.notice, noticeT: scene.noticeT, sectionName: scene.sectionName }); emit = now; }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { alive = false; cancelAnimationFrame(raf); c.removeEventListener('pointerdown', down); c.removeEventListener('pointermove', move); c.removeEventListener('pointerup', up); c.removeEventListener('pointercancel', cancel); c.removeEventListener('lostpointercapture', up); c.removeEventListener('wheel', wheel); };
  }, []);
  const f = model.current, seats = selectionList(f), inReview = meta.step === 'review';
  const title = meta.step === 'venue' ? 'Seat Selection' : inReview ? 'Review seats' : meta.sectionName ?? '';
  return <div className={styles.stage}>
    <div className={styles.header}>
      {meta.step !== 'venue' ? <button className={styles.back} onClick={() => { if (inReview) closeReview(f); else exitToVenue(f); }}>{inReview ? '‹ Seats' : '‹ Venue'}</button> : null}
      <span className={styles.title}>{title}</span>
    </div>
    <div className={styles.mapWrap}>
      <canvas ref={canvas} className={styles.canvas} role="img" aria-label={meta.step === 'venue' ? 'Venue map. Tap a section to zoom in.' : 'Seat map. Tap available seats to select them. Pinch or scroll to zoom.'} />
      {meta.noticeT > 0 ? <div className={styles.notice} style={{ opacity: Math.min(1, meta.noticeT * 2) }}>{meta.notice}</div> : null}
      <div className={styles.sheet} data-open={inReview}>
        <div className={styles.handle} />
        <div className={styles.rows}>
          {seats.map(s => <div key={s.id} className={styles.row}><span>{s.section} · {s.row}{s.number}</span><span>{formatPrice(s.price)}</span></div>)}
        </div>
        <div className={styles.divider} />
        <div className={styles.row}><span className={styles.muted}>{seats.length} seat{seats.length === 1 ? '' : 's'}</span><RollingText text={formatPrice(meta.total)} /></div>
        <button className={styles.hold} data-held={meta.confirmed} disabled={meta.confirmed} onClick={() => confirmHold(f)}>{meta.confirmed ? '✓ Held (demo)' : 'Hold seats'}</button>
        <p className={styles.demo}>Demo hold. No payment and no real booking.</p>
      </div>
    </div>
    {!inReview ? <div className={styles.bar}>
      <span className={styles.count}>{meta.count === 0 ? 'No seats yet' : `${meta.count} seat${meta.count === 1 ? '' : 's'}`}</span>
      <span className={styles.barRight}>
        <RollingText text={formatPrice(meta.total)} />
        <button className={styles.review} disabled={meta.count === 0} onClick={() => openReview(f)}>Review</button>
      </span>
    </div> : null}
    <div className={styles.controls}>
      <button onClick={() => zoomAt(f, .7, VW / 2, VH / 2)} aria-label="Zoom out">−</button>
      <button onClick={() => zoomAt(f, 1.4, VW / 2, VH / 2)} aria-label="Zoom in">+</button>
      <button aria-pressed={slow} onClick={() => setSlow(v => !v)}>Slow motion: {slow ? 'on' : 'off'}</button>
      <button onClick={() => resetFlow(f)}>Reset</button>
    </div>
    <p className={styles.hint}>Tap a section to zoom in. Tap seats to select.<br />Pinch or scroll to zoom, drag to pan. Review holds seats — demo only.</p>
  </div>;
}
