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
  return <View style={[styles.page, { paddingTop: insets.top + 12 }]}>
    <View style={styles.nav}><Link href="/toasts" style={styles.navLink}>← Toast Stack</Link><Link href="/swipe" style={styles.navLink}>Next: Swipe Row →</Link></View>
    <View style={[styles.content, { paddingBottom: 92 + insets.bottom }]}>
      <View style={styles.orb} />
      <Text style={styles.eyebrow}>YOUR EVERYDAY</Text>
      <Text style={styles.title}>A little room to wander.</Text>
      <Text style={styles.sub}>Make space for the things you love.</Text>
      <View style={styles.art}><View style={styles.hillBack} /><View style={styles.hill} /><View style={styles.hillFront} /></View>
      <Text style={styles.caption}>TAP A TAB, OR HOLD THE ACTIVE TAB AND SLIDE</Text>
      <Text style={styles.hidden} accessibilityLabel={`Selected: ${tabs.find(tab => tab.id === activeId)?.label}`}> </Text>
    </View>
    <LiquidTabs tabs={tabs} activeId={activeId} onTabChange={setActiveId} bottomInset={insets.bottom}
      onFeedback={() => { if (Platform.OS !== 'web') void Haptics.selectionAsync().catch(() => {}); }} />
  </View>;
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#d3ead9' },
  nav: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, paddingBottom: 8 },
  navLink: { fontFamily: 'Geist-Regular', color: '#3c5c4b', fontSize: 12 },
  content: { flex: 1, marginHorizontal: 16, paddingHorizontal: 20, paddingTop: 36, gap: 14, borderRadius: 28, backgroundColor: '#d3ead9', overflow: 'hidden' },
  orb: { position: 'absolute', top: -120, right: -90, width: 320, height: 320, borderRadius: 160, backgroundColor: 'rgba(255,255,255,0.35)' },
  eyebrow: { fontFamily: 'Geist-Regular', fontSize: 10, letterSpacing: 1.6, color: '#4c6b59' },
  title: { fontSize: 36, lineHeight: 40, color: '#193f30', fontFamily: 'Geist-SemiBold', letterSpacing: -1, maxWidth: 240 },
  sub: { fontFamily: 'Geist-Regular', color: '#4c6b59', fontSize: 14 },
  art: { height: 140, overflow: 'hidden', backgroundColor: '#bdd9c6', borderRadius: 14, marginTop: 8 },
  hillBack: { position: 'absolute', top: -20, left: 100, width: 420, height: 200, borderRadius: 210, backgroundColor: '#8fb5a0', transform: [{ rotate: '-8deg' }] },
  hill: { position: 'absolute', bottom: -90, left: -60, width: 420, height: 190, borderRadius: 200, backgroundColor: '#628f79', transform: [{ rotate: '-15deg' }] },
  hillFront: { position: 'absolute', bottom: -70, right: -80, width: 340, height: 150, borderRadius: 170, backgroundColor: '#3b6b55', transform: [{ rotate: '-5deg' }] },
  caption: { fontFamily: 'Geist-Regular', fontSize: 9, letterSpacing: 1.3, color: '#4c6b59', marginTop: 12 },
  hidden: { height: 0, width: 0 },
});
