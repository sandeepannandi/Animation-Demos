import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { BubblePicker, type BubbleItem, type BubblePickerProps } from './BubblePicker';

const topics: BubbleItem[] = [
  { id: 'music', label: 'Music', color: '#e2725b' },
  { id: 'travel', label: 'Travel', color: '#5ca4a9' },
  { id: 'food', label: 'Food', color: '#f2a65a' },
  { id: 'tech', label: 'Tech', color: '#8e7cc3' },
  { id: 'art', label: 'Art', color: '#d6679a' },
  { id: 'sport', label: 'Sport', color: '#7fb069' },
  { id: 'books', label: 'Books', color: '#f0c05a' },
  { id: 'film', label: 'Film', color: '#588b8b' },
  { id: 'photo', label: 'Photo', color: '#c8553d' },
  { id: 'games', label: 'Games', color: '#5b8e7d' },
];

export default function Example({ onFeedback }: { onFeedback?: BubblePickerProps['onFeedback'] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [slow, setSlow] = useState(false);
  const [reduce, setReduce] = useState<boolean | undefined>();
  const onSelection = useCallback((ids: string[]) => setSelected(ids), []);
  return (
    <View style={{ paddingVertical: 24, width: '100%', alignItems: 'center' }}>
      <Text accessibilityLiveRegion="polite" style={{ color: '#31513b', fontSize: 13, marginBottom: 12 }}>
        {selected.length === 0 ? 'Tap bubbles to pick topics' : `Picked ${selected.length}: ${selected.join(', ')}`}
      </Text>
      <BubblePicker items={topics} label="Choose topics" slowMotion={slow} reducedMotion={reduce} onSelectionChange={onSelection} onFeedback={onFeedback} />
      <Text style={{ color: '#4b6053', fontSize: 12, marginTop: 16 }}>Drag to fling. Tap a bubble to select it.</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: slow }} accessibilityLabel="Slow motion" onPress={() => setSlow(!slow)} style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 14, backgroundColor: '#e6edde', justifyContent: 'center' }}><Text style={{ color: '#31513b', fontSize: 13 }}>Slow motion: {slow ? 'on' : 'off'}</Text></Pressable>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: reduce === true }} accessibilityLabel="Reduced motion" onPress={() => setReduce(reduce === true ? undefined : true)} style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 14, backgroundColor: '#e6edde', justifyContent: 'center' }}><Text style={{ color: '#31513b', fontSize: 13 }}>Motion: {reduce === true ? 'reduced' : 'system'}</Text></Pressable>
      </View>
    </View>
  );
}
