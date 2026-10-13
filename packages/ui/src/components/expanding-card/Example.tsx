import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ExpandingCard, ExpandingCardHost } from './ExpandingCard';

// Pass real insets from react-native-safe-area-context (useSafeAreaInsets) in your app.
const insets = { top: 47, bottom: 34 };

export default function Today() {
  return (
    <ExpandingCardHost
      insets={insets}
      onFeedback={event => { /* run expo-haptics here: 'open' | 'threshold' | 'close' */ void event; }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20, gap: 20 }}>
        <View>
          <Text style={styles.date}>MONDAY, OCTOBER 12</Text>
          <Text style={styles.today}>Today</Text>
        </View>
        <ExpandingCard
          eyebrow="The Daily List"
          title={'Slow mornings,\nbetter days'}
          color="#d9892b"
          art={<View style={styles.sun} />}>
          <Text style={styles.lead}>Start before the screen does.</Text>
          <Text style={styles.body}>Each block here enters in turn after the card has grown into place.</Text>
        </ExpandingCard>
      </ScrollView>
    </ExpandingCardHost>
  );
}
const styles = StyleSheet.create({
  date: { fontSize: 11, letterSpacing: 1.2, color: '#5d7a62', fontFamily: 'Geist-SemiBold' },
  today: { fontSize: 34, color: '#193f30', fontFamily: 'Geist-Regular', letterSpacing: -1, marginTop: 8 },
  sun: { position: 'absolute', right: -50, bottom: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: '#ffffff40' },
  lead: { fontSize: 22, fontFamily: 'Geist-Bold', color: '#193f30' },
  body: { fontFamily: 'Geist-Regular', fontSize: 16, lineHeight: 25, color: '#2c4a3a' },
});
