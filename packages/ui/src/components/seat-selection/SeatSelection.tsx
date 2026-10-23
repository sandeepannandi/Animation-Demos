import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, PanResponder, Pressable, Text, View, type ViewStyle } from 'react-native';
import { Canvas, RoundedRect } from '@shopify/react-native-skia';
import { VW, VH, createSeatFlow, stepSeatFlow, seatScene, tapVenue, zoomAt, resetFlow, enterSection, exitToVenue, openReview, closeReview, confirmHold, selectionList, formatPrice, type SeatFlow, type SelectedSeat, type Venue } from './seatMath';
import { seatGesture } from './seatGesture';
import { RollingNumber } from './RollingNumber';
export type SeatSelectionHandle = { back: () => void; reset: () => void; zoom: (factor: number) => void; openSection: (id: string) => void };
export type SeatSelectionProps = {
  venue: Venue;
  maxSeats?: number;
  initialSelection?: readonly string[];
  /** Fires whenever the selection changes, with the current seats and total. */
  onSelectionChange?: (seats: SelectedSeat[], total: number) => void;
  /** Demo hold only: no payment, reservation or backend call is performed. */
  onConfirm?: (seats: SelectedSeat[], total: number) => void;
  onFeedback?: () => void;
  slowMotion?: boolean;
  reducedMotion?: boolean;
  fontFamily?: string;
  currency?: string;
  style?: ViewStyle;
};
const SHEET_H = 248;
/** A connected seat-picking flow: venue overview, section drill-in, seat picking and a review sheet. Rendering is a Skia canvas; selection state lives in seatMath. */
export const SeatSelection = forwardRef<SeatSelectionHandle, SeatSelectionProps>(function SeatSelection({ venue, maxSeats = 6, initialSelection, onSelectionChange, onConfirm, onFeedback, slowMotion = false, reducedMotion, fontFamily, currency = '₹', style }, ref) {
  const model = useRef<SeatFlow>(createSeatFlow(venue, maxSeats, initialSelection));
  const latest = useRef({ onSelectionChange, onConfirm, onFeedback }); latest.current = { onSelectionChange, onConfirm, onFeedback };
  const [scene, setScene] = useState(() => seatScene(model.current));
  const [systemReduce, setSystemReduce] = useState(false);
  const settings = useRef({ slowMotion, reduce: reducedMotion ?? systemReduce }); settings.current = { slowMotion, reduce: reducedMotion ?? systemReduce };
  const gesture = useMemo(() => seatGesture(model.current, (x, y) => {
    const f = model.current, before = f.step;
    const hit = tapVenue(f, x, y);
    if (hit.result === 'section' || hit.result === 'selected' || hit.result === 'deselected') latest.current.onFeedback?.();
    if (hit.result === 'section' && before === 'venue') { /* camera flight handled by target */ }
  }, () => model.current.step !== 'review'), []);
  const lastKey = useRef('');
  useEffect(() => { let live = true; AccessibilityInfo.isReduceMotionEnabled().then(v => live && setSystemReduce(v)); const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystemReduce); return () => { live = false; sub.remove(); }; }, []);
  useEffect(() => { Object.assign(model.current, createSeatFlow(venue, maxSeats, initialSelection)); lastKey.current = ''; gesture.cancel(); }, [venue, maxSeats, gesture]);
  useEffect(() => {
    let active = true, raf = 0, previous = Date.now();
    const frame = () => {
      if (!active) return;
      const now = Date.now(), f = model.current;
      stepSeatFlow(f, (now - previous) / 1000 * (settings.current.slowMotion ? .25 : 1), settings.current.reduce);
      previous = now;
      setScene(seatScene(f));
      const key = Object.keys(f.selected).sort().join(',');
      if (key !== lastKey.current) { lastKey.current = key; latest.current.onSelectionChange?.(selectionList(f), selectionList(f).reduce((s, x) => s + x.price, 0)); }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { active = false; cancelAnimationFrame(raf); gesture.cancel(); };
  }, [gesture]);
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => model.current.step !== 'review',
    onMoveShouldSetPanResponder: () => model.current.step !== 'review',
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: e => gesture.move(e.nativeEvent.touches.map(t => ({ x: t.locationX, y: t.locationY })), Date.now()),
    onPanResponderMove: e => gesture.move(e.nativeEvent.touches.map(t => ({ x: t.locationX, y: t.locationY })), Date.now()),
    onPanResponderRelease: () => gesture.up(Date.now()),
    onPanResponderTerminate: () => gesture.cancel(),
  }), [gesture]);
  useImperativeHandle(ref, () => ({
    back: () => { const f = model.current; if (f.step === 'review') closeReview(f); else if (f.step === 'section') exitToVenue(f); },
    reset: () => { resetFlow(model.current); lastKey.current = ''; },
    zoom: factor => zoomAt(model.current, factor, VW / 2, VH / 2),
    openSection: id => enterSection(model.current, id),
  }), []);
  const seats = selectionList(model.current), total = seats.reduce((s, x) => s + x.price, 0);
  const title = scene.step === 'venue' ? 'Seat Selection' : scene.step === 'review' ? 'Review seats' : scene.sectionName ?? '';
  return <View style={[{ width: 340 }, style]}>
    <View style={{ height: 36, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {scene.step !== 'venue' ? <Pressable accessibilityRole="button" accessibilityLabel={scene.step === 'review' ? 'Back to seats' : 'Back to venue'} onPress={() => { const f = model.current; if (f.step === 'review') closeReview(f); else exitToVenue(f); }} style={{ minHeight: 36, minWidth: 36, justifyContent: 'center' }}><Text style={{ color: '#31513b', fontSize: 15, fontFamily }}>{scene.step === 'review' ? '‹ Seats' : '‹ Venue'}</Text></Pressable> : null}
      <Text style={{ color: '#4b5a4c', fontSize: 13, fontFamily, fontWeight: '600' }}>{title}</Text>
    </View>
    <View style={{ width: VW, height: VH, backgroundColor: '#f7f9f4', borderRadius: 10, overflow: 'hidden' }} {...pan.panHandlers} accessibilityLabel={scene.step === 'venue' ? 'Venue map. Tap a section to zoom in.' : 'Seat map. Tap available seats to select them. Pinch with two fingers to zoom.'} accessibilityRole="image">
      <Canvas pointerEvents="none" style={{ position: 'absolute', width: VW, height: VH }}>
        {scene.shapes.map((q, i) => <RoundedRect key={i} x={q.x} y={q.y} width={q.w} height={q.h} r={q.r ?? 0} color={q.color} opacity={q.opacity} />)}
        {scene.shapes.map((q, i) => q.stroke ? <RoundedRect key={`s${i}`} x={q.x} y={q.y} width={q.w} height={q.h} r={q.r ?? 0} color={q.stroke} opacity={q.opacity} style="stroke" strokeWidth={q.strokeWidth ?? 1} /> : null)}
      </Canvas>
      {scene.labels.map((l, i) => <Text key={i} pointerEvents="none" style={{ position: 'absolute', left: l.align === 'center' ? l.x - 60 : l.align === 'right' ? l.x - 100 : l.x, top: l.y - l.size, width: l.align === 'left' ? 110 : 100, fontSize: l.size, lineHeight: l.size + 3, fontFamily, color: l.color, opacity: l.opacity, textAlign: l.align ?? 'left', includeFontPadding: false, fontVariant: ['tabular-nums'], fontWeight: l.weight ? String(l.weight) as '700' : undefined }}>{l.text}</Text>)}
      {scene.noticeT > 0 ? <View pointerEvents="none" style={{ position: 'absolute', top: 12, left: 0, right: 0, alignItems: 'center', opacity: Math.min(1, scene.noticeT * 2) }}><Text style={{ backgroundColor: '#2e3a30', color: '#fff', fontSize: 12, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, overflow: 'hidden', fontFamily }}>{scene.notice}</Text></View> : null}
      {scene.sheetT > .01 ? <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: SHEET_H, transform: [{ translateY: (1 - scene.sheetT) * SHEET_H }], backgroundColor: '#ffffff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, gap: 8, shadowColor: '#1c2a1e', shadowOpacity: .18, shadowRadius: 14, shadowOffset: { width: 0, height: -4 }, elevation: 8 }}>
        <View style={{ alignSelf: 'center', width: 34, height: 4, borderRadius: 2, backgroundColor: '#d5ddd0' }} />
        <View style={{ maxHeight: 96, gap: 5 }}>
          {seats.map(s => <View key={s.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: '#37433a', fontSize: 13, fontFamily }}>{s.section} · {s.row}{s.number}</Text>
            <Text style={{ color: '#37433a', fontSize: 13, fontFamily, fontVariant: ['tabular-nums'] }}>{formatPrice(s.price, currency)}</Text>
          </View>)}
        </View>
        <View style={{ height: 1, backgroundColor: '#e3e9de' }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: '#5d6d5f', fontSize: 12, fontFamily }}>{seats.length} seat{seats.length === 1 ? '' : 's'}</Text>
          <RollingNumber text={formatPrice(total, currency)} fontSize={18} color="#1e2a20" fontFamily={fontFamily} reduce={settings.current.reduce} />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={scene.confirmed ? 'Seats held, demo only' : 'Hold selected seats'} disabled={scene.confirmed} onPress={() => { confirmHold(model.current); latest.current.onConfirm?.(seats, total); latest.current.onFeedback?.(); }} style={{ height: 46, borderRadius: 23, backgroundColor: scene.confirmed ? '#3d7a5f' : '#31513b', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 14, fontFamily, fontWeight: '600' }}>{scene.confirmT > .5 ? '✓ Held (demo)' : 'Hold seats'}</Text>
        </Pressable>
        <Text style={{ color: '#8a978b', fontSize: 10.5, textAlign: 'center', fontFamily }}>Demo hold. No payment and no real booking.</Text>
      </View> : null}
    </View>
    {scene.step !== 'review' ? <View style={{ minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
      <Text style={{ color: '#5d6d5f', fontSize: 13, fontFamily, flexShrink: 1 }}>{scene.count === 0 ? 'No seats yet' : `${scene.count} seat${scene.count === 1 ? '' : 's'}`}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <RollingNumber text={formatPrice(scene.total, currency)} fontSize={16} color="#1e2a20" fontFamily={fontFamily} reduce={settings.current.reduce} />
        <Pressable accessibilityRole="button" accessibilityLabel="Review selected seats" disabled={scene.count === 0} onPress={() => { openReview(model.current); latest.current.onFeedback?.(); }} style={{ height: 40, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#31513b', opacity: scene.count === 0 ? .35 : 1, justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 13, fontFamily, fontWeight: '600' }}>Review</Text>
        </Pressable>
      </View>
    </View> : null}
  </View>;
});
