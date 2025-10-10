import React, { useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = { onBack: () => void };

type BrandCard = {
  id: string;
  color: string;
  label: string;
  logo: string; // PNG URL
  heroImage: string; // product image URL
  percent: string; // e.g., '50%'
  amountText: string; // e.g., 'cashback\nup to ₹100'
  textColor?: string;
};

const DATA: BrandCard[] = [
  {
    id: 'airtel',
    color: '#e71d36',
    label: 'Airtel Voucher',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Airtel_logo.svg/512px-Airtel_logo.svg.png',
    heroImage: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=512&q=60',
    percent: '50%',
    amountText: 'cashback\nup to ₹100',
    textColor: '#ffffff',
  },
  {
    id: 'swiggy',
    color: '#fc8019',
    label: 'Swiggy Voucher',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Swiggy_logo.png/512px-Swiggy_logo.png',
    heroImage: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=512&q=60',
    percent: '50%',
    amountText: 'cashback\nup to ₹100',
    textColor: '#ffffff',
  },
  {
    id: 'zomato',
    color: '#e23744',
    label: 'Zomato Voucher',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Zomato_logo.png/512px-Zomato_logo.png',
    heroImage: 'https://images.unsplash.com/photo-1542444459-db63c8b4f763?auto=format&fit=crop&w=512&q=60',
    percent: '50%',
    amountText: 'cashback\nup to ₹100',
    textColor: '#ffffff',
  },
  {
    id: 'doordash',
    color: '#ff3008',
    label: 'DoorDash Voucher',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/DoorDash_Logo.png/512px-DoorDash_Logo.png',
    heroImage: 'https://images.unsplash.com/photo-1548365328-9f547fb09530?auto=format&fit=crop&w=512&q=60',
    percent: '50%',
    amountText: 'cashback\nup to ₹100',
    textColor: '#ffffff',
  },
  {
    id: 'ubereats',
    color: '#1A1A1A',
    label: 'Uber Eats Voucher',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Uber_Eats_2020_logo.svg/512px-Uber_Eats_2020_logo.svg.png',
    heroImage: 'https://images.unsplash.com/photo-1543352634-8730b1eb30cf?auto=format&fit=crop&w=512&q=60',
    percent: '50%',
    amountText: 'cashback\nup to ₹100',
    textColor: '#2ebd59',
  },
  {
    id: 'amazonpay',
    color: '#ff9900',
    label: 'Amazon Pay Voucher',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Amazon_Pay_logo.svg/512px-Amazon_Pay_logo.svg.png',
    heroImage: 'https://images.unsplash.com/photo-1523473827534-86c5f8e3d8b2?auto=format&fit=crop&w=512&q=60',
    percent: '50%',
    amountText: 'cashback\nup to ₹100',
    textColor: '#111111',
  },
];

const CARD_WIDTH = Math.round(SCREEN_WIDTH * 0.50);
const CARD_HEIGHT = Math.round(CARD_WIDTH * 1.3);
const SPACING = 40; // increased spacing so angled cards don't visually overlap
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
          source={{ uri: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f381.png' }}
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
        scrollEventThrottle={0}
        renderItem={({ item, index }) => {
          const inputRange = [
            (index - 1) * SNAP,
            index * SNAP,
            (index + 1) * SNAP,
          ];

          const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.92, 1, 0.92],
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
            outputRange: [-46, 0, -46],
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
                  {/* Top brand logo */}
                  <Image source={{ uri: item.logo }} style={styles.brandLogo} resizeMode="contain" />
                  {/* Offer text */}
                  <Text style={[styles.percentText, { color: item.textColor || 'white' }]}>{item.percent}</Text>
                  <Text style={[styles.amountText, { color: item.textColor || 'white' }]}>{item.amountText}</Text>
                  {/* Bottom hero image */}
                  <Image source={{ uri: item.heroImage }} style={styles.heroImage} resizeMode="cover" />
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
  brandLogo: {
    width: Math.round(CARD_WIDTH * 0.5),
    height: Math.round(CARD_HEIGHT * 0.28),
    marginBottom: 10,
  },
  brandLabel: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  percentText: {
    fontSize: 42,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 2,
  },
  amountText: {
    marginTop: 6,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
  heroImage: {
    width: Math.round(CARD_WIDTH * 0.9),
    height: Math.round(CARD_HEIGHT * 0.35),
    borderRadius: 10,
    marginTop: 10,
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


