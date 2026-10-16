import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, PanResponder, StyleSheet, View } from 'react-native';
import { Canvas, FilterMode, Group, ImageShader, Skia, Vertices, type SkImage } from '@shopify/react-native-skia';
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
// Per-vertex colors are not used here: on native Android a Vertices with a
// colors prop either renders black or nothing at all (device-verified), and
// colors do not combine with an image shader. Instead color arrives through
// a two-row atlas image: row 0 holds each cell's current resting color,
// row 1 its target color for the in-flight shuffle. The per-vertex texture
// coordinate's y rides the cell's progress p (0.5 -> 1.5), so bilinear
// sampling performs the exact color lerp on the GPU. This is the
// FoldedPass device-proven pattern: vertices + textures + ImageShader.
const ATLAS_H = 2;

function buildAtlas(
  colorsA: Uint8ClampedArray,
  home: Uint16Array,
  colorsB: Uint8ClampedArray,
  perm: Uint16Array,
  cellCount: number,
): SkImage {
  const surface = Skia.Surface.MakeOffscreen(cellCount, ATLAS_H);
  if (!surface) throw new Error('Unable to prepare the mosaic atlas');
  const canvas = surface.getCanvas();
  const paint = Skia.Paint();
  for (let i = 0; i < cellCount; i++) {
    const a = home[i] * 3;
    paint.setColor(Skia.Color(`rgb(${colorsA[a]},${colorsA[a + 1]},${colorsA[a + 2]})`));
    canvas.drawRect(Skia.XYWHRect(i, 0, 1, 1), paint);
    const b = perm[i] * 3;
    paint.setColor(Skia.Color(`rgb(${colorsB[b]},${colorsB[b + 1]},${colorsB[b + 2]})`));
    canvas.drawRect(Skia.XYWHRect(i, 1, 1, 1), paint);
  }
  surface.flush();
  const snapshot = surface.makeImageSnapshot();
  const copy = snapshot.makeNonTextureImage();
  snapshot.dispose();
  surface.dispose();
  paint.dispose();
  if (!copy) throw new Error('Unable to copy the mosaic atlas');
  return copy;
}

// One-pixel-tall lookup strip: the pixel at x is black with alpha
// (1 - x / 255). The shading pass maps each corner's brightness into this
// strip as a texture coordinate for the tile bevel (FoldedPass pattern).
function makeShadeRamp(): SkImage {
  const surface = Skia.Surface.MakeOffscreen(256, 1);
  if (!surface) throw new Error('Unable to prepare the shade ramp');
  const canvas = surface.getCanvas();
  const paint = Skia.Paint();
  canvas.clear(Skia.Color('transparent'));
  for (let i = 0; i < 256; i++) {
    paint.setColor(Skia.Color(`rgba(0,0,0,${(1 - i / 255).toFixed(4)})`));
    canvas.drawRect(Skia.XYWHRect(i, 0, 1, 1), paint);
  }
  surface.flush();
  const snapshot = surface.makeImageSnapshot();
  const copy = snapshot.makeNonTextureImage();
  snapshot.dispose();
  surface.dispose();
  paint.dispose();
  if (!copy) throw new Error('Unable to copy the shade ramp');
  return copy;
}

// Per-corner light (tl, tr, bl, br), normalized so the lit corner is 1:
// encoded as ramp x coordinates (higher alpha = darker = lower x).
const BEVEL_X = [255.5, 236.5, 214.5, 189.5];

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
  const initialPainting = Math.min(shown, paintings.length - 1);
  const [atlas, setAtlas] = useState<SkImage>(() => {
    const img = buildAtlas(decoded[initialPainting], identity, decoded[initialPainting], identity, cellCount);
    return img;
  });
  const atlasRef = useRef<SkImage>(atlas);
  atlasRef.current = atlas;
  useEffect(() => () => { atlasRef.current.dispose(); }, []);
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
    setAtlas(buildAtlas(decoded[idx], identity, decoded[idx], identity, cellCount));
  }, [decoded, cellCount, identity, homePerm, targetPerm, paintingA, paintingB, activeSV]); // eslint-disable-line react-hooks/exhaustive-deps

  const goTo = useCallback((next: number, gx: number, gy: number) => {
    const { paintings: ps, decoded: dec, onIndexChange: cb, onFeedback: fb } = latest.current;
    if (ps.length < 2) return;
    const target = ((next % ps.length) + ps.length) % ps.length;
    const seed = (target + 1) * 7919 + Math.floor(gx * 13 + gy * 17);
    const perm = shufflePermutation(cellCount, seed);
    // The atlas carries row0 = each cell's current resting color and
    // row1 = its target color, so the GPU can lerp between them per frame.
    setAtlas(buildAtlas(
      dec[paintingA.value], latest.current.reduce ? identity : homePerm.value,
      dec[target], latest.current.reduce ? identity : perm,
      cellCount,
    ));
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

  // Static per-corner shade coordinates into the ramp (bevel), reused by the
  // shading pass for every cell.
  const shadeUv = useMemo(() => {
    const out = new Array<{ x: number; y: number }>(cellCount * 4);
    for (let i = 0; i < cellCount; i++) {
      const o = i * 4;
      out[o] = { x: BEVEL_X[0], y: 0.5 };
      out[o + 1] = { x: BEVEL_X[1], y: 0.5 };
      out[o + 2] = { x: BEVEL_X[2], y: 0.5 };
      out[o + 3] = { x: BEVEL_X[3], y: 0.5 };
    }
    return out;
  }, [cellCount]);
  const ramp = useMemo(() => makeShadeRamp(), []);
  useEffect(() => () => ramp.dispose(), [ramp]);
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

  // Per-frame atlas coordinates: x selects the cell's column, y rides the
  // cell's transition progress between the resting row (0.5) and the target
  // row (1.5); bilinear sampling performs the color lerp.
  const texCoords = useDerivedValue(() => {
    const t = clock.value;
    const act = activeSV.value === 1;
    const t0 = startT.value;
    const ox = originX.value;
    const oy = originY.value;
    const seed = seedSV.value;
    const reduced = reduceM.value;
    const home = homePerm.value;
    const out = new Array<{ x: number; y: number }>(cellCount * 4);
    for (let i = 0; i < cellCount; i++) {
      let p = 1;
      if (act) {
        p = reduced
          ? clamp01((t - t0) / 0.24)
          : easeInOutCubic(clamp01((t - t0 - cellDelay(home[i], cols, rows, ox, oy, seed)) / SHUFFLE_DURATION));
      }
      const y = 0.5 + p;
      const o = i * 4;
      const x = i + 0.5;
      out[o] = { x, y };
      out[o + 1] = { x, y };
      out[o + 2] = { x, y };
      out[o + 3] = { x, y };
    }
    return out;
  }, [cellCount, cols, rows]);

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
          <Vertices vertices={vertices} textures={texCoords} indices={indices} mode="triangles">
            <ImageShader image={atlas} tx="clamp" ty="clamp" sampling={{ filter: FilterMode.Linear }} />
          </Vertices>
          <Vertices vertices={vertices} textures={shadeUv} indices={indices} mode="triangles">
            <ImageShader image={ramp} tx="clamp" ty="clamp" sampling={{ filter: FilterMode.Linear }} />
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
