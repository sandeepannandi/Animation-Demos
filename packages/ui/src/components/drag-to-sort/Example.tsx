import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { DragToSort, type SortFeedback } from './DragToSort';
export const initialTasks = ['Sketch the idea', 'Pick a direction', 'Build the prototype', 'Test the gestures', 'Refine the details', 'Review the source', 'Ship the update', 'Take a breath'].map((title, i) => ({ id: String(i), title, subtitle: i < 3 ? 'Today · Creative work' : 'This week · Small steps' }));
// Geist-* font names are optional: load them (see apps/showcase) or the system font is used.
export default function Example({ onFeedback }: { onFeedback?: (event: SortFeedback) => void }) {
  const [items, setItems] = useState(initialTasks);
  return <View style={{ alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16, gap: 10 }}>
    <View style={{ width: 370, maxWidth: '100%', borderRadius: 26, paddingTop: 22, paddingHorizontal: 14, paddingBottom: 14, backgroundColor: '#f0f4e9', borderWidth: 1, borderColor: '#dce5d4' }}>
      <Text style={{ fontSize: 9, letterSpacing: 1.7, fontFamily: 'Geist-Bold', color: '#698064', marginHorizontal: 10, marginBottom: 8 }}>YOUR DAILY LIST</Text>
      <Text accessibilityRole="header" style={{ fontSize: 34, lineHeight: 37, letterSpacing: -1.2, fontFamily: 'Geist-SemiBold', color: '#193f30', marginHorizontal: 10 }}>Make room.</Text>
      <Text style={{ fontSize: 12, fontFamily: 'Geist-Regular', color: '#698064', marginHorizontal: 10, marginTop: 8, marginBottom: 20 }}>A little order. A clearer head.</Text>
      <DragToSort height={318} items={items} keyExtractor={item => item.id} labelExtractor={item => item.title} onOrderChange={setItems} onFeedback={onFeedback} renderItem={(item, index) => <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ fontSize: 11, fontFamily: 'Geist-Regular', color: '#96a990', marginRight: 12, minWidth: 18 }}>{String(index + 1).padStart(2, '0')}</Text>
        <View style={{ flex: 1, gap: 5 }}><Text style={{ fontSize: 12, fontFamily: 'Geist-SemiBold', color: '#274e38' }}>{item.title}</Text><Text style={{ fontSize: 9, fontFamily: 'Geist-Regular', color: '#81947b' }}>{item.subtitle}</Text></View>
      </View>} />
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 12, paddingHorizontal: 8 }}>
        <Text style={{ fontSize: 10, fontFamily: 'Geist-Regular', color: '#4b7047' }}>Motion: system</Text>
      </View>
    </View>
    <Text style={{ textAlign: 'center', fontSize: 10, lineHeight: 16, fontFamily: 'Geist-Regular', color: '#7d887c', maxWidth: 380 }}>Grab the dotted handle. Cancel restores the order.</Text>
  </View>;
}
