import { Link } from 'expo-router';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Example from '../../../packages/ui/src/components/page-curl/Example';
export default function CurlScreen() {
  const inset = useSafeAreaInsets();
  return <View style={{ flex: 1, backgroundColor: '#f3f6ee', paddingTop: inset.top + 24, paddingBottom: inset.bottom + 16 }}><Link href="/pinch" style={{ marginHorizontal: 24, color: '#31513b' }}>← Pinch Gallery</Link><Link href="/orbit" style={{ marginHorizontal: 24, marginTop: 16, color: '#31513b' }}>Next: Orbit QR →</Link><View style={{ flex: 1, justifyContent: 'center' }}><Example /></View><Text style={{ padding: 24, color: '#637e6b', fontSize: 12 }}>Skia cylinder fold. Not tested on a physical device.</Text></View>;
}
