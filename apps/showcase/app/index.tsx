import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ShowcaseHome() {
  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.brand}>nativelet / showcase</Text>
        <View style={styles.badge}><Text style={styles.badgeText}>EXPO + REACT NATIVE</Text></View>
        <Text accessibilityRole="header" style={styles.title}>Native by design.</Text>
        <Text style={styles.description}>A separate playground for the first Nativelet component. The existing website stays where it is.</Text>
        <View style={styles.card}>
          <Text style={styles.step}>01 / THE FOUNDATION</Text>
          <Text accessibilityRole="header" style={styles.cardTitle}>Ready for Preview Rail</Text>
          <Text style={styles.body}>Expo Router, TypeScript and React Native Web are set up. The rail itself arrives in a separate component PR.</Text>
          <View style={styles.rule} />
          <Text style={styles.note}>This is a scaffold, not a finished component demo.</Text>
        </View>
        <Text style={styles.footer}>Web preview only. iOS and Android still need device checks.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f6f8f4' },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: 28, paddingTop: 54, gap: 24 },
  brand: { color: '#193c2f', fontSize: 18, fontWeight: '700' },
  badge: { backgroundColor: '#e0ebd8', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginTop: 24 },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#31553d', letterSpacing: 1 },
  title: { fontSize: 48, lineHeight: 52, color: '#163b2d', fontWeight: '700', letterSpacing: -2 },
  description: { color: '#48594e', fontSize: 18, lineHeight: 28 },
  card: { backgroundColor: '#fff', borderColor: '#d7e1d5', borderWidth: 1, borderRadius: 24, padding: 24, gap: 18, marginTop: 8 },
  step: { color: '#466344', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  cardTitle: { color: '#193c2f', fontSize: 27, fontWeight: '600', lineHeight: 34 },
  body: { color: '#48594e', fontSize: 16, lineHeight: 25 },
  rule: { height: 1, backgroundColor: '#e0e7dd' },
  note: { color: '#4e5f51', fontSize: 13, lineHeight: 20 },
  footer: { color: '#4e5f51', fontSize: 13, lineHeight: 20, paddingBottom: 30 },
});
