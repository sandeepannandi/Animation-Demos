// Split-Flap Board: a departure-board row of flipping letter flaps. Tap to
// clatter to the next word, columns cascading left to right. Pure Skia
// geometry (rounded halves, scaleY leaf rotation, shading overlays) around a
// shared worklet math module - no Vertices colors, no shaders, no fonts:
// glyphs are an original stroke set drawn as Skia paths.
//
// NOT COPIED FROM ANY TUTORIAL. Inspired by the feel of Reactiive's split
// flap video; the mechanism, motion, glyphs and code here are original work
// under this repo's license.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, PanResponder, StyleSheet, View } from 'react-native';
import { Canvas, Group, Path, Rect, Skia } from '@shopify/react-native-skia';
import Animated, { useAnimatedStyle, useDerivedValue, useSharedValue, type SharedValue } from 'react-native-reanimated';
import {
  DEFAULT_FLAP, FLAP_CHARSET,
  makeCells, retarget, stepCells,
  fallScale, revealScale, fallShade, revealShade, castShade, wobbleOffset,
  strokeGlyph, glyphAdvance,
  type FlapCell,
} from './splitFlapMath';
import { DEFAULT_FLAP_WORDS } from './flapWords';

export { DEFAULT_FLAP_WORDS };

export type SplitFlapBoardProps = {
  words?: string[];
  /** Controlled word index. Omit (with defaultIndex) for uncontrolled. */
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Fired with 'flip' when the board starts toward a word. */
  onFeedback?: (event: 'flip', index: number) => void;
  width?: number;
  label?: string;
  reducedMotion?: boolean;
  /** Runs the clock about four times slower. Ignored while Reduce Motion is on. */
  slowMotion?: boolean;
};

const GAP = 5;
const CORNER = 6;

type Metrics = {
  cols: number;
  cellW: number;
  cellH: number;
  split: number;
  glyphScale: number;   // px per glyph grid unit
  glyphY: number;       // baseline-ish top offset of the glyph box in a cell
  strokeW: number;
};

function metricsFor(width: number, words: string[]): Metrics {
  const cols = Math.max(1, ...words.map((w) => Math.min(w.length, 24)));
  const cellW = (width - (cols - 1) * GAP) / cols;
  const cellH = Math.round(cellW * 1.42);
  const glyphScale = (cellH * 0.58) / 7;
  return {
    cols,
    cellW,
    cellH,
    split: cellH / 2,
    glyphScale,
    glyphY: (cellH - 7 * glyphScale) / 2,
    strokeW: Math.max(1.6, glyphScale * 0.62),
  };
}

const EMPTY_CELL: FlapCell = { ch: 0, queue: 0, flip: 0, flipMs: DEFAULT_FLAP.stepMs, delay: 0, wobble: -1 };

type CellViewProps = {
  cells: SharedValue<FlapCell[]>;
  index: number;
  x: number;
  m: Metrics;
  clipPath: ReturnType<typeof Skia.Path.Make>;
};

