import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Skia } from '@shopify/react-native-skia';
import { PageCurl, type PageCurlHandle } from './PageCurl';
const COLORS = ['#e6edde', '#dce9eb', '#f0e2ce'];
export default function Example() {
  const [reduce, setReduce] = useState(false), [index, setIndex] = useState(0);
  const pager = useRef<PageCurlHandle>(null);
  const pages = useMemo(() => COLORS.map((color, i) => {
    const surface = Skia.Surface.MakeOffscreen(600, 800);
    if (!surface) throw new Error('Unable to prepare page');
    const c = surface.getCanvas(), paint = Skia.Paint();
    c.clear(Skia.Color(color)); paint.setColor(Skia.Color('#214b3b'));
    c.drawRect(Skia.XYWHRect(48, 48, 130, 8), paint);
    c.drawRect(Skia.XYWHRect(48, 100, 330 - i*50, 16), paint);
    paint.setColor(Skia.Color(['#86a887', '#7eacb3', '#c4a47d'][i]));
    c.drawCircle(310, 435, 185, paint); paint.setColor(Skia.Color('#214b3b'));
    for (let j = 0; j <= i; j++) c.drawCircle(54 + j*24, 750, 6, paint);
    surface.flush(); const snapshot = surface.makeImageSnapshot();
    const image = snapshot.makeNonTextureImage(); snapshot.dispose(); surface.dispose(); paint.dispose();
    if (!image) throw new Error("Unable to copy page image");
    return { image, label: `Field notes ${i + 1}` };
  }), []);
  useEffect(() => () => { pages.forEach(p => p.image.dispose()); }, [pages]);
  return <View style={{ alignItems: 'center', gap: 20 }}><PageCurl ref={pager} onPageChange={setIndex} pages={pages} width={300} height={400} reducedMotion={reduce ? true : undefined} /><View style={{ flexDirection: 'row', gap: 32, alignItems: 'center' }}><Pressable accessibilityRole="button" accessibilityLabel="Previous page" disabled={index === 0} onPress={() => pager.current?.previous()} style={{ padding: 12 }}><Text>←</Text></Pressable><Text>{index + 1} / 3</Text><Pressable accessibilityRole="button" accessibilityLabel="Next page" disabled={index === 2} onPress={() => pager.current?.next()} style={{ padding: 12 }}><Text>→</Text></Pressable></View><Pressable accessibilityRole="button" onPress={() => setReduce(v => !v)} style={{ padding: 12, backgroundColor: '#e6edde', borderRadius: 20 }}><Text>Motion: {reduce ? 'reduced' : 'system'}</Text></Pressable></View>;
}
