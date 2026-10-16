import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, PanResponder, StyleSheet, View } from 'react-native';
import { Canvas, Group, ImageShader, Skia, Vertices } from '@shopify/react-native-skia';
import { useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import {
  beginShuffle, clampView, decodeBase64, evalMosaicFrame, makeFrame, makeState,
  zoomAbout,
  type MosaicFrame, type MosaicState, type MosaicView,
} from './mosaicMath';
import { MOSAIC_COLS, MOSAIC_ROWS, MOSAIC_PAINTINGS, type MosaicPainting } from './mosaic-data';

export type MosaicGalleryProps = {
  paintings?: MosaicPainting[];
  /** Controlled painting index. Omit (with defaultIndex) for uncontrolled. */
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Fired with 'shuffle' when a transition starts. */
  onFeedback?: (event: 'shuffle', index: number) => void;
  width?: number;
  height?: number;
  label?: string;
  reducedMotion?: boolean;
  /** Runs the transition clock about four times slower. Ignored while Reduce Motion is on. */
  slowMotion?: boolean;
};

const GAP = 0.14; // grout line, fraction of a cell
// 1x1 white PNG: tinting via a texture rides the device-proven Vertices+ImageShader
// path - the colors-only path renders nothing on native Android (fine on web).
const WHITE_PIXEL = Skia.Image.MakeImageFromEncoded(
  Skia.Data.fromBase64('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg==')
);
const BEVEL = [1.13, 1.05, 0.95, 0.84]; // per-corner light: tl, tr, bl, br

function shadeVertex(packed: number, factor: number): string {
  'worklet';
  // Vertices colors must be color strings (see Skia's VerticesProps) - raw
  // uint32 numbers are silently dropped by the native materializer.
  // Self-contained on purpose: Reanimated captures a worklet's module-scope
  // bindings at the worklet's position in the module, so a const declared
  // below would be captured undefined (crash on device).
  const C = '0123456789abcdef';
  const r = Math.min(255, Math.round(((packed >> 16) & 255) * factor));
  const g = Math.min(255, Math.round(((packed >> 8) & 255) * factor));
  const b = Math.min(255, Math.round((packed & 255) * factor));
  return '#' + C[r >> 4] + C[r & 15] + C[g >> 4] + C[g & 15] + C[b >> 4] + C[b & 15];
}

export function MosaicGallery({ paintings = MOSAIC_PAINTINGS, index, defaultIndex = 0, onIndexChange, onFeedback, width = 340, height = 234, label = 'Mosaic gallery', reducedMotion, slowMotion = false }: MosaicGalleryProps) {
  const [systemReduce, setSystemReduce] = useState(false);
  const reduce = reducedMotion ?? systemReduce;
  const [internal, setInternal] = useState(defaultIndex);
  const shown = index ?? internal;
  const cols = MOSAIC_COLS, rows = MOSAIC_ROWS;
  const cellCount = cols * rows;
  const cell = Math.min(width / cols, height / rows);
  const fieldW = cell * cols;
  const fieldH = cell * rows;
  const offX = (width - fieldW) / 2;
  const offY = (height - fieldH) / 2;

  const decoded = useMemo(() => paintings.map(p => decodeBase64(p.colorsB64)), [paintings]);
  const st = useSharedValue<MosaicState>(makeState(Math.min(shown, paintings.length - 1), decoded[Math.min(shown, paintings.length - 1)], cellCount));
  const frame: MosaicFrame = useMemo(() => makeFrame(cellCount), [cellCount]);
  const clock = useSharedValue(0);
  const reduceM = useSharedValue(false);
  const slowM = useSharedValue(false);
  const view = useSharedValue<MosaicView>({ scale: 1, tx: 0, ty: 0 });
  const latest = useRef({ paintings, shown, onIndexChange, onFeedback, reduce, decoded });
  latest.current = { paintings, shown, onIndexChange, onFeedback, reduce, decoded };

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then(v => { if (alive) setSystemReduce(v); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystemReduce);
    return () => { alive = false; sub.remove(); };
  }, []);
  useEffect(() => { reduceM.value = reduce; }, [reduce, reduceM]);
  useEffect(() => { slowM.value = slowMotion; }, [slowMotion, slowM]);

  // Rebuild state when the painting set changes (must stay stable per mount).
  useEffect(() => {
    const idx = Math.min(shown, decoded.length - 1);
    st.value = makeState(idx, decoded[idx], cellCount);
  }, [decoded, cellCount, st]); // eslint-disable-line react-hooks/exhaustive-deps

  const goTo = useCallback((next: number, gx: number, gy: number) => {
    const { paintings: ps, decoded: dec, onIndexChange: cb, onFeedback: fb } = latest.current;
    if (ps.length < 2) return;
    const target = ((next % ps.length) + ps.length) % ps.length;
    const seed = (target + 1) * 7919 + Math.floor(gx * 13 + gy * 17);
    // Mutate the shareable on the JS thread; worklets see the same object.
    beginShuffle(st.value, target, dec[target], clock.value, gx, gy, seed);
    if (index === undefined) setInternal(target);
    cb?.(target);
    fb?.('shuffle', target);
  }, [index, st, clock]);

  // Tap / double-tap / pan / pinch through one PanResponder (no gesture-handler dep).
  const originRef = useRef({ x: 0, y: 0 }); // canvas origin in page coords
  const pan = useMemo(() => {
    let startT = 0;
    let startX = 0;
    let startY = 0;
    let moved = false;
    let pinching = false;
    let lastTapT = 0;
    let baseView: MosaicView = { scale: 1, tx: 0, ty: 0 };
    let baseDist = 0;
    let baseMid = { x: 0, y: 0 };
    const dist = (touches: any[]) => Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
    const mid = (touches: any[]) => ({ x: (touches[0].pageX + touches[1].pageX) / 2, y: (touches[0].pageY + touches[1].pageY) / 2 });
    // Canvas-local coords of a page point.
    const local = (px: number, py: number) => ({ x: px - originRef.current.x, y: py - originRef.current.y });
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const t = evt.nativeEvent;
        startT = Date.now();
        startX = t.pageX; startY = t.pageY;
        moved = false; pinching = false;
        baseView = { ...view.value };
      },
      onPanResponderMove: (evt) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length >= 2) {
          const d = dist(touches);
          const m = mid(touches);
          if (!pinching) { pinching = true; baseDist = d; baseMid = m; baseView = { ...view.value }; return; }
          // Pan by midpoint delta, then zoom about the current midpoint.
          const pannedView = { scale: baseView.scale, tx: baseView.tx + (m.x - baseMid.x), ty: baseView.ty + (m.y - baseMid.y) };
          const f = local(m.x, m.y);
          view.value = zoomAbout(pannedView, baseView.scale * (d / Math.max(1, baseDist)), f.x, f.y, width, height);
          return;
        }
        const dx = evt.nativeEvent.pageX - startX;
        const dy = evt.nativeEvent.pageY - startY;
        if (Math.abs(dx) + Math.abs(dy) > 8) moved = true;
        if (moved) view.value = clampView({ scale: view.value.scale, tx: baseView.tx + dx, ty: baseView.ty + dy }, width, height);
      },
      onPanResponderRelease: (evt) => {
        if (pinching) { pinching = false; return; }
        if (!moved && Date.now() - startT < 300) {
          const now = Date.now();
          const lx = evt.nativeEvent.locationX;
          const ly = evt.nativeEvent.locationY;
          if (now - lastTapT < 320) {
            // Double tap: toggle a 2x zoom about the tap point.
            const v = view.value;
            view.value = v.scale > 1.2 ? { scale: 1, tx: 0, ty: 0 } : zoomAbout(v, 2, lx, ly, width, height);
            lastTapT = 0;
            return;
          }
          lastTapT = now;
          const { shown: cur } = latest.current;
          // Tap origin in grid units for the ripple wave: invert the canvas transform.
          const v = view.value;
          const gx = (((lx - width / 2 - v.tx) / v.scale + width / 2) - offX) / cell;
          const gy = (((ly - height / 2 - v.ty) / v.scale + height / 2) - offY) / cell;
          goTo(cur + 1, Math.max(0, Math.min(cols, gx)), Math.max(0, Math.min(rows, gy)));
        }
      },
    });
  }, [view, width, height, offX, offY, cell, cols, rows, goTo]);
  const containerRef = useRef<View>(null);

  useFrameCallback((info) => {
    const prev = clock.value;
    const dt = Math.min(48, info.timeSincePreviousFrame ?? 16.7) / 1000;
    const scale = slowM.value && !reduceM.value ? 0.25 : 1;
    clock.value = prev + dt * scale;
    evalMosaicFrame(st.value, cols, rows, clock.value, reduceM.value, frame);
  });

  const textures = useMemo(() => new Array<{ x: number; y: number }>(cellCount * 4).fill({ x: 0, y: 0 }), [cellCount]);
  const indices = useMemo(() => {
    const idx: number[] = [];
    for (let i = 0; i < cellCount; i++) {
      const b = i * 4;
      idx.push(b, b + 1, b + 2, b + 2, b + 1, b + 3);
    }
    return idx;
  }, [cellCount]);

  const vertices = useDerivedValue(() => {
    clock.value; // recompute per frame
    const out = new Array<{ x: number; y: number }>(cellCount * 4);
    const half = (cell * (1 - GAP)) / 2;
    for (let i = 0; i < cellCount; i++) {
      const cx = offX + frame.x[i] * cell;
      const cy = offY + frame.y[i] * cell;
      const h = half * frame.s[i];
      const o = i * 4;
      out[o] = { x: cx - h, y: cy - h };
      out[o + 1] = { x: cx + h, y: cy - h };
      out[o + 2] = { x: cx - h, y: cy + h };
      out[o + 3] = { x: cx + h, y: cy + h };
    }
    return out;
  });

  const vcolors = useDerivedValue(() => {
    clock.value;
    const out = new Array(cellCount * 4);
    for (let i = 0; i < cellCount; i++) {
      const c = frame.color[i];
      const o = i * 4;
      out[o] = shadeVertex(c, BEVEL[0]);
      out[o + 1] = shadeVertex(c, BEVEL[1]);
      out[o + 2] = shadeVertex(c, BEVEL[2]);
      out[o + 3] = shadeVertex(c, BEVEL[3]);
    }
    return out;
  });

  const transform = useDerivedValue(() => {
    const v = view.value;
    return [{ translateX: width / 2 + v.tx }, { translateY: height / 2 + v.ty }, { scale: v.scale }, { translateX: -width / 2 }, { translateY: -height / 2 }];
  });

  return (
    <View
      ref={containerRef}
      accessibilityLabel={label}
      accessibilityRole="image"
      style={[styles.wrap, { width, height }]}
      onLayout={() => containerRef.current?.measure((_x, _y, _w, _h, px, py) => { originRef.current = { x: px, y: py }; })}
      {...pan.panHandlers}
    >
      <Canvas style={StyleSheet.absoluteFill}>
        <Group transform={transform}>
          <Vertices vertices={vertices} textures={textures} colors={vcolors} indices={indices} mode="triangles" blendMode="modulate">
            {WHITE_PIXEL ? <ImageShader image={WHITE_PIXEL} tx="clamp" ty="clamp" /> : null}
          </Vertices>
        </Group>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 16, overflow: 'hidden', backgroundColor: '#101c15' },
});

export default MosaicGallery;
