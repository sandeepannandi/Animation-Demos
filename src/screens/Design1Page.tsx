import React, { useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = { onBack: () => void };

const DATA = [
  { id: 'left', color: '#f2f2f2', label: '' },
  { id: 'center', color: '#62a8e5', label: '50%\nCashback\nup to ₹100' },
  { id: 'right', color: '#e5732b', label: '' },
];

const CARD_WIDTH = Math.round(SCREEN_WIDTH * 0.54);
const CARD_HEIGHT = Math.round(CARD_WIDTH * 1.3);
const SPACING = 26;
const SNAP = CARD_WIDTH + SPACING;

export default function Design1Page({ onBack }: Props) {
  const scrollX = useRef(new Animated.Value(0)).current;

  const contentPad = useMemo(() => (SCREEN_WIDTH - CARD_WIDTH) / 2, []);

  return (
    <View style={styles.container}>
      {/* Premium golden beam background */}
      <LinearGradient
        pointerEvents="none"
        colors={[ 'rgba(255,214,102,0.08)', 'rgba(255,214,102,0.18)', 'rgba(255,214,102,0.0)' ]}
        locations={[0.0, 0.35, 1.0]}
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0.5, y: 0 }}
        style={styles.beam}
      />
      <View style={styles.headerRow}>
        <Pressable hitSlop={12} onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#efe9dc" />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Text style={styles.tcText}>T&Cs</Text>
      </View>

      <View style={styles.titleWrap}>
        <Image
          source={{ uri: 'https://img.freepik.com/free-psd/birthday-colorful-present-box-design_23-2150318126.jpg' }}
          style={styles.giftImg}
          resizeMode="cover"
        />
        <Text style={styles.title}>Choose your{"\n"}welcome gift</Text>
      </View>

      <Animated.FlatList
        data={DATA}
        keyExtractor={(i) => i.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SNAP}
        decelerationRate={'fast'}
        bounces={false}
        contentContainerStyle={{ paddingHorizontal: contentPad }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        renderItem={({ item, index }) => {
          const inputRange = [
            (index - 1) * SNAP,
            index * SNAP,
            (index + 1) * SNAP,
          ];

          const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.82, 1, 0.82],
            extrapolate: 'clamp',
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.6, 1, 0.6],
            extrapolate: 'clamp',
          });

          // Tilt side cards to mimic arc; middle stays straight
          const rotate = scrollX.interpolate({
            inputRange,
            outputRange: ['-18deg', '0deg', '18deg'],
            extrapolate: 'clamp',
          });

          // Arc: center lifted slightly; sides drop more so all appear on a circle
          const translateY = scrollX.interpolate({
            inputRange,
            outputRange: [-56, 0, -56],
            extrapolate: 'clamp',
          });

          return (
            <View style={{ width: SNAP, alignItems: 'center' }}>
              <Animated.View
                style={[
                  styles.cardShadow,
                  {
                    transform: [{ translateY }, { rotate }, { scale }],
                    opacity,
                  },
                ]}
              >
                <View style={[styles.card, { backgroundColor: item.color }]}> 
                  {index === 1 ? (
                    <>
                      <Text style={styles.centerBig}>50%</Text>
                      <Text style={styles.centerSmall}>Cashback{"\n"}up to ₹100</Text>
                    </>
                  ) : null}
                </View>
              </Animated.View>
            </View>
          );
        }}
      />

      <View style={styles.chevrons}>
        <Ionicons name="chevron-down" size={20} color="#d6d0c4" />
        <Ionicons name="chevron-down" size={20} color="#d6d0c4" style={{ marginTop: -6 }} />
      </View>

      <View style={styles.bottomShelf} />
      <Text style={styles.hint}>Drag down to activate offer</Text>
    </View>
  );
}

const BG = 'black';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    paddingTop: 24,
    paddingHorizontal: 0,
  },
  beam: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20
  },
  backBtn: {
    paddingVertical: 0,
    paddingRight: 8,
  },
  tcText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  titleWrap: {
    alignItems: 'center',
    gap: 8,
    marginTop: 40,
  },
  giftImg: {
    width: 50,
    height: 50,
    borderRadius: 6,
  },
  title: {
    color: '#fff',
    fontSize: 30,
    textAlign: 'center',
    fontWeight: '600',
  },
  cardShadow: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginTop:80,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  card: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBig: {
    color: 'white',
    fontSize: 44,
    fontWeight: '800',
  },
  centerSmall: {
    marginTop: 8,
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
  chevrons: {
    alignItems: 'center',
    marginTop: 22,
  },
  bottomShelf: {
    alignSelf: 'center',
    marginTop: 22,
    width: 180,
    height: 18,
    backgroundColor: '#2a251f',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    opacity: 0.9,
  },
  hint: {
    position: 'absolute',
    bottom: 28,
    width: '100%',
    textAlign: 'center',
    color: '#d6d0c4',
    fontSize: 12,
  },
});


