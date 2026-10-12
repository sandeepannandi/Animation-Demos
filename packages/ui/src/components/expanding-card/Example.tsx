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
  sun: { position: 'absolute', right: -50, bottom: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: '#ffffff40' },
  lead: { fontSize: 22, fontWeight: '700', color: '#193f30' },
  body: { fontSize: 16, lineHeight: 25, color: '#2c4a3a' },
});
