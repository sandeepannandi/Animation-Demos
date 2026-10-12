import { useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { SwipeRow, SwipeRowGroup, useCloseSwipeRows, type SwipeAction } from './SwipeRow';
type Message = { id: string; from: string; preview: string; pinned: boolean };
const initial: Message[] = [
  { id: '1', from: 'Asha', preview: 'Lunch on Thursday?', pinned: false },
  { id: '2', from: 'Ravi', preview: 'The build is green again.', pinned: false },
  { id: '3', from: 'Mina', preview: 'Sent you the photos.', pinned: false },
];
function List() {
  const [items, setItems] = useState(initial);
  const closeAll = useCloseSwipeRows();
  const drop = (id: string) => setItems(list => list.filter(item => item.id !== id));
  const togglePin = (id: string) => setItems(list => list.map(item => item.id === id ? { ...item, pinned: !item.pinned } : item));
  return <FlatList data={items} keyExtractor={item => item.id} onScrollBeginDrag={closeAll} renderItem={({ item }) => {
    const pin: SwipeAction = { id: 'pin', label: item.pinned ? 'Unpin' : 'Pin', icon: <Text style={{ fontSize: 20 }}>📌</Text>, backgroundColor: '#d99a2b', onPress: () => togglePin(item.id) };
    const archive: SwipeAction = { id: 'archive', label: 'Archive', completedLabel: 'Archived', backgroundColor: '#4f8a6a', removesRow: true, onPress: () => drop(item.id) };
    const del: SwipeAction = { id: 'delete', label: 'Delete', completedLabel: 'Deleted', backgroundColor: '#b84a4a', removesRow: true, onPress: () => drop(item.id) };
    return <SwipeRow leadingActions={[pin]} trailingActions={[archive, del]} accessibilityLabel={`${item.from}: ${item.preview}`}>
      <View style={{ padding: 16 }}><Text style={{ fontWeight: '600' }}>{item.pinned ? '📌 ' : ''}{item.from}</Text><Text>{item.preview}</Text></View>
    </SwipeRow>;
  }} />;
}
export default function Example() {
  return <SwipeRowGroup><List /></SwipeRowGroup>;
}
