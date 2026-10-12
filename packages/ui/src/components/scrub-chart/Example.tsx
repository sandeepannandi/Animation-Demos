import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ScrubChart } from './ScrubChart';
import { DEMO_DATA } from './chartMath';
export default function Example() {
  const [replay, setReplay] = useState(0), [reduce, setReduce] = useState<boolean | undefined>();
  return <View style={{ alignItems: 'center', gap: 16, padding: 16 }}>
    <View style={{ width: 300, gap: 6 }}><Text style={{ color: '#31513b', fontSize: 10, letterSpacing: 2 }}>WEEKLY ACTIVITY · SAMPLE DATA</Text><Text style={{ color: '#193f30', fontSize: 28, fontWeight: '600' }}>Small steps, steady gains.</Text></View>
    <ScrubChart data={DEMO_DATA} width={300} label="Weekly activity, sample data" formatValue={v => `${v} pts`} reducedMotion={reduce} animationKey={replay} />
    <View style={{ flexDirection: 'row', gap: 12 }}><Pressable accessibilityRole="button" onPress={() => setReplay(v => v + 1)} style={{ padding: 14, backgroundColor: '#e6edde', borderRadius: 12 }}><Text>Replay</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setReduce(reduce ? undefined : true)} style={{ padding: 14, backgroundColor: '#e6edde', borderRadius: 12 }}><Text>Motion: {reduce ? 'reduced' : 'system'}</Text></Pressable></View>
    <Text style={{ color: '#526b58', fontSize: 12 }}>Drag, or focus and use the arrow keys.</Text>
  </View>;
}
