// Vinyl Player: a turntable with a sprung tonearm and a platter with real
// inertia. Tap the record and the arm swings in first - the platter only
// powers up once the needle is nearly down, then spins up with the slow,
// heavy ease of a real deck. Tap again and the power cuts (the classic drag
// to a halt) while the arm lifts and parks itself. Pure Skia geometry:
// concentric groove rings, a fixed sheen, a rotating shine mark and label,
// and a damped-spring tonearm - no shaders, no mesh, no images required.
//
// NOT COPIED FROM ANY TUTORIAL. Inspired by the feel of Reactiive's vinyl
// videos; the physics, sequencing, geometry and code here are original work
// under this repo's license.
//
// ARCHITECTURE (device-proven on Android new arch): driven entirely from the
// JS thread - rAF clock, React state, plain Skia props. Reanimated's UI
// runtime stalls a few frames after the screen goes quiet, so a canvas-only
// animation freezes while the user just watches; JS rAF (ReactChoreographer)
// keeps firing and JS-driven Fabric commits always reach the screen. The
// render is transform-only (two rotating groups + a growing opacity), so a
// JS-state drive is cheap.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, PanResponder, StyleSheet, View } from 'react-native';
import { Canvas, Circle, Group, Path, RoundedRect, RadialGradient, LinearGradient, Image, vec, Skia, type SkImage } from '@shopify/react-native-skia';
import {
  DEFAULT_VINYL, armAngles, armTip, makeVinyl, stepVinyl, vinylActive,
  type VinylOptions, type VinylState,
} from './vinylMath';

export type VinylPlayerProps = {
  /** Controlled playing state. Omit (with defaultPlaying) for uncontrolled. */
  playing?: boolean;
  defaultPlaying?: boolean;
  onToggle?: (playing: boolean) => void;
  /** Fired with 'play' | 'pause' when the deck changes state (haptics hook). */
  onFeedback?: (event: 'play' | 'pause') => void;
  /** Optional label artwork, clipped to the label circle and rotating with it. */
  artwork?: SkImage | null;
  labelColor?: string;
  size?: number;
  rpm?: number;
  label?: string;
  reducedMotion?: boolean;
  /** Runs the clock about four times slower. Ignored while Reduce Motion is on. */
  slowMotion?: boolean;
};

const GROOVES = 22;

type Deck = {
  s: number;
  cx: number;
  cy: number;
  r: number;
  labelR: number;
  px: number;
  py: number;
  armLen: number;
  opts: VinylOptions;
  grooves: { r: number; o: number }[];
  sheen: string;      // wedge path (static, light-relative)
  shineArc: string;   // short arc on the grooves (rotates with the disc)
  labelClip: string;  // circle path used to clip artwork
  restX: number;
  restY: number;
};

function deckFor(size: number, rpm: number): Deck {
  const s = size;
  const cx = s / 2;
  const cy = s / 2;
  const r = s * 0.40;
  const px = s * 0.88;
  const py = s * 0.12;
  const geo = armAngles(px, py, cx, cy, r);
  const grooves: { r: number; o: number }[] = [];
  for (let i = 0; i < GROOVES; i++) {
    const t = i / (GROOVES - 1);
    grooves.push({ r: r * (0.42 + 0.55 * t), o: 0.035 + 0.045 * ((i * 7) % 5) / 4 });
  }
  // Two fixed sheen wedges (light source upper-left), plus a short shine arc
  // that rotates with the disc so spin is visible on the black surface.
  const wedge = (a0: number, a1: number) => {
    const p = Skia.Path.Make();
    p.moveTo(cx, cy);
    const step = 6;
    for (let a = a0; a <= a1; a += step) {
      const rad = (a * Math.PI) / 180;
      p.lineTo(cx + Math.cos(rad) * r, cy + Math.sin(rad) * r);
    }
    p.close();
    return p.toSVGString();
  };
  const arc = Skia.Path.Make();
  const arcR = r * 0.72;
  arc.addArc(Skia.XYWHRect(cx - arcR, cy - arcR, arcR * 2, arcR * 2), 18, 46);
  const clip = Skia.Path.Make();
  clip.addCircle(cx, cy, r * 0.34);
  const rest = armTip(px, py, geo.len, geo.park);
  return {
    s, cx, cy, r, labelR: r * 0.34, px, py, armLen: geo.len,
    opts: { ...DEFAULT_VINYL, rpm, armParkDeg: geo.park, armPlayDeg: geo.play },
    grooves,
    sheen: wedge(-52, -22) + '|' + wedge(128, 158),
    shineArc: arc.toSVGString(),
    labelClip: clip.toSVGString(),
    restX: rest.x,
    restY: rest.y,
  };
}

