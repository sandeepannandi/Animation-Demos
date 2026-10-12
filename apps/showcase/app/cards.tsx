import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { ExpandingCard, ExpandingCardHost, type ExpandingFeedbackEvent } from '../../../packages/ui/src/components/expanding-card/ExpandingCard';

const disc = (size: number, extra: object) => <View style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2 }, extra]} />;
const stories = [
  { id: 'mornings', eyebrow: 'The Daily List', title: 'Slow mornings, better days', color: '#d9892b', art: <>{disc(230, { right: -60, bottom: -80, backgroundColor: '#ffffff33' })}{disc(120, { right: 70, bottom: 36, backgroundColor: '#ffe2a8' })}</>, lead: 'Start before the screen does.', body: 'Five small habits that make the first hour feel like yours: water, light, one page, one stretch, then the phone.', chips: ['Water', 'Light', 'One page'], quote: 'The morning you protect pays for the afternoon you will not.' },
  { id: 'market', eyebrow: 'Out and about', title: 'The night market guide', color: '#2f6f5a', art: <>{disc(180, { left: -40, bottom: -70, backgroundColor: '#ffffff22' })}{disc(90, { right: 40, top: 70, backgroundColor: '#f4c95d' })}{disc(40, { right: 150, bottom: 40, backgroundColor: '#e86f51' })}</>, lead: 'Go hungry. Go late.', body: 'Walk the whole row once before you buy anything. The best stall is rarely the first one with a queue.', chips: ['Cash', 'Small bags', 'Share plates'], quote: 'Order one thing at every stall and finish none of it.' },
  { id: 'tools', eyebrow: 'Make something', title: 'Small tools that last', color: '#5b5bb5', art: <>{disc(210, { right: -70, top: -70, backgroundColor: '#ffffff26' })}</>, lead: 'Do one thing, and do it well.', body: 'A tool you finish in a weekend and still use in five years beats a platform you never ship.', chips: ['Scope', 'Ship', 'Repeat'], quote: 'Boring and finished wins.' },
];
function haptic(event: ExpandingFeedbackEvent) {
  if (Platform.OS === 'web') return;
  void (event === 'threshold' ? Haptics.selectionAsync() : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)).catch(() => {});
}
export default function CardsScreen() {
  const insets = useSafeAreaInsets();
  const [reduce, setReduce] = useState<boolean | undefined>();
  return <ExpandingCardHost insets={insets} onFeedback={haptic} reducedMotion={reduce} style={styles.host}>
    <ScrollView style={styles.page} contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 }]}>
      <Link href="/swipe" style={styles.note}>← Swipe Row</Link>
      <Text accessibilityRole="header" style={styles.title}>{'Tap to open.\nDrag down to leave.'}</Text>
      <Text style={styles.note}>The card grows from where it sits. Its hero and title are the same elements before and after. Drag the open card down to shrink it back, or use Close, Escape, Android back or the screen reader escape gesture.</Text>
      {stories.map(story => <ExpandingCard key={story.id} eyebrow={story.eyebrow} title={story.title} color={story.color} art={story.art} cardHeight={240} heroHeight={340}>
        <Text style={styles.lead}>{story.lead}</Text>
        <Text style={styles.body}>{story.body}</Text>
        <View style={styles.chips}>{story.chips.map(chip => <Text key={chip} style={styles.chip}>{chip}</Text>)}</View>
        <Text style={styles.quote}>{story.quote}</Text>
      </ExpandingCard>)}
      <Pressable accessibilityRole="button" onPress={() => setReduce(reduce === true ? undefined : true)} style={styles.option}><Text style={styles.optionText}>{reduce === true ? 'Motion: reduced' : 'Motion: system'}</Text></Pressable>
      <Text style={styles.note}>Verified here: TypeScript, helper tests and web rendering. Not device-verified: iOS, Android, screen readers and haptics. Optional haptics run only on native.</Text>
    </ScrollView>
  </ExpandingCardHost>;
}
const styles = StyleSheet.create({
  host: { flex: 1 }, page: { flex: 1, backgroundColor: '#f6f8f4' }, content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24, gap: 20 },
  title: { fontSize: 38, lineHeight: 42, letterSpacing: -1.5, fontWeight: '700', color: '#193f30' }, note: { color: '#4b6053', fontSize: 13, lineHeight: 22 },
  lead: { fontSize: 22, fontWeight: '700', color: '#193f30' }, body: { fontSize: 16, lineHeight: 25, color: '#2c4a3a' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { backgroundColor: '#e6edde', borderColor: '#d5e1d2', borderWidth: 1, color: '#245541', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, fontSize: 13, overflow: 'hidden' },
  quote: { borderLeftWidth: 3, borderLeftColor: '#245541', paddingLeft: 16, fontSize: 17, lineHeight: 25, color: '#31513b', fontStyle: 'italic' },
  option: { alignSelf: 'flex-start', paddingHorizontal: 14, minHeight: 44, borderRadius: 14, backgroundColor: '#e6edde', justifyContent: 'center' }, optionText: { fontSize: 12, color: '#31513b', fontWeight: '600' },
});
