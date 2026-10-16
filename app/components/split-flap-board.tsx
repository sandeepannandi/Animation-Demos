"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_FLAP, FLAP_CHARSET,
  makeCells, retarget, stepCells, isSettled,
  fallScale, revealScale, fallShade, revealShade, castShade, wobbleOffset,
  strokeGlyph, glyphAdvance,
  type FlapCell,
} from '../../packages/ui/src/components/split-flap-board/splitFlapMath';
import { DEFAULT_FLAP_WORDS } from '../../packages/ui/src/components/split-flap-board/flapWords';
import styles from './split-flap-board.module.css';

const GAP = 5;
const WORD_MS = 3400;

type Sim = { cells: FlapCell[]; word: number; wordStart: number; last: number };

export function SplitFlapBoardPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [word, setWord] = useState(0);
  const [slow, setSlow] = useState(false);
  const [reduced, setReduced] = useState(false);
  const sim = useRef<Sim | null>(null);
  const cols = Math.max(...DEFAULT_FLAP_WORDS.map((w) => w.length));
  const W = 400;
  const cellW = (W - (cols - 1) * GAP) / cols;
  const cellH = Math.round(cellW * 1.42);
  const split = cellH / 2;
  const glyphScale = (cellH * 0.58) / 7;
  if (!sim.current) sim.current = { cells: makeCells(DEFAULT_FLAP_WORDS[0], cols), word: 0, wordStart: 0, last: 0 };
  const latest = useRef({ slow, reduced, cols });
  latest.current = { slow, reduced, cols };

  const goTo = useCallback((next: number) => {
    const s = sim.current!;
    const target = ((next % DEFAULT_FLAP_WORDS.length) + DEFAULT_FLAP_WORDS.length) % DEFAULT_FLAP_WORDS.length;
    s.cells = retarget(s.cells, DEFAULT_FLAP_WORDS[target], DEFAULT_FLAP, latest.current.reduced);
    s.word = target;
    s.wordStart = s.last;
    setWord(target);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = cellH * dpr;

    const rounded = (r: number) => {
      ctx.beginPath();
      ctx.moveTo(r, 0);
      ctx.arcTo(cellW, 0, cellW, cellH, r);
      ctx.arcTo(cellW, cellH, 0, cellH, r);
      ctx.arcTo(0, cellH, 0, 0, r);
      ctx.arcTo(0, 0, cellW, 0, r);
      ctx.closePath();
    };
    const drawGlyph = (ch: number) => {
      const adv = glyphAdvance(ch);
      ctx.beginPath();
      strokeGlyph(ctx, ch, (cellW - adv * glyphScale) / 2, (cellH - 7 * glyphScale) / 2, glyphScale);
      ctx.stroke();
    };
    const drawCell = (c: FlapCell, x: number) => {
      const L = FLAP_CHARSET.length;
      const active = c.queue > 0 || c.flip > 0;
      const nch = c.queue > 0 ? (c.ch + 1) % L : c.ch;
      ctx.save();
      ctx.translate(x, 0);
      rounded(6);
      ctx.clip();
      ctx.fillStyle = '#1b1d23';
      ctx.fillRect(0, 0, cellW, cellH);
      ctx.fillStyle = '#262931';
      ctx.fillRect(0, 0, cellW, split);
      ctx.fillStyle = 'rgba(255,255,255,0.045)';
      ctx.fillRect(0, 0, cellW, split * 0.5);
      ctx.strokeStyle = '#e9e6dc';
      ctx.lineWidth = Math.max(1.6, glyphScale * 0.62);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // resting lower half (current glyph + clack bounce)
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, split, cellW, split);
      ctx.clip();
      ctx.translate(0, wobbleOffset(c.wobble));
      drawGlyph(c.ch);
      ctx.restore();
      // upper half shows the incoming glyph
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, cellW, split);
      ctx.clip();
      drawGlyph(nch);
      ctx.restore();
      if (active) {
        ctx.fillStyle = `rgba(0,0,0,${castShade(c.flip)})`;
        ctx.fillRect(0, split, cellW, split);
        const p1 = Math.min(c.flip * 2, 1);
        const s = fallScale(p1);
        if (s > 0.001) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, cellW, split);
          ctx.clip();
          ctx.translate(0, split);
          ctx.scale(1, s);
          ctx.translate(0, -split);
          drawGlyph(c.ch);
          ctx.fillStyle = `rgba(0,0,0,${fallShade(p1)})`;
          ctx.fillRect(0, 0, cellW, split);
          ctx.restore();
        }
        if (c.flip > 0.5) {
          const p2 = c.flip * 2 - 1;
          const s2 = revealScale(p2);
          if (s2 > 0.001) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, split, cellW, split);
            ctx.clip();
            ctx.translate(0, split);
            ctx.scale(1, s2);
            ctx.translate(0, -split);
            drawGlyph(nch);
            ctx.fillStyle = `rgba(0,0,0,${revealShade(p2)})`;
            ctx.fillRect(0, split, cellW, split);
            ctx.restore();
          }
        }
      }
      ctx.fillStyle = '#0a0b0e';
      ctx.fillRect(0, split - 1, cellW, 2);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(0, split + 1, cellW, 1);
      ctx.restore();
      rounded(6);
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    let raf = 0;
    const draw = (now: number) => {
      const s = sim.current!;
      const dt = s.last ? Math.min(now - s.last, 48) : 16.7;
      s.last = now;
      const { slow: isSlow, reduced: isReduced } = latest.current;
      const r = stepCells(s.cells, dt * (isSlow ? 0.25 : 1));
      s.cells = r.cells;
      if (now - s.wordStart > WORD_MS * (isSlow ? 2 : 1) && isSettled(s.cells)) {
        const target = (s.word + 1) % DEFAULT_FLAP_WORDS.length;
        s.cells = retarget(s.cells, DEFAULT_FLAP_WORDS[target], DEFAULT_FLAP, isReduced);
        s.word = target;
        s.wordStart = now;
        setWord(target);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, cellH);
      for (let i = 0; i < s.cells.length; i++) drawCell(s.cells[i], i * (cellW + GAP));
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cellW, cellH]);

  return (
    <div className={styles.stage}>
      <div className={styles.caption}>{word + 1} of {DEFAULT_FLAP_WORDS.length} · {DEFAULT_FLAP_WORDS[word]}</div>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        style={{ width: W, height: cellH }}
        role="button"
        tabIndex={0}
        aria-label={`Split-flap board showing ${DEFAULT_FLAP_WORDS[word]}. Activate for the next word.`}
        onClick={() => goTo(word + 1)}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); goTo(word + 1); } }}
      />
      <div className={styles.hint}>Click the board and the flaps clatter to the next word, left to right.</div>
      <div className={styles.row}>
        <button type="button" className={styles.chipPrimary} onClick={() => goTo(word + 1)}>Next word</button>
        <button type="button" className={styles.chip} aria-pressed={slow} onClick={() => setSlow(!slow)}>Slow motion: {slow ? 'on' : 'off'}</button>
        <button type="button" className={styles.chip} aria-pressed={reduced} onClick={() => setReduced(!reduced)}>Motion: {reduced ? 'reduced' : 'full'}</button>
      </div>
    </div>
  );
}
