import { useState } from 'react';
import { Link } from 'expo-router';
import { Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ToastProvider, useToast } from '../../../packages/ui/src/components/toast-stack/ToastStack';
function Controls({ toggle, position }: { toggle: () => void; position: string }) {
  const { toast, dismiss } = useToast();
  const button = { padding: 14, backgroundColor: '#e6edde', borderRadius: 16, minHeight: 44 };
  return <View style={{ flex: 1, padding: 24, paddingTop: 64, gap: 20, backgroundColor: '#f6f8f4' }}>
    <Link href="/capsule">← Morph Capsule</Link><Text style={{ fontSize: 34, fontWeight: '700', color: '#193f30' }}>Toast Stack</Text>
    <Text>Swipe to dismiss. Hold to pause. Three visible, the rest queued.</Text>
    <Pressable accessibilityRole="button" style={button} onPress={() => toast({ message: 'Saved to collection', description: 'A little less to carry.', variant: 'success', action: { label: 'Undo', onPress: () => toast({ message: 'Save undone', variant: 'info' }) } })}><Text>Save with Undo</Text></Pressable>
    <Pressable accessibilityRole="button" style={button} onPress={() => { for (let i=1; i<=5; i++) toast({ message: `Message ${i} of 5`, description: 'Full timer starts when visible.', duration: 4000 }); }}><Text>Queue five</Text></Pressable>
    <Pressable accessibilityRole="button" style={button} onPress={() => toast({ id: 'upload', message: 'Upload failed', description: 'Check your connection and try again.', variant: 'error', duration: 0 })}><Text>Persistent error</Text></Pressable>
    <Pressable accessibilityRole="button" style={button} onPress={() => { dismiss(); toggle(); }}><Text>Position: {position}</Text></Pressable>
    <Pressable accessibilityRole="button" style={button} onPress={() => dismiss()}><Text>Clear all</Text></Pressable>
    <Text>React Native source. Web demo enables timers because RN Web always reports a screen reader. Native follows your actual accessibility setting. Not yet tested on a device.</Text>
  </View>;
}
export default function ToastScreen() {
  const insets = useSafeAreaInsets(); const [position, setPosition] = useState<'top'|'bottom'>('bottom');
  return <ToastProvider position={position} insets={insets} pauseForScreenReader={Platform.OS !== 'web'} onFeedback={() => { if (Platform.OS !== 'web') void Haptics.selectionAsync().catch(() => {}); }}><Controls position={position} toggle={() => setPosition(position === 'top' ? 'bottom' : 'top')} /></ToastProvider>;
}
