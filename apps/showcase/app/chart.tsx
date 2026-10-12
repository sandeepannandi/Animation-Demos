import { Link } from 'expo-router';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Example from '../../../packages/ui/src/components/scrub-chart/Example';
export default function ChartScreen() {
  const inset = useSafeAreaInsets();
  return <View style={{ flex: 1, backgroundColor: '#f3f6ee', paddingTop: inset.top + 24, paddingBottom: inset.bottom + 16 }}><Link href="/lens" style={{ marginHorizontal: 24, color: '#31513b' }}>← Glass Lens</Link><View style={{ flex: 1, justifyContent: 'center' }}><Example /></View><Text style={{ padding: 24, color: '#637e6b', fontSize: 12 }}>Skia paths and Reanimated. Not yet tested on a device. Screen readers need native verification.</Text></View>;
}
