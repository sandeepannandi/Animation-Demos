import React from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable, FlatList, SafeAreaView } from 'react-native';
import TransactionsPage from './TransactionsPage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const HORIZONTAL_PADDING = 16;
const GAP = 10;
const CARD_WIDTH = Math.round((SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - GAP) / 2);
const CARD_HEIGHT = Math.round(CARD_WIDTH );

const DATA = Array.from({ length: 8 }).map((_, i) => ({
  id: `card-${i}`,
  title: `Animation ${i + 1}`,
  subtitle: 'Swipe up or down',
  color: `hsl(${(i * 45) % 360} 70% 45%)`
}));

export default function VerticalCarouselScreen() {
  const [showTx, setShowTx] = React.useState(false);
  const keyExtractor = (item: typeof DATA[number]) => item.id;

  return (
    <SafeAreaView style={styles.container}>
      {showTx ? (
        <TransactionsPage onBack={() => setShowTx(false)} />
      ) : (
      <FlatList
        data={DATA}
        keyExtractor={keyExtractor}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: HORIZONTAL_PADDING, paddingVertical: GAP }}
        columnWrapperStyle={{ gap: GAP, marginBottom: GAP }}
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => {
              if (index === 0) setShowTx(true);
            }}
            android_ripple={{ color: 'rgba(255,255,255,0.06)' }}
            style={styles.cardWrapper}
          >
            <View style={[styles.card, { backgroundColor: item.color }]}> 
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
            </View>
          </Pressable>
        )}
      />)}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    paddingTop: 28,
    paddingHorizontal: 0,
  },
  cardWrapper: {
    height: CARD_HEIGHT,
    borderRadius: 12,
    
    overflow: 'hidden',
  },
  card: {
    flex: 1,
    paddingRight: 42,
    paddingLeft: 16,
    paddingBottom: 16,
    
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 0,
  },
});


