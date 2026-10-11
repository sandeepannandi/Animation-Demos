import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { LiquidTabs } from '../../../packages/ui/src/components/liquid-tabs/LiquidTabs';
const tabs = [
  { id: 'home', label: 'Home', icon: () => <Text style={{ fontSize: 22 }}>⌂</Text> },
  { id: 'explore', label: 'Explore', icon: () => <Text style={{ fontSize: 22 }}>◇</Text> },
  { id: 'saved', label: 'Saved', icon: () => <Text style={{ fontSize: 22 }}>♡</Text> },
  { id: 'you', label: 'You', icon: () => <Text style={{ fontSize: 22 }}>○</Text> },
];
export default function GlassScreen() {
  const [activeId, setActiveId] = useState('home');
  const insets = useSafeAreaInsets();
  return <View style={[styles.page, { paddingTop: insets.top + 24 }]}>
    <View style={[styles.content, { paddingBottom: 92 + insets.bottom }]}>
      <Link href="/toasts">← Toast Stack</Link>
      <Text style={styles.title}>A little room to wander.</Text>
      <Text style={styles.label}>Selected: {tabs.find(tab => tab.id === activeId)?.label}</Text>
      <View style={styles.art}><View style={styles.hill} /></View>
      <Text style={styles.label}>Tap a tab, or hold the active tab and slide left or right. Not device-tested. iOS 26+: native glass when available. Earlier iOS: blur. Android and web: opaque. Optional haptics run only on native.</Text>
    </View>
    <LiquidTabs tabs={tabs} activeId={activeId} onTabChange={setActiveId} bottomInset={insets.bottom}
      onFeedback={() => { if (Platform.OS !== 'web') void Haptics.selectionAsync().catch(() => {}); }} />
  </View>;
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#d3ead9' }, content: { flex: 1, paddingHorizontal: 24, gap: 24 },
  title: { fontSize: 38, color: '#203e32', fontWeight: '600' }, label: { color: '#3c5c4b', fontSize: 13, lineHeight: 22 },
  art: { flex: 1, minHeight: 90, maxHeight: 250, overflow: 'hidden', backgroundColor: '#bdd9c6', borderRadius: 28 },
  hill: { position: 'absolute', bottom: -80, left: -50, width: 500, height: 250, borderRadius: 200, backgroundColor: '#628f79', transform: [{ rotate: '-15deg' }] },
});