export function VinylPlayer({
  playing,
  defaultPlaying = false,
  onToggle,
  onFeedback,
  artwork = null,
  labelColor = '#b8402e',
  size = 320,
  rpm = 33 + 1 / 3,
  label = 'Vinyl player',
  reducedMotion,
  slowMotion = false,
}: VinylPlayerProps) {
  const d = useMemo(() => deckFor(size, rpm), [size, rpm]);
  const [internal, setInternal] = useState(defaultPlaying);
  const isPlaying = playing !== undefined ? playing : internal;
  const [sysReduce, setSysReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setSysReduce).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setSysReduce);
    return () => sub.remove();
  }, []);
  const reduce = reducedMotion ?? sysReduce;

  const [v, setV] = useState<VinylState>(() => makeVinyl(d.opts.armParkDeg));
  // Latest values the clock reads (same-commit refs, device-proven pattern).
  const vRef = useRef(v);
  vRef.current = v;
  const playingRef = useRef(isPlaying);
  playingRef.current = isPlaying;
  const reduceRef = useRef(reduce);
  reduceRef.current = reduce;
  const slowMotionRef = useRef(slowMotion);
  slowMotionRef.current = slowMotion;
  const optsRef = useRef(d.opts);
  optsRef.current = d.opts;

  // The deck's clock: JS rAF keeps firing on a quiet screen (device-proven;
  // Reanimated's UI-thread frame callback does not). Only publishes while
  // something moves; a parked, idle deck renders nothing.
  useEffect(() => {
    let cancelled = false;
    let last = 0;
    const tick = (ts: number) => {
      if (cancelled) return;
      const dt = Math.min(last ? ts - last : 16.7, 48) * (slowMotionRef.current ? 0.25 : 1);
      last = ts;
      const r = stepVinyl(vRef.current, playingRef.current, dt, optsRef.current, reduceRef.current);
      if (r.active || vRef.current.speed > 0 || vRef.current.angle !== r.state.angle) setV(r.state);
      requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, []);

  const toggle = useCallback(() => {
    const next = !playingRef.current;
    if (playing === undefined) setInternal(next);
    onToggle?.(next);
    onFeedback?.(next ? 'play' : 'pause');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, onToggle, onFeedback]);

  // PanResponder handlers close over the FIRST render's toggle (created once
  // via useRef) - route through a latest-ref (device-verified pattern).
  const toggleRef = useRef(toggle);
  toggleRef.current = toggle;
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderRelease: (_evt, g) => {
        if (Math.abs(g.dx) < 12 && Math.abs(g.dy) < 12) toggleRef.current();
      },
    }),
  ).current;

  // Static gradient defs.
  const shadowC = useMemo(() => vec(d.cx, d.cy + d.r * 0.05), [d]);
  const sheenP0 = useMemo(() => vec(d.cx - d.r * 0.3, d.cy - d.r * 0.6), [d]);
  const sheenP1 = useMemo(() => vec(d.cx + d.r * 0.3, d.cy + d.r * 0.6), [d]);
  const sheenPaths = useMemo(() => d.sheen.split('|'), [d]);
  const spinT = useMemo(() => [{ rotate: (v.angle * Math.PI) / 180 }], [v.angle]);
  const armT = useMemo(() => [{ translateX: d.px }, { translateY: d.py }, { rotate: (v.arm * Math.PI) / 180 }], [v.arm, d]);
  const spinUp = d.opts.rpm > 0 ? Math.min(1, v.speed / (d.opts.rpm / 60)) : 0;

  return (
    <View
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${isPlaying ? 'Playing' : 'Paused'}. Tap to ${isPlaying ? 'pause' : 'play'}.`}
      style={[styles.box, { width: d.s, height: d.s }]}
      {...pan.panHandlers}
    >
      <Canvas style={{ width: d.s, height: d.s }} pointerEvents="none">
        {/* soft deck shadow */}
        <Circle cx={shadowC.x} cy={shadowC.y} r={d.r * 1.04} opacity={0.5}>
          <RadialGradient c={shadowC} r={d.r * 1.04} colors={['rgba(24,32,20,0.35)', 'rgba(24,32,20,0)']} />
        </Circle>
        {/* playing glow: the calm 'alive' ring, following spin-up */}
        <Circle cx={d.cx} cy={d.cy} r={d.r * 1.05} style="stroke" strokeWidth={d.s * 0.02} color="#7ba36a" opacity={0.55 * spinUp} />
        {/* the record (rotates) */}
        <Group origin={vec(d.cx, d.cy)} transform={spinT}>
          <Circle cx={d.cx} cy={d.cy} r={d.r} color="#141315" />
          {d.grooves.map((g, i) => (
            <Circle key={i} cx={d.cx} cy={d.cy} r={g.r} style="stroke" strokeWidth={1} color="#ffffff" opacity={g.o} />
          ))}
          {/* deadwax band + rotating shine mark so spin shows on black */}
          <Circle cx={d.cx} cy={d.cy} r={d.r * 0.47} style="stroke" strokeWidth={d.r * 0.035} color="#ffffff" opacity={0.05} />
          <Path path={d.shineArc} style="stroke" strokeWidth={d.r * 0.16} strokeCap="round" color="#ffffff" opacity={0.06} />
          {/* label */}
          <Circle cx={d.cx} cy={d.cy} r={d.labelR} color={labelColor} />
          {artwork ? (
            <Group clip={d.labelClip}>
              <Image image={artwork} x={d.cx - d.labelR} y={d.cy - d.labelR} width={d.labelR * 2} height={d.labelR * 2} fit="cover" />
            </Group>
          ) : (
            <>
              <Circle cx={d.cx} cy={d.cy} r={d.labelR * 0.72} style="stroke" strokeWidth={1.5} color="#ffffff" opacity={0.28} />
              <Circle cx={d.cx + d.labelR * 0.42} cy={d.cy - d.labelR * 0.3} r={d.labelR * 0.12} color="#ffffff" opacity={0.4} />
            </>
          )}
          <Circle cx={d.cx} cy={d.cy} r={d.s * 0.008} color="#d8d3c8" />
        </Group>
        {/* fixed sheen wedges (light stays put while the record turns) */}
        {sheenPaths.map((p, i) => (
          <Path key={i} path={p} opacity={0.07}>
            <LinearGradient start={sheenP0} end={sheenP1} colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0)']} />
          </Path>
        ))}
        {/* tonearm rest post (static) */}
        <RoundedRect x={d.restX - d.s * 0.012} y={d.restY - d.s * 0.03} width={d.s * 0.024} height={d.s * 0.05} r={d.s * 0.008} color="#3d3a3e" />
        {/* tonearm (rotates about its pivot) */}
        <Group transform={armT}>
          <Circle cx={-d.armLen * 0.3} cy={0} r={d.s * 0.022} color="#3d3a3e" />
          <RoundedRect x={-d.armLen * 0.3} y={-d.s * 0.0045} width={d.armLen * 1.3} height={d.s * 0.009} r={d.s * 0.0045} color="#57535a" />
          <Group origin={vec(d.armLen, 0)} transform={[{ rotate: 0.42 }]}>
            <RoundedRect x={d.armLen - d.s * 0.007} y={-d.s * 0.013} width={d.s * 0.05} height={d.s * 0.026} r={d.s * 0.005} color="#8a858d" />
          </Group>
        </Group>
        {/* pivot base */}
        <Circle cx={d.px} cy={d.py} r={d.s * 0.045} color="#2c2a2e" />
        <Circle cx={d.px} cy={d.py} r={d.s * 0.03} color="#57535a" />
        <Circle cx={d.px} cy={d.py} r={d.s * 0.011} color="#8a858d" />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignSelf: 'center' },
});
