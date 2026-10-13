import { Link } from 'expo-router';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Example from '../../../packages/ui/src/components/blossom-qr/Example';
export default function BlossomScreen() {
  const inset = useSafeAreaInsets();
  return <KeyboardAvoidingView behavior="padding" enabled={Platform.OS !== 'web'} style={{ flex: 1, backgroundColor: '#f3f6ee', paddingTop: inset.top + 24, paddingBottom: inset.bottom + 16 }}><Link href="/orbit" style={{ marginHorizontal: 24, color: '#31513b' }}>← Orbit QR</Link><View style={{ flex: 1, justifyContent: 'center' }}><Example /></View><Text style={{ padding: 24, color: '#637e6b', fontSize: 12 }}>An isometric Skia blossom tree that flattens into a QR code. Not tested on a physical device.</Text></KeyboardAvoidingView>;
}
