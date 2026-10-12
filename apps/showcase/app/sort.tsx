import { Link } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Example from '../../../packages/ui/src/components/drag-to-sort/Example';
export default function SortScreen() {
  const inset = useSafeAreaInsets();
  return <View style={{ flex: 1, backgroundColor: '#f3f6ee', paddingTop: inset.top + 24, paddingBottom: inset.bottom + 16 }}>
    <Link href="/cards" style={{ marginHorizontal: 24, color: '#31513b' }}>← Expanding Card</Link>
    <Example onFeedback={event => { if (Platform.OS === 'web') return; void (event === 'cross' || event === 'move' ? Haptics.selectionAsync() : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)).catch(() => {}); }} />
    <Text style={{ padding: 24, color: '#637e6b', fontSize: 12 }}>Core RN, no new dependencies. Not yet tested on a device. Haptics and screen reader actions need native verification.</Text>
  </View>;
}