function FlapCellView({ cells, index, x, m, clipPath }: CellViewProps) {
  const L = FLAP_CHARSET.length;
  const topClip = useMemo(() => ({ x: 0, y: 0, width: m.cellW, height: m.split }), [m]);
  const botClip = useMemo(() => ({ x: 0, y: m.split, width: m.cellW, height: m.split }), [m]);

  const cellOf = () => {
    'worklet';
    // The shared array can lag behind the children at mount or after a
    // geometry change; never read past its end (device-verified crash).
    return cells.value[index] || EMPTY_CELL;
  };

  // Glyph paths rebuilt only for the two characters a cell can show during a
  // step: the current one and the next one.
  const pathCur = useDerivedValue(() => {
    const c = cellOf();
    const p = Skia.Path.Make();
    const adv = glyphAdvance(c.ch);
    strokeGlyph(p, c.ch, (m.cellW - adv * m.glyphScale) / 2, m.glyphY, m.glyphScale);
    return p;
  });
  const pathNext = useDerivedValue(() => {
    const c = cellOf();
    const nch = c.queue > 0 ? (c.ch + 1) % L : c.ch;
    const p = Skia.Path.Make();
    const adv = glyphAdvance(nch);
    strokeGlyph(p, nch, (m.cellW - adv * m.glyphScale) / 2, m.glyphY, m.glyphScale);
    return p;
  });

  const wobbleT = useDerivedValue(() => [{ translateY: wobbleOffset(cellOf().wobble) }]);

  const leafT = useDerivedValue(() => {
    const c = cellOf();
    const s = c.queue > 0 || c.flip > 0 ? fallScale(Math.min(c.flip * 2, 1)) : 0;
    return [{ translateY: m.split }, { scaleY: s }, { translateY: -m.split }];
  });
  const leafShade = useDerivedValue(() => {
    const c = cellOf();
    return c.queue > 0 || c.flip > 0 ? fallShade(Math.min(c.flip * 2, 1)) : 0;
  });
  const revealT = useDerivedValue(() => {
    const c = cellOf();
    const s = c.queue > 0 && c.flip > 0.5 ? revealScale(c.flip * 2 - 1) : 0;
    return [{ translateY: m.split }, { scaleY: s }, { translateY: -m.split }];
  });
  const revealShadeOp = useDerivedValue(() => {
    const c = cellOf();
    return c.queue > 0 && c.flip > 0.5 ? revealShade(c.flip * 2 - 1) : 0;
  });
  const shadowOp = useDerivedValue(() => {
    const c = cellOf();
    return c.queue > 0 || c.flip > 0 ? castShade(c.flip) : 0;
  });

  return (
    <Group transform={[{ translateX: x }]}>
      <Group clip={clipPath}>
        <Rect x={0} y={0} width={m.cellW} height={m.cellH} color="#1b1d23" />
        <Rect x={0} y={0} width={m.cellW} height={m.split} color="#262931" />
        <Rect x={0} y={0} width={m.cellW} height={m.split * 0.5} color="#ffffff" opacity={0.045} />
        {/* resting lower half: current glyph, with the landing clack bounce */}
        <Group clip={botClip}>
          <Group transform={wobbleT}>
            <Path path={pathCur} style="stroke" strokeWidth={m.strokeW} strokeCap="round" strokeJoin="round" color="#e9e6dc" />
          </Group>
        </Group>
        {/* upper half shows the incoming glyph as the leaf falls away */}
        <Group clip={topClip}>
          <Path path={pathNext} style="stroke" strokeWidth={m.strokeW} strokeCap="round" strokeJoin="round" color="#e9e6dc" />
        </Group>
        {/* shadow the falling leaf casts on the lower half */}
        <Rect x={0} y={m.split} width={m.cellW} height={m.split} color="#000000" opacity={shadowOp} />
        {/* falling leaf: current glyph's upper half hinging down */}
        <Group clip={topClip}>
          <Group transform={leafT}>
            <Path path={pathCur} style="stroke" strokeWidth={m.strokeW} strokeCap="round" strokeJoin="round" color="#e9e6dc" />
            <Rect x={0} y={0} width={m.cellW} height={m.split} color="#000000" opacity={leafShade} />
          </Group>
        </Group>
        {/* revealing leaf: incoming glyph's lower half unfolding */}
        <Group clip={botClip}>
          <Group transform={revealT}>
            <Path path={pathNext} style="stroke" strokeWidth={m.strokeW} strokeCap="round" strokeJoin="round" color="#e9e6dc" />
            <Rect x={0} y={m.split} width={m.cellW} height={m.split} color="#000000" opacity={revealShadeOp} />
          </Group>
        </Group>
        {/* hinge line */}
        <Rect x={0} y={m.split - 1} width={m.cellW} height={2} color="#0a0b0e" />
        <Rect x={0} y={m.split + 1} width={m.cellW} height={1} color="#ffffff" opacity={0.06} />
      </Group>
      <Path path={clipPath} style="stroke" strokeWidth={1} color="#ffffff" opacity={0.07} />
    </Group>
  );
}

