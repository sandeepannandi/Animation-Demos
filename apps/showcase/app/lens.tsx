import { Link } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Example from '../../../packages/ui/src/components/glass-lens/Example';
export default function LensScreen() {
  const inset = useSafeAreaInsets();
  return <View style={{ flex: 1, backgroundColor: '#f3f6ee', paddingTop: inset.top + 24, paddingBottom: inset.bottom + 16 }}><Link href="/ripple" style={{ marginHorizontal: 24, color: '#31513b' }}>← Ripple Reveal</Link><View style={{ flex: 1, justifyContent: 'center' }}><Example onFeedback={event => { if (Platform.OS === 'web') return; void (event === 'grab' ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) : Haptics.selectionAsync()).catch(() => {}); }} /></View><Text style={{ padding: 24, color: '#637e6b', fontSize: 12 }}>Skia runtime shader and Reanimated springs. Not yet tested on a device. Haptics and screen readers need native verification.</Text></View>;
}
