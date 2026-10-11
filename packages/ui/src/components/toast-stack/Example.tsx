import { Pressable, Text, View } from 'react-native';
import { ToastProvider, useToast } from './ToastStack';
function Controls() {
  const { toast, dismiss } = useToast();
  return <View style={{ flex: 1, padding: 24, gap: 20 }}>
    <Pressable accessibilityRole="button" onPress={() => toast({ message: 'Saved to your collection', description: 'Everything is right where you left it.', variant: 'success', action: { label: 'Undo', onPress: () => toast({ message: 'Save undone', variant: 'info' }) } })}><Text>Save something</Text></Pressable>
    <Pressable accessibilityRole="button" onPress={() => { for (let i = 1; i <= 5; i++) toast({ message: `Queued message ${i}`, duration: 4000 }); }}><Text>Queue five messages</Text></Pressable>
    <Pressable accessibilityRole="button" onPress={() => dismiss()}><Text>Clear all</Text></Pressable>
  </View>;
}
export default function Example() {
  // In a real app: const insets = useSafeAreaInsets(); from react-native-safe-area-context.
  return <ToastProvider insets={{ top: 0, bottom: 0 }}><Controls /></ToastProvider>;
}
