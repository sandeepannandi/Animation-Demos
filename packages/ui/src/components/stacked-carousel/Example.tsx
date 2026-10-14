import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { StackedCarousel, type StackedCarouselProps } from './StackedCarousel';
const items = [
  { id: 'quiet', label: 'Find your quiet', color: '#dce9c6', glyph: '◉', subtitle: 'A little room to think.' },
  { id: 'rhythm', label: 'Follow a rhythm', color: '#cfe1e9', glyph: '≋', subtitle: 'Let the day find its pace.' },
  { id: 'outside', label: 'Take the long way', color: '#f1d9c3', glyph: '↗', subtitle: 'There is more around the corner.' },
  { id: 'rest', label: 'Leave some space', color: '#ded4e9', glyph: '☾', subtitle: 'Not everything needs doing.' },
  { id: 'make', label: 'Make something', color: '#eae3ba', glyph: '✳', subtitle: 'Start with a small thought.' },
];
export default function Example({ onFeedback }: { onFeedback?: StackedCarouselProps<typeof items[number]>['onFeedback'] }) {
  const [reduce, setReduce] = useState<boolean | undefined>();
  return <View style={{ paddingVertical: 24, width: '100%' }}><StackedCarousel items={items} initialIndex={2} reducedMotion={reduce} onFeedback={onFeedback} renderCard={(item, i) => <View style={{ flex: 1, backgroundColor: item.color, borderRadius: 24, padding: 24, justifyContent: 'space-between' }}><Text style={{ color: '#315440', fontSize: 10, letterSpacing: 1.5, fontFamily: 'Geist-Regular' }}>0{i+1} / DAILY RITUALS</Text><Text style={{ color: '#254c36', fontSize: 70 }}>{item.glyph}</Text><View><Text style={{ color: '#193d2c', fontSize: 27, fontFamily: 'Geist-Bold', letterSpacing: -1 }}>{item.label}</Text><Text style={{ color: '#49614e', fontSize: 13, marginTop: 10, fontFamily: 'Geist-Regular' }}>{item.subtitle}</Text></View><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: '#315440', fontSize: 11, fontFamily: 'Geist-Regular' }}>A SMALL MOMENT</Text><Text style={{ color: '#315440', fontSize: 11 }}>↗</Text></View></View>} /><View style={{ alignItems: 'center', gap: 10, marginTop: 8 }}><Text style={{ color: '#4b6053', fontSize: 12 }}>Drag or swipe. Tap a side card to focus.</Text><Pressable accessibilityRole="switch" accessibilityState={{ checked: reduce === true }} accessibilityLabel="Reduced motion" onPress={() => setReduce(reduce === true ? undefined : true)} style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 14, backgroundColor: '#e6edde', justifyContent: 'center' }}><Text style={{ color: '#31513b', fontSize: 13 }}>Motion: {reduce === true ? 'reduced' : 'system'}</Text></Pressable></View></View>;
}
