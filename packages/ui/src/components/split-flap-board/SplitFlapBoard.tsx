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
import Animated, { useAnimatedStyle, useDerivedValue, useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';
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
  const slowM = useSharedValue(false);
  useEffect(() => { slowM.value = slowMotion; }, [slowMotion, slowM]);

  // (Re)target whenever the shown word, geometry or motion mode changes.
  useEffect(() => {
    if (reduce) {
      cells.value = retarget(cells.value.length ? cells.value : makeCells('', m.cols), words[current], DEFAULT_FLAP, true);
    } else if (cells.value.length !== m.cols) {
      cells.value = makeCells(words[current], m.cols);
    } else {
      cells.value = retarget(cells.value, words[current], DEFAULT_FLAP, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, words, m.cols, reduce]);

  // Heartbeat: on Android (new arch) Reanimated's frame loop is only
  // re-posted while Fabric commits or events keep flowing - pure Skia-canvas
  // updates do NOT keep it alive, so a canvas-only board freezes a few frames
  // after the last touch (device-verified). One invisible Animated.View whose
  // style changes every frame keeps the loop posted, exactly like the Bubble
  // Picker's label views do as a side effect.
  const beat = useSharedValue(0);
  useFrameCallback((info) => {
    const dt = Math.min(info.timeSincePreviousFrame ?? 16.7, 48) * (slowM.value ? 0.25 : 1);
    beat.value = (beat.value + dt) % 100000;
    if (cells.value.length === 0) return; // not yet initialized
    cells.value = stepCells(cells.value, dt).cells;
  });
  const beatStyle = useAnimatedStyle(() => ({ transform: [{ translateX: beat.value % 2 }] }));

  const advance = useCallback(() => {
    const n = (current + 1) % words.length;
    if (index === undefined) setInternal(n);
    onIndexChange?.(n);
    onFeedback?.('flip', n);
    const base = cells.value.length === m.cols ? cells.value : makeCells(words[current], m.cols);
    cells.value = retarget(base, words[n], DEFAULT_FLAP, reduce);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, words, index, reduce, onIndexChange, onFeedback]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderRelease: (_evt, g) => {
        if (Math.abs(g.dx) < 12 && Math.abs(g.dy) < 12) advance();
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

