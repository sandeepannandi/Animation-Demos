import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, PanResponder, StyleSheet, View } from 'react-native';
import { Canvas, Group, ImageShader, Skia, Vertices } from '@shopify/react-native-skia';
import { useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import {
  cellDelay, clamp01, clampView, decodeBase64, easeInOutCubic, rand01,
  shufflePermutation, zoomAbout,
  ARC_AMOUNT, POP_SCALE, SHUFFLE_DURATION, SHUFFLE_JITTER, SHUFFLE_SPREAD,
  type MosaicView,
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
  // Transition state lives in shared values with replace semantics only.
  // The previous design mutated a captured state object from both threads;
  // on native the worklet closures received frozen copies, so the frame
  // callback's writes never reached the render deriveds (blank canvas) and
  // JS-side shuffles never reached the UI thread. Pure reads only below:
  // the render deriveds compute each frame from these values, like
  // FoldedPass computes its mesh from a progress shared value.
  const identity = useMemo(() => {
    const perm = new Uint16Array(cellCount);
    for (let i = 0; i < cellCount; i++) perm[i] = i;
    return perm;
  }, [cellCount]);
  const homePerm = useSharedValue<Uint16Array>(identity);
  const targetPerm = useSharedValue<Uint16Array>(identity);
  const paintingA = useSharedValue(Math.min(shown, paintings.length - 1));
  const paintingB = useSharedValue(Math.min(shown, paintings.length - 1));
  const startT = useSharedValue(0);
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);
  const seedSV = useSharedValue(0);
  const activeSV = useSharedValue(0);
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

  // Reset state when the painting set changes (must stay stable per mount).
  useEffect(() => {
    const idx = Math.min(shown, decoded.length - 1);
    homePerm.value = identity;
    targetPerm.value = identity;
    paintingA.value = idx;
    paintingB.value = idx;
    activeSV.value = 0;
  }, [decoded, cellCount, identity, homePerm, targetPerm, paintingA, paintingB, activeSV]); // eslint-disable-line react-hooks/exhaustive-deps

  const goTo = useCallback((next: number, gx: number, gy: number) => {
    const { paintings: ps, decoded: dec, onIndexChange: cb, onFeedback: fb } = latest.current;
    if (ps.length < 2) return;
    const target = ((next % ps.length) + ps.length) % ps.length;
    const seed = (target + 1) * 7919 + Math.floor(gx * 13 + gy * 17);
    const perm = shufflePermutation(cellCount, seed);
    paintingB.value = target;
    if (!latest.current.reduce) targetPerm.value = perm;
    startT.value = clock.value;
    originX.value = gx;
    originY.value = gy;
    seedSV.value = seed;
    activeSV.value = 1;
    // Commit once the last cell has landed (JS owns the bookkeeping; the UI
    // thread only reads). Superseded by a newer shuffle via the seed token.
    const durS = latest.current.reduce ? 0.24 : SHUFFLE_SPREAD + SHUFFLE_JITTER + SHUFFLE_DURATION + 0.3;
    const reducedNow = latest.current.reduce;
    setTimeout(() => {
      if (seedSV.value !== seed) return;
      if (!reducedNow) homePerm.value = perm;
      paintingA.value = target;
      activeSV.value = 0;
    }, durS * 1000);
    if (index === undefined) setInternal(target);
    cb?.(target);
    fb?.('shuffle', target);
  }, [index, clock, cellCount, paintingB, targetPerm, startT, originX, originY, seedSV, activeSV, homePerm, paintingA]);

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
    const dt = Math.min(48, info.timeSincePreviousFrame ?? 16.7) / 1000;
    const scale = slowM.value && !reduceM.value ? 0.25 : 1;
    clock.value = clock.value + dt * scale;
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
    const t = clock.value; // recompute per frame
    const home = homePerm.value;
    const targ = targetPerm.value;
    const act = activeSV.value === 1;
    const t0 = startT.value;
    const ox = originX.value;
    const oy = originY.value;
    const seed = seedSV.value;
    const reduced = reduceM.value;
    const out = new Array<{ x: number; y: number }>(cellCount * 4);
    const half = (cell * (1 - GAP)) / 2;
    for (let i = 0; i < cellCount; i++) {
      const fromSlot = home[i];
      const toSlot = reduced ? fromSlot : targ[i];
      let p = 1;
      if (act) {
        p = reduced
          ? clamp01((t - t0) / 0.24)
          : easeInOutCubic(clamp01((t - t0 - cellDelay(fromSlot, cols, rows, ox, oy, seed)) / SHUFFLE_DURATION));
      }
      let cx: number;
      let cy: number;
      let sc = 1;
      if (reduced) {
        cx = (fromSlot % cols) + 0.5;
        cy = Math.floor(fromSlot / cols) + 0.5;
      } else {
        const fx = (fromSlot % cols) + 0.5;
        const fy = Math.floor(fromSlot / cols) + 0.5;
        const tx = (toSlot % cols) + 0.5;
        const ty = Math.floor(toSlot / cols) + 0.5;
        const flight = act ? Math.sin(Math.PI * clamp01(p)) : 0;
        const r1 = rand01(seed * 131 + i * 17) - 0.5;
        const r2 = rand01(seed * 733 + i * 29) - 0.5;
        cx = fx + (tx - fx) * p + r1 * ARC_AMOUNT * 2 * flight;
        cy = fy + (ty - fy) * p + r2 * ARC_AMOUNT * 2 * flight;
        sc = 1 + POP_SCALE * flight;
      }
      const px = offX + cx * cell;
      const py = offY + cy * cell;
      const h = half * sc;
      const o = i * 4;
      out[o] = { x: px - h, y: py - h };
      out[o + 1] = { x: px + h, y: py - h };
      out[o + 2] = { x: px - h, y: py + h };
      out[o + 3] = { x: px + h, y: py + h };
    }
    return out;
  }, [cellCount, cols, rows, cell, offX, offY]);

  const vcolors = useDerivedValue(() => {
    const t = clock.value;
    const home = homePerm.value;
    const targ = targetPerm.value;
    const act = activeSV.value === 1;
    const t0 = startT.value;
    const ox = originX.value;
    const oy = originY.value;
    const seed = seedSV.value;
    const reduced = reduceM.value;
    const A = decoded[paintingA.value];
    const B = decoded[paintingB.value];
    const out = new Array(cellCount * 4);
    for (let i = 0; i < cellCount; i++) {
      const fromSlot = home[i];
      const toSlot = reduced ? fromSlot : targ[i];
      let p = 1;
      if (act) {
        p = reduced
          ? clamp01((t - t0) / 0.24)
          : easeInOutCubic(clamp01((t - t0 - cellDelay(fromSlot, cols, rows, ox, oy, seed)) / SHUFFLE_DURATION));
      }
      const ai = fromSlot * 3;
      const bi = toSlot * 3;
      const cr = A[ai] + (B[bi] - A[ai]) * p;
      const cg = A[ai + 1] + (B[bi + 1] - A[ai + 1]) * p;
      const cb = A[ai + 2] + (B[bi + 2] - A[ai + 2]) * p;
      const c = 0xff000000 | (((cr | 0) & 255) << 16) | (((cg | 0) & 255) << 8) | ((cb | 0) & 255);
      const o = i * 4;
      out[o] = shadeVertex(c, BEVEL[0]);
      out[o + 1] = shadeVertex(c, BEVEL[1]);
      out[o + 2] = shadeVertex(c, BEVEL[2]);
      out[o + 3] = shadeVertex(c, BEVEL[3]);
    }
    return out;
  }, [cellCount, cols, rows, decoded]);

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
