import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { SwipeRow, SwipeRowGroup, useCloseSwipeRows, type SwipeAction, type SwipeFeedbackEvent } from '../../../packages/ui/src/components/swipe-row/SwipeRow';
type Message = { id: string; from: string; subject: string; preview: string; time: string; pinned: boolean };
const seed: Message[] = [
  { id: '1', from: 'Asha Rao', subject: 'Lunch on Thursday?', preview: 'The new place near the station has a table at 1.', time: '9:41', pinned: false },
  { id: '2', from: 'Ravi Iyer', subject: 'Build is green again', preview: 'Reverted the lockfile change and it passes.', time: '9:12', pinned: false },
  { id: '3', from: 'Mina Das', subject: 'Photos from the trip', preview: 'Sending the full album in a minute.', time: 'Yesterday', pinned: false },
  { id: '4', from: 'Kabir Shah', subject: 'Invoice 1042', preview: 'Attached, due at the end of the month.', time: 'Yesterday', pinned: false },
];
function haptic(event: SwipeFeedbackEvent) {
  if (Platform.OS === 'web') return;
  const run = event === 'threshold' ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium) : event === 'commit' ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) : Haptics.selectionAsync();
  void run.catch(() => {});
}
function Inbox({ reduce }: { reduce?: boolean }) {
  const [items, setItems] = useState(seed);
  const [log, setLog] = useState('Swipe a row.');
  const closeAll = useCloseSwipeRows();
  const drop = (item: Message, what: string) => { setItems(list => list.filter(entry => entry.id !== item.id)); setLog(`${what}: ${item.subject}`); };
  return <View style={{ gap: 12 }}>
    <ScrollView scrollEnabled={false} onScrollBeginDrag={closeAll}>
      <View style={styles.list}>
        {items.map(item => {
          const pin: SwipeAction = { id: 'pin', label: item.pinned ? 'Unpin' : 'Pin', icon: <Text style={styles.glyph}>⌃</Text>, backgroundColor: '#d99a2b', onPress: () => { setItems(list => list.map(entry => entry.id === item.id ? { ...entry, pinned: !entry.pinned } : entry)); setLog(`${item.pinned ? 'Unpinned' : 'Pinned'}: ${item.subject}`); } };
          const archive: SwipeAction = { id: 'archive', label: 'Archive', completedLabel: 'Archived', icon: <Text style={styles.glyph}>▣</Text>, backgroundColor: '#4f8a6a', removesRow: true, onPress: () => drop(item, 'Archived') };
          const del: SwipeAction = { id: 'delete', label: 'Delete', completedLabel: 'Deleted', icon: <Text style={styles.glyph}>✕</Text>, backgroundColor: '#b84a4a', removesRow: true, onPress: () => drop(item, 'Deleted') };
          return <View key={item.id} style={styles.divider}>
            <SwipeRow leadingActions={[pin]} trailingActions={[archive, del]} reducedMotion={reduce} onFeedback={haptic} onPress={() => setLog(`Opened: ${item.subject}`)} onUndo={action => setLog(`Undid ${action.label.toLowerCase()}: ${item.subject}`)} accessibilityLabel={`${item.pinned ? 'Pinned. ' : ''}${item.from}. ${item.subject}. ${item.preview}`}>
              <View style={styles.rowBody}>
                <View style={styles.rowHead}><Text style={styles.from}>{item.pinned ? '▲ ' : ''}{item.from}</Text><Text style={styles.time}>{item.time}</Text></View>
                <Text style={styles.subject}>{item.subject}</Text><Text numberOfLines={1} style={styles.preview}>{item.preview}</Text>
              </View>
            </SwipeRow>
          </View>;
        })}
        {items.length === 0 ? <Text style={styles.empty}>Inbox zero. Reset to try again.</Text> : null}
      </View>
    </ScrollView>
    <Text accessibilityLiveRegion="polite" style={styles.log}>{log}</Text>
    <Pressable accessibilityRole="button" onPress={() => { setItems(seed); setLog('Swipe a row.'); }} style={styles.option}><Text style={styles.optionText}>Reset</Text></Pressable>
  </View>;
}
export default function SwipeScreen() {
  const [reduce, setReduce] = useState<boolean | undefined>();
  return <SafeAreaView style={styles.page}><ScrollView contentContainerStyle={styles.content}>
    <Link href="/glass" style={styles.note}>← Liquid Tabs</Link>
    <Link href="/cards" style={styles.note}>Next: Expanding Card →</Link>
    <Text accessibilityRole="header" style={styles.title}>{'Swipe to act.\nKeep going to commit.'}</Text>
    <Text style={styles.note}>Swipe right to pin. Swipe left to archive or delete. Pull a full swipe past the line to run the outer action, then undo it for a few seconds. Opening one row closes the others. Screen readers get the same actions from the actions menu. Not device-tested.</Text>
    <SwipeRowGroup><Inbox reduce={reduce} /></SwipeRowGroup>
    <Pressable accessibilityRole="button" onPress={() => setReduce(reduce === true ? undefined : true)} style={styles.option}><Text style={styles.optionText}>{reduce === true ? 'Motion: reduced' : 'Motion: system'}</Text></Pressable>
    <Text style={styles.note}>Verified here: TypeScript, helper tests and web rendering. Not device-verified: iOS, Android, screen readers and haptics. Optional haptics run only on native.</Text>
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f6f8f4' }, content: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: 24, paddingTop: 32, gap: 20 },
  title: { fontSize: 38, lineHeight: 42, letterSpacing: -1.5, fontFamily: 'Geist-Bold', color: '#193f30' }, note: { color: '#4b6053', fontSize: 13, lineHeight: 22, fontFamily: 'Geist-Regular' },
  list: { backgroundColor: '#fff', borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: '#d5e1d2' }, divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#d5e1d2' },
  rowBody: { paddingHorizontal: 20, paddingVertical: 14, gap: 3 }, rowHead: { flexDirection: 'row', justifyContent: 'space-between' },
  from: { fontSize: 15, fontFamily: 'Geist-Bold', color: '#193f30' }, time: { fontSize: 12, color: '#6b7c68', fontFamily: 'Geist-Regular' }, subject: { fontSize: 14, color: '#2c4a3a', fontFamily: 'Geist-Regular' }, preview: { fontSize: 13, color: '#61705a', fontFamily: 'Geist-Regular' },
  glyph: { fontSize: 20, color: '#fff', fontFamily: 'Geist-Regular' }, empty: { padding: 28, textAlign: 'center', color: '#61705a' }, log: { fontSize: 12, color: '#486045', fontFamily: 'Geist-Regular' },
  option: { alignSelf: 'flex-start', paddingHorizontal: 14, minHeight: 44, borderRadius: 14, backgroundColor: '#e6edde', justifyContent: 'center' }, optionText: { fontSize: 12, color: '#31513b', fontFamily: 'Geist-SemiBold' },
});
