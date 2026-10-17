import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { VinylPlayer, type VinylPlayerProps } from './VinylPlayer';

export default function Example({ onFeedback }: { onFeedback?: VinylPlayerProps['onFeedback'] }) {
  const [playing, setPlaying] = useState(false);
  const [slow, setSlow] = useState(false);
  const [reduce, setReduce] = useState<boolean | undefined>();
  const onToggle = useCallback((p: boolean) => setPlaying(p), []);
  return (
    <View style={{ paddingVertical: 24, width: '100%', alignItems: 'center' }}>
      <Text accessibilityLiveRegion="polite" style={{ color: '#31513b', fontSize: 13, marginBottom: 4 }}>
        Late Night Drive · 33⅓ rpm · {playing ? 'now playing' : 'paused'}
      </Text>
      <VinylPlayer label="Turntable" playing={playing} onToggle={onToggle} slowMotion={slow} reducedMotion={reduce} onFeedback={onFeedback} />
      <Text style={{ color: '#4b6053', fontSize: 12, marginTop: 16 }}>Tap the record: the tonearm swings in, then the platter spins up.</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 10 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={playing ? 'Pause' : 'Play'} onPress={() => setPlaying(!playing)} style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 14, backgroundColor: '#31513b', justifyContent: 'center' }}><Text style={{ color: '#f3f6ee', fontSize: 13 }}>{playing ? 'Pause' : 'Play'}</Text></Pressable>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: slow }} accessibilityLabel="Slow motion" onPress={() => setSlow(!slow)} style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 14, backgroundColor: '#e6edde', justifyContent: 'center' }}><Text style={{ color: '#31513b', fontSize: 13 }}>Slow motion: {slow ? 'on' : 'off'}</Text></Pressable>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: reduce === true }} accessibilityLabel="Reduced motion" onPress={() => setReduce(reduce === true ? undefined : true)} style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 14, backgroundColor: '#e6edde', justifyContent: 'center' }}><Text style={{ color: '#31513b', fontSize: 13 }}>Motion: {reduce === true ? 'reduced' : 'system'}</Text></Pressable>
      </View>
    </View>
  );
}
