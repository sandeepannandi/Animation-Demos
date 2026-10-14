import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { PinchGallery, type GalleryFeedback } from './PinchGallery';
const hues = [152, 168, 190, 205, 24, 12, 338, 275, 48, 96];
export const photos = Array.from({ length: 48 }, (_, i) => {
  const hue = hues[(i * 7 + (i >> 2)) % hues.length];
  return { id: String(i), title: `Photo ${i + 1}`, base: `hsl(${hue}, 42%, ${46 + (i * 5) % 22}%)`, light: `hsl(${(hue + 24) % 360}, 55%, ${72 + (i * 3) % 14}%)`, shape: i % 3 };
});
export default function Example({ onFeedback }: { onFeedback?: (event: GalleryFeedback) => void }) {
  const [columns, setColumns] = useState(3);
  const [selected, setSelected] = useState<string[]>([]);
  return <View style={{ padding: 16, backgroundColor: '#e8eee0', borderRadius: 28, marginHorizontal: 12, overflow: 'hidden' }}>
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 }}>
      <View><Text style={{ fontSize: 28, fontWeight: '700', color: '#193f30' }}>Library</Text><Text style={{ fontSize: 12, color: '#6a7b6a', marginTop: 2 }}>{selected.length ? `${selected.length} selected` : `${photos.length} photos`}</Text></View>
      {selected.length ? <Pressable accessibilityRole="button" onPress={() => setSelected([])} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, backgroundColor: '#193f30' }}><Text style={{ color: '#fff', fontWeight: '600' }}>Clear</Text></Pressable>
        : <View style={{ flexDirection: 'row', backgroundColor: '#e2eadb', borderRadius: 99, padding: 3 }}>{[2, 3, 5].map(n => <Pressable key={n} accessibilityRole="button" accessibilityState={{ selected: columns === n }} accessibilityLabel={`${n} columns`} onPress={() => setColumns(n)} style={{ minWidth: 34, paddingVertical: 6, alignItems: 'center', borderRadius: 99, backgroundColor: columns === n ? '#fff' : 'transparent' }}><Text style={{ fontWeight: '600', color: '#31513b' }}>{n}</Text></Pressable>)}</View>}
    </View>
    <PinchGallery items={photos} keyExtractor={p => p.id} labelExtractor={p => p.title} columns={columns} onColumnsChange={setColumns} selectedIds={selected} onSelectionChange={setSelected} onFeedback={onFeedback} height={460}
      renderItem={p => <View style={{ flex: 1, backgroundColor: p.base }}>
        <View style={{ position: 'absolute', left: '-20%', right: '-20%', bottom: '-30%', height: '70%', borderRadius: 999, backgroundColor: p.light, opacity: 0.55 }} />
        {p.shape === 0 && <View style={{ position: 'absolute', top: '14%', right: '16%', width: '24%', aspectRatio: 1, borderRadius: 99, backgroundColor: '#ffffffcc' }} />}
        {p.shape === 1 && <View style={{ position: 'absolute', top: '18%', left: '14%', width: '34%', height: '34%', borderRadius: 6, backgroundColor: '#ffffff66', transform: [{ rotate: '18deg' }] }} />}
      </View>} />
    <Text style={{ fontSize: 12, color: '#6a7b6a', marginTop: 12 }}>Pinch with two fingers to change density. Hold a photo, then drag across others to select. Keep a finger near an edge to scroll.</Text>
  </View>;
}
