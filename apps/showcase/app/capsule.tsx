import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { MorphCapsule, type CapsuleState } from '../../../packages/ui/src/components/morph-capsule/MorphCapsule';

export default function CapsuleScreen() {
  const [state, setState] = useState<CapsuleState>('idle');
  const [reduce, setReduce] = useState<boolean | undefined>();
  const content = {
    idle: <View style={styles.center}><Text style={styles.light}>Ready</Text></View>,
    compact: <View style={styles.row}><Text style={styles.light}>Focus session</Text><Text style={styles.light}>24:10</Text></View>,
    expanded: <View style={styles.center}>
      <Text style={styles.eyebrow}>FOCUS SESSION</Text><Text style={styles.time}>24:10</Text>
      <Text style={styles.hint}>Tap or drag to collapse</Text>
    </View>,
  };
  return <SafeAreaView style={styles.page}><ScrollView contentContainerStyle={styles.content}>
    <Link href="/" style={styles.back}>← Preview Rail</Link>
    <Text accessibilityRole="header" style={styles.title}>{'A pill that\nchanges its mind.'}</Text>
    <Text style={styles.subtitle}>Tap to step up. Drag down to expand and up to collapse. Grab it mid-morph.</Text>
    <View style={styles.demo}>
      <Text style={styles.platform}>{Platform.OS === 'web' ? 'React Native Web preview' : 'Native demo'}</Text>
      <MorphCapsule state={state} onStateChange={setState} content={content} reducedMotion={reduce}
        accessibilityLabel="Focus session" stateDescriptions={{ idle: 'No session running.', compact: '24 minutes left.', expanded: '24 minutes and 10 seconds left.' }}
        onFeedback={() => { if (Platform.OS !== 'web') void Haptics.selectionAsync().catch(() => {}); }} />
      <Text style={styles.note}>State: {state}</Text>
    </View>
    <View style={styles.options}>
      {(['idle', 'compact', 'expanded'] as const).map(name => (
        <Pressable key={name} accessibilityRole="button" onPress={() => setState(name)} style={styles.option}><Text style={styles.optionText}>{name}</Text></Pressable>
      ))}
      <Pressable accessibilityRole="button" onPress={() => setReduce(reduce === true ? undefined : true)} style={styles.option}>
        <Text style={styles.optionText}>{reduce === true ? 'Motion: reduced' : 'Motion: system'}</Text>
      </Pressable>
    </View>
    <Text style={styles.note}>Not device-verified: iOS, Android, screen readers and haptics. Optional haptics run only on native.</Text>
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f6f8f4' }, content: { width: '100%', maxWidth: 820, alignSelf: 'center', padding: 24, paddingTop: 42, gap: 24 },
  back: { color: '#456345', fontSize: 13 }, title: { fontSize: 44, lineHeight: 48, letterSpacing: -1.8, fontWeight: '700', color: '#193f30' },
  subtitle: { color: '#4b6053', fontSize: 16, lineHeight: 25 }, demo: { backgroundColor: '#fff', borderRadius: 28, padding: 20, gap: 24, borderWidth: 1, borderColor: '#d5e1d2' },
  platform: { fontSize: 11, color: '#52654f' }, note: { color: '#4b6053', fontSize: 13, lineHeight: 22 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, option: { paddingHorizontal: 12, minHeight: 44, borderRadius: 14, backgroundColor: '#e6edde', justifyContent: 'center' },
  optionText: { fontSize: 12, color: '#31513b', fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  light: { color: '#ffffff', fontSize: 13, fontWeight: '600' }, eyebrow: { color: '#9fc7b0', fontSize: 10, letterSpacing: 1.5, fontWeight: '700' },
  time: { color: '#ffffff', fontSize: 44, fontWeight: '700', letterSpacing: -1.5 }, hint: { color: '#9fc7b0', fontSize: 12 },
});
