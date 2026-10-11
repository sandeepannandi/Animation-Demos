import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import registry from '../../../../packages/registry/generated/preview-rail.json';
export function SourcePanel() {
  const [filename, setFilename] = useState('PreviewRail.tsx');
  const [status, setStatus] = useState('');
  const file = registry.files.find(file => file.name === filename)!;
  const copy = async () => {
    setStatus('');
    try {
      if (Platform.OS !== 'web' || !navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(file.content);
      setStatus('Copied ' + filename);
    } catch { setStatus('Copy unavailable. Select the source below and copy it manually.'); }
  };
  return <View style={styles.panel}>
    <Text style={styles.title}>Exact source</Text>
    <Text style={styles.note}>Copy both implementation files together. Keep the MIT license. No extra library is needed for the rail.</Text>
    <View style={styles.tabs}>{registry.files.map(file => <Pressable key={file.name} accessibilityRole="button"
      accessibilityState={{ selected: filename === file.name }} onPress={() => { setFilename(file.name); setStatus(''); }}
      style={[styles.tab, filename === file.name && styles.selected]}><Text style={styles.tabText}>{file.name}</Text></Pressable>)}</View>
    <Pressable accessibilityRole="button" onPress={copy} style={styles.copy}><Text style={styles.copyText}>Copy {filename}</Text></Pressable>
    <Text accessibilityLiveRegion="polite" style={styles.note}>{status || 'Generated from the same files used by this demo.'}</Text>
    <ScrollView tabIndex={0} style={styles.source} nestedScrollEnabled><Text selectable style={styles.code}>{file.content}</Text></ScrollView>
  </View>;
}
const styles = StyleSheet.create({
  panel: { backgroundColor: '#fff', borderRadius: 24, padding: 20, gap: 16, borderWidth: 1, borderColor: '#d5e1d2' },
  title: { fontSize: 22, fontWeight: '700', color: '#193f30' }, note: { color: '#4b6053', fontSize: 13, lineHeight: 21 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, tab: { padding: 10, borderRadius: 10, backgroundColor: '#f1f5ed', minHeight: 44, justifyContent: 'center' },
  selected: { backgroundColor: '#d5e7c6' }, tabText: { color: '#274833', fontSize: 12 },
  copy: { minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: '#193f30' }, copyText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  source: { height: 360, backgroundColor: '#f5f7f2', borderRadius: 12, padding: 12 }, code: { fontFamily: 'monospace', color: '#243d2e', fontSize: 12, lineHeight: 19 },
});
