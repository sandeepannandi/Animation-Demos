import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MosaicGallery, type MosaicGalleryProps } from './MosaicGallery';
import { MOSAIC_PAINTINGS } from './mosaic-data';

export default function Example({ onFeedback }: { onFeedback?: MosaicGalleryProps['onFeedback'] }) {
  const [index, setIndex] = useState(0);
  const [slow, setSlow] = useState(false);
  const [reduce, setReduce] = useState<boolean | undefined>();
  const painting = MOSAIC_PAINTINGS[index];
  const onChange = useCallback((i: number) => setIndex(i), []);
  return (
    <View style={{ paddingVertical: 24, width: '100%', alignItems: 'center' }}>
      <Text accessibilityLiveRegion="polite" style={{ color: '#31513b', fontSize: 13, marginBottom: 4 }}>
        {painting.title} · {painting.artist}, {painting.year}
      </Text>
      <MosaicGallery label={`Mosaic of ${painting.title} by ${painting.artist}`} index={index} onIndexChange={onChange} slowMotion={slow} reducedMotion={reduce} onFeedback={onFeedback} />
      <Text style={{ color: '#4b6053', fontSize: 12, marginTop: 16 }}>Tap the mosaic for the next painting. Pinch to zoom, double-tap to zoom in.</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 10 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Next painting" onPress={() => setIndex((index + 1) % MOSAIC_PAINTINGS.length)} style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 14, backgroundColor: '#31513b', justifyContent: 'center' }}><Text style={{ color: '#f3f6ee', fontSize: 13 }}>Next painting</Text></Pressable>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: slow }} accessibilityLabel="Slow motion" onPress={() => setSlow(!slow)} style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 14, backgroundColor: '#e6edde', justifyContent: 'center' }}><Text style={{ color: '#31513b', fontSize: 13 }}>Slow motion: {slow ? 'on' : 'off'}</Text></Pressable>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: reduce === true }} accessibilityLabel="Reduced motion" onPress={() => setReduce(reduce === true ? undefined : true)} style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 14, backgroundColor: '#e6edde', justifyContent: 'center' }}><Text style={{ color: '#31513b', fontSize: 13 }}>Motion: {reduce === true ? 'reduced' : 'system'}</Text></Pressable>
      </View>
    </View>
  );
}
