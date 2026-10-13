import { Link } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Example from '../../../packages/ui/src/components/pinch-gallery/Example';
export default function PinchScreen() {
  const inset = useSafeAreaInsets();
  return <View style={{ flex: 1, backgroundColor: '#f3f6ee', paddingTop: inset.top + 24, paddingBottom: inset.bottom + 16 }}>
    <Link href="/chart" style={{ marginHorizontal: 24, color: '#31513b' }}>← Scrub Chart</Link>
    <Link href="/curl" style={{ marginHorizontal: 24, marginTop: 16, color: '#31513b' }}>Next: Page Curl →</Link>
    <Example onFeedback={event => { if (Platform.OS === 'web') return; void (event === 'select-change' ? Haptics.selectionAsync() : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)).catch(() => {}); }} />
    <Text style={{ padding: 24, color: '#637e6b', fontSize: 12 }}>Core RN, no new dependencies. Not yet tested on a device. Pinch, hold-to-select and haptics need native verification.</Text>
  </View>;
}
