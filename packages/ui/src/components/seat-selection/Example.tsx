import React, { useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SeatSelection, type SeatSelectionHandle } from './SeatSelection';
import { demoVenue } from './venueFixture';
export default function Example({ onFeedback }: { onFeedback?: () => void }) {
  const ref = useRef<SeatSelectionHandle>(null), [slow, setSlow] = useState(false), venue = useMemo(() => demoVenue(), []);
  const button = (label: string, action: () => void) => <Pressable key={label} accessibilityRole="button" onPress={action} style={{ minHeight: 40, minWidth: 40, paddingHorizontal: 12, justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#ccd3c6', backgroundColor: '#f8faf5' }}><Text style={{ color: '#30372e', fontSize: 12 }}>{label}</Text></Pressable>;
  return <View style={{ alignItems: 'center', gap: 14, paddingVertical: 14 }}>
    <SeatSelection ref={ref} venue={venue} maxSeats={6} onFeedback={onFeedback} slowMotion={slow} />
    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
      {button('‹ Back', () => ref.current?.back())}
      {button('Zoom out', () => ref.current?.zoom(.7))}
      {button('Zoom in', () => ref.current?.zoom(1.4))}
      {button(`Slow motion: ${slow ? 'on' : 'off'}`, () => setSlow(v => !v))}
      {button('Reset', () => ref.current?.reset())}
    </View>
    <Text style={{ color: '#64705f', fontSize: 12, textAlign: 'center', lineHeight: 20 }}>Tap a section to zoom in. Tap seats to select.{'\n'}Pinch to zoom, drag to pan. Review holds seats — demo only.</Text>
  </View>;
}
