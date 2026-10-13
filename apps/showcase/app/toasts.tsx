import { useState } from 'react';
import { Link } from 'expo-router';
import { Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ToastProvider, useToast } from '../../../packages/ui/src/components/toast-stack/ToastStack';
function Controls({ toggle, position }: { toggle: () => void; position: string }) {
  const { toast, dismiss } = useToast();
  const button = { paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#e6edde', borderColor: '#d5e1d2', borderWidth: 1, borderRadius: 14, minHeight: 44, justifyContent: 'center' as const };
  const label = { fontFamily: 'Geist-Medium', fontSize: 12, color: '#31513b' };
  return <View style={{ flex: 1, padding: 24, paddingTop: 64, gap: 20, backgroundColor: '#f6f8f4' }}>
    <Link href="/capsule">← Morph Capsule</Link><Text style={{ fontSize: 34, fontFamily: 'Geist-Bold', color: '#193f30' }}>Toast Stack</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
    <Pressable accessibilityRole="button" style={button} onPress={() => toast({ message: 'Saved to collection', description: 'A little less to carry.', variant: 'success', action: { label: 'Undo', onPress: () => toast({ message: 'Save undone', variant: 'info' }) } })}><Text style={label}>Save + Undo</Text></Pressable>
    <Pressable accessibilityRole="button" style={button} onPress={() => { for (let i=1; i<=5; i++) toast({ message: `Message ${i} of 5`, description: 'Full timer starts when visible.', duration: 4000 }); }}><Text style={label}>Queue five</Text></Pressable>
    <Pressable accessibilityRole="button" style={button} onPress={() => toast({ id: 'upload', message: 'Upload failed', description: 'Check your connection and try again.', variant: 'error', duration: 0 })}><Text style={label}>Persistent error</Text></Pressable>
    <Pressable accessibilityRole="button" style={button} onPress={() => { dismiss(); toggle(); }}><Text style={label}>Position: {position}</Text></Pressable>
    <Pressable accessibilityRole="button" style={button} onPress={() => dismiss()}><Text style={label}>Clear all</Text></Pressable>
    </View>
    <Text style={{ fontFamily: 'Geist-Regular', fontSize: 12, color: '#4b6053' }}>Swipe a card in any direction. Hold to pause.</Text>
    <View style={{ flex: 1, minHeight: 220, borderRadius: 24, backgroundColor: '#eff3e8', borderWidth: 1, borderColor: '#dde6d6', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: 'Geist-Regular', fontSize: 9, letterSpacing: 1.6, color: '#7a8f76' }}>A SMALL MOMENT OF FEEDBACK</Text></View>
    <Text style={{ fontFamily: 'Geist-Regular', fontSize: 12, color: '#4b6053' }}>Swipe to dismiss. Three visible, the rest queued. React Native source. Web demo enables timers because RN Web always reports a screen reader. Native follows your actual accessibility setting. Not yet tested on a device.</Text>
  </View>;
}
export default function ToastScreen() {
  const insets = useSafeAreaInsets(); const [position, setPosition] = useState<'top'|'bottom'>('bottom');
  return <ToastProvider position={position} insets={insets} pauseForScreenReader={Platform.OS !== 'web'} onFeedback={() => { if (Platform.OS !== 'web') void Haptics.selectionAsync().catch(() => {}); }}><Controls position={position} toggle={() => setPosition(position === 'top' ? 'bottom' : 'top')} /></ToastProvider>;
}
