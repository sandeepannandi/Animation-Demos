import { Link } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Example from '../../../packages/ui/src/components/stacked-carousel/Example';
export default function CarouselScreen() {
  const inset = useSafeAreaInsets();
  return <View style={{ flex: 1, backgroundColor: '#f3f6ee', paddingTop: inset.top + 24, paddingBottom: inset.bottom + 16 }}><Link href="/sort" style={{ marginHorizontal: 24, color: '#31513b' }}>← Drag to Sort</Link><Example onFeedback={() => { if (Platform.OS !== 'web') void Haptics.selectionAsync().catch(() => {}); }} /><Text style={{ padding: 24, color: '#637e6b', fontSize: 12 }}>Core RN, no new dependency. Not yet tested on a device. Native screen readers and haptics need verification.</Text></View>;
}
