import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { GooeyMenu, type GooeyMenuItem, type GooeyMenuProps } from './GooeyMenu';
const items: GooeyMenuItem[] = [
  { id: 'note', label: 'New note', glyph: '✎' },
  { id: 'photo', label: 'Add photo', glyph: '◐' },
  { id: 'voice', label: 'Record voice memo', glyph: '●' },
  { id: 'link', label: 'Save link', glyph: '↗' },
];
export default function Example({ onFeedback }: { onFeedback?: GooeyMenuProps['onFeedback'] }) {
  const [last, setLast] = useState('Nothing yet');
  const [slow, setSlow] = useState(false);
  return <View style={{ paddingVertical: 24, width: '100%', alignItems: 'center' }}><Text accessibilityLiveRegion="polite" style={{ color: '#31513b', fontSize: 13, marginBottom: 12 }}>Last action: {last}</Text><GooeyMenu items={items} label="Create" slowMotion={slow} onSelect={item => setLast(item.label)} onFeedback={onFeedback} /><Pressable accessibilityRole="switch" accessibilityState={{ checked: slow }} accessibilityLabel="Slow motion" onPress={() => setSlow(!slow)} style={{ marginTop: 16, minHeight: 44, paddingHorizontal: 16, borderRadius: 14, backgroundColor: '#e6edde', justifyContent: 'center' }}><Text style={{ color: '#31513b', fontSize: 13 }}>Slow motion: {slow ? 'on' : 'off'}</Text></Pressable></View>;
}
