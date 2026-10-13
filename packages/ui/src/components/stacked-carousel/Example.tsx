import React from 'react';
import { Text, View } from 'react-native';
import { StackedCarousel, type StackedCarouselProps } from './StackedCarousel';
const items = [
  { id: 'quiet', label: 'Find your quiet', color: '#dce9c6', glyph: '◉', subtitle: 'A little room to think.' },
  { id: 'rhythm', label: 'Follow a rhythm', color: '#cfe1e9', glyph: '≋', subtitle: 'Let the day find its pace.' },
  { id: 'outside', label: 'Take the long way', color: '#f1d9c3', glyph: '↗', subtitle: 'There is more around the corner.' },
  { id: 'rest', label: 'Leave some space', color: '#ded4e9', glyph: '☾', subtitle: 'Not everything needs doing.' },
  { id: 'make', label: 'Make something', color: '#eae3ba', glyph: '✳', subtitle: 'Start with a small thought.' },
];
export default function Example({ onFeedback }: { onFeedback?: StackedCarouselProps<typeof items[number]>['onFeedback'] }) {
  return <View style={{ paddingVertical: 24, width: '100%' }}><StackedCarousel items={items} initialIndex={2} onFeedback={onFeedback} renderCard={(item, i) => <View style={{ flex: 1, backgroundColor: item.color, borderRadius: 24, padding: 24, justifyContent: 'space-between' }}><Text style={{ color: '#315440', fontSize: 10, letterSpacing: 1.5, fontFamily: 'Geist-Regular' }}>0{i+1} / DAILY RITUALS</Text><Text style={{ color: '#254c36', fontSize: 70 }}>{item.glyph}</Text><View><Text style={{ color: '#193d2c', fontSize: 27, fontFamily: 'Geist-Bold', letterSpacing: -1 }}>{item.label}</Text><Text style={{ color: '#49614e', fontSize: 13, marginTop: 10, fontFamily: 'Geist-Regular' }}>{item.subtitle}</Text></View><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: '#315440', fontSize: 11, fontFamily: 'Geist-Regular' }}>A SMALL MOMENT</Text><Text style={{ color: '#315440', fontSize: 11 }}>↗</Text></View></View>} /></View>;
}