export function SplitFlapBoard({
  words = DEFAULT_FLAP_WORDS,
  index,
  defaultIndex = 0,
  onIndexChange,
  onFeedback,
  width = 340,
  label = 'Split-flap board',
  reducedMotion,
  slowMotion = false,
}: SplitFlapBoardProps) {
  const m = useMemo(() => metricsFor(width, words), [width, words]);
  const [internal, setInternal] = useState(() => Math.min(defaultIndex, words.length - 1));
  const current = index !== undefined ? Math.min(index, words.length - 1) : internal;
  const [sysReduce, setSysReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setSysReduce).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setSysReduce);
    return () => sub.remove();
  }, []);
  const reduce = reducedMotion ?? sysReduce;

  // Mount constants come from React state: a shared value created empty and
  // filled in an effect races the children's derived readers on native.
  const initial = useRef<{ cols: number; cells: FlapCell[] } | null>(null);
  if (!initial.current || initial.current.cols !== m.cols) {
    initial.current = { cols: m.cols, cells: makeCells(words[current], m.cols) };
  }
  const cells = useSharedValue<FlapCell[]>(initial.current.cells);

  // (Re)target whenever the shown word, geometry or motion mode changes.
  // Single retarget path: advance() only moves the index and lets this
  // effect write, so each word change queues exactly one cascade. (A second
  // retarget from the tap handler would restart the cascade from the stale
  // JS mirror of the shared array - device-verified.)
  const lastWord = useRef<{ word: string; cols: number; reduce: boolean } | null>(null);
  useEffect(() => {
    const key = { word: words[current], cols: m.cols, reduce };
    const prev = lastWord.current;
    if (prev && prev.word === key.word && prev.cols === key.cols && prev.reduce === key.reduce) return;
    lastWord.current = key;
    if (reduce) {
      cells.value = retarget(cells.value.length === m.cols ? cells.value : makeCells('', m.cols), words[current], DEFAULT_FLAP, true);
    } else if (cells.value.length !== m.cols) {
      cells.value = makeCells(words[current], m.cols);
    } else {
      cells.value = retarget(cells.value, words[current], DEFAULT_FLAP, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, words, m.cols, reduce]);

  // The board's clock runs on the JS thread. Device-proven: Reanimated's
  // UI-thread frame callback is not an independent power source on Android -
  // its Choreographer loop dies a few frames after the UI goes quiet (pure
  // Skia-canvas updates neither re-post it nor wake it), and any "heartbeat"
  // fed by that same loop dies with it. ReactChoreographer-backed JS rAF
  // keeps firing on a quiet screen; each cells.value write crosses to the UI
  // runtime, recomputes the deriveds and invalidates the canvas.
  const beat = useSharedValue(0);
  const beatStyle = useAnimatedStyle(() => ({ transform: [{ translateX: beat.value }] }));
  const slowMotionRef = useRef(slowMotion);
  useEffect(() => { slowMotionRef.current = slowMotion; }, [slowMotion]);
  useEffect(() => {
    let cancelled = false;
    let last = 0;
    const tick = (ts: number) => {
      if (cancelled) return;
      const dt = Math.min(last ? ts - last : 16.7, 48) * (slowMotionRef.current ? 0.25 : 1);
      last = ts;
      if (cells.value.length > 0) {
        const r = stepCells(cells.value, dt);
        cells.value = r.cells;
      }
      // Device-proven: on a quiet Android screen, shared-value changes alone
      // do not redraw the Skia canvas - the screen only repaints when Fabric
      // commits flow. Flip a 1px view's style every tick so each frame
      // carries a commit and the canvas repaints with it. The JS clock is
      // the independent power source; a heartbeat fed by Reanimated's own
      // UI frame loop dies with it (run 6/7), and clock-without-heartbeat
      // animates invisibly (run 8/9).
      beat.value = (beat.value + 1) % 2;
      requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [cells]);

  const advance = useCallback(() => {
    const n = (current + 1) % words.length;
    if (index === undefined) setInternal(n);
    onIndexChange?.(n);
    onFeedback?.('flip', n);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, words, index, reduce, onIndexChange, onFeedback]);

  // PanResponder handlers close over the FIRST render's advance (created
  // once via useRef) - route through a latest-ref so later taps see the
  // current word (device-verified: the second tap was a no-op).
  const advanceRef = useRef(advance);
  useEffect(() => { advanceRef.current = advance; }, [advance]);
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderRelease: (_evt, g) => {
        if (Math.abs(g.dx) < 12 && Math.abs(g.dy) < 12) advanceRef.current();
      },
    }),
  ).current;

  const clipPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.addRRect(Skia.RRectXY(Skia.XYWHRect(0, 0, m.cellW, m.cellH), CORNER, CORNER));
    return p;
  }, [m.cellW, m.cellH]);

  return (
    <View
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${label}. Showing ${words[current]}. Tap for the next word.`}
      style={[styles.box, { width, height: m.cellH }]}
      {...pan.panHandlers}
    >
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: 1, height: 1, opacity: 0 }, beatStyle]} />
      <Canvas style={{ width, height: m.cellH }} pointerEvents="none">
        {Array.from({ length: m.cols }, (_, i) => (
          <FlapCellView key={i} cells={cells} index={i} x={i * (m.cellW + GAP)} m={m} clipPath={clipPath} />
        ))}
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignSelf: 'center' },
});

