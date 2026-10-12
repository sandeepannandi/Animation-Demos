import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { DragToSort, type SortFeedback } from './DragToSort';
export const initialTasks = ['Sketch the idea', 'Pick a direction', 'Build the prototype', 'Test the gestures', 'Refine the details', 'Review the source', 'Ship the update', 'Take a breath'].map((title, i) => ({ id: String(i), title, subtitle: i < 3 ? 'Today · Creative work' : 'This week · Small steps' }));
export default function Example({ onFeedback }: { onFeedback?: (event: SortFeedback) => void }) {
  const [items, setItems] = useState(initialTasks);
  return <View style={{ padding: 18, backgroundColor: '#f3f6ee' }}>
    <Text style={{ fontSize: 28, fontWeight: '700', color: '#193f30', marginBottom: 16 }}>Make room for what matters.</Text>
    <DragToSort items={items} keyExtractor={item => item.id} labelExtractor={item => item.title} onOrderChange={setItems} onFeedback={onFeedback} renderItem={(item, index) => <View><Text style={{ fontWeight: '600', color: '#193f30' }}>{index + 1}. {item.title}</Text><Text style={{ fontSize: 11, color: '#6a7b6a', marginTop: 4 }}>{item.subtitle}</Text></View>} />
    <Text style={{ fontSize: 12, color: '#6a7b6a', marginTop: 12 }}>Grab a handle. Keep it near an edge to scroll. Cancel restores the order. Keyboard: focus a handle, use arrows.</Text>
  </View>;
}
