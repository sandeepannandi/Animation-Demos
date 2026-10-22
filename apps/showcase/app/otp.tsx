import { Link } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Example from '../../../packages/ui/src/components/otp-verify/Example';
export default function OtpScreen() {
  const inset = useSafeAreaInsets();
  return <View style={{ flex: 1, backgroundColor: '#f3f6ee', paddingTop: inset.top + 24, paddingBottom: inset.bottom + 16 }}><Link href="/" style={{ marginHorizontal: 24, color: '#31513b' }}>← Preview Rail</Link><View style={{ flex: 1, justifyContent: 'center' }}><Example onFeedback={(e) => { if (Platform.OS === 'web') return; const h = e === 'digit' ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) : Haptics.notificationAsync(e === 'verified' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error); void h.catch(() => {}); }} /></View><Text style={{ padding: 24, color: '#637e6b', fontSize: 12 }}>Skia and Reanimated. Haptics and screen readers need native verification.</Text></View>;
}
