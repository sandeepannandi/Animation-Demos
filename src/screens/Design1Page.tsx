import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = { onBack: () => void };

type BrandCard = {
  id: string;
  color: string;
  label: string;
  logo: any; // local asset module
  heroImage: string; 
  percent: string; // e.g., '50%'
  amountText: string;
  textColor?: string;
};

const DATA: BrandCard[] = [
  {
    id: 'airtel',
    color: '#FF4949',
    label: 'Airtel Voucher',
    logo: require('../../assets/airtel.svg'),
    heroImage: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=512&q=60',
    percent: '30%',
    amountText: 'cashback\nup to ₹100',
    textColor: '#ffffff',
  },
  {
    id: 'swiggy',
    color: '#FD9139',
    label: 'Swiggy Voucher',
    logo: require('../../assets/swiggy.svg'),
    heroImage: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=512&q=60',
    percent: '50%',
    amountText: 'cashback\nup to ₹100',
    textColor: '#000',
  },
  {
    id: 'zomato',
    color: '#D94148',
    label: 'Zomato Voucher',
    logo: require('../../assets/zomato.svg'),
    heroImage: 'https://images.unsplash.com/photo-1542444459-db63c8b4f763?auto=format&fit=crop&w=512&q=60',
    percent: '40%',
    amountText: 'cashback\nup to ₹100',
    textColor: '#ffffff',
  },
  {
    id: 'flipkart',
    color: '#1C41D6',
    label: 'Flipkart Voucher',
    logo: require('../../assets/flipkart.svg'),
    heroImage: 'https://images.unsplash.com/photo-1548365328-9f547fb09530?auto=format&fit=crop&w=512&q=60',
    percent: '10%',
    amountText: 'cashback\nup to ₹100',
    textColor: '#ffffff',
  },
  {
    id: 'ubereats',
    color: '#06C167',
    label: 'Uber Eats Voucher',
    logo: require('../../assets/uber.svg'),
    heroImage: 'https://images.unsplash.com/photo-1543352634-8730b1eb30cf?auto=format&fit=crop&w=512&q=60',
    percent: '40%',
    amountText: 'cashback\nup to ₹100',
    textColor: '#FFFFFF',
  },
  {
    id: 'amazonpay',
    color: '#FF9900',
    label: 'Amazon Pay Voucher',
    logo: require('../../assets/amazon.svg'),
    heroImage: 'https://images.unsplash.com/photo-1523473827534-86c5f8e3d8b2?auto=format&fit=crop&w=512&q=60',
    percent: '50%',
    amountText: 'cashback\nup to ₹100',
    textColor: '#000000',
  },
];

const CARD_WIDTH = Math.round(SCREEN_WIDTH * 0.52);
const CARD_HEIGHT = Math.round(CARD_WIDTH * 1.3);
const SPACING =0; 
const SNAP = CARD_WIDTH + SPACING;

export default function Design1Page({ onBack }: Props) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(1)).current;
  const [isLongPressing, setIsLongPressing] = useState(false);

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
            outputRange: [1, 1, 1],
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
            outputRange: ['-20deg', '0deg', '20deg'],
            extrapolate: 'clamp',
          });

          // Arc: center lifted slightly; sides drop more so all appear on a circle
          const translateY = scrollX.interpolate({
            inputRange,
            outputRange: [-40, 0, -40],
            extrapolate: 'clamp',
          });

          const isActive = index === 1; // Center card is active

          const handleLongPress = () => {
            console.log('Long press detected on card:', index);
            if (isActive) {
              setIsLongPressing(true);
              Animated.spring(cardScale, {
                toValue: 1.05,
                useNativeDriver: true,
                tension: 150,
                friction: 7,
              }).start();
            }
          };

          const handlePressOut = () => {
            console.log('Press ended on card:', index);
            if (isActive) {
              setIsLongPressing(false);
              Animated.spring(cardScale, {
                toValue: 1,
                useNativeDriver: true,
                tension: 150,
                friction: 7,
              }).start();
            }
          };

          return (
            <View style={{ width: SNAP, alignItems: 'center' }}>
              <Pressable
                onLongPress={handleLongPress}
                onPressOut={handlePressOut}
                delayLongPress={200}
                style={{ flex: 1 }}
              >
                <Animated.View
                  style={[
                    styles.cardShadow,
                    {
                      transform: [{ translateY }, { rotate }, { scale: isActive ? cardScale : scale }],
                      opacity,
                    },
                  ]}
                >
                  <View style={[styles.card, { backgroundColor: item.color }]}> 
                    {/* Top brand logo (local asset) */}
                    <Image source={item.logo} style={styles.brandLogo} />
                    {/* Offer text */}
                    <Text style={[styles.percentText, { color: item.textColor || 'white' }]}>{item.percent}</Text>
                    <Text style={[styles.amountText, { color: item.textColor || 'white' }]}>{item.amountText}</Text>
                    {/* Bottom hero image */}
                    <Image source={{ uri: item.heroImage }} style={styles.heroImage} resizeMode="cover" />
                  </View>
                </Animated.View>
              </Pressable>
            </View>
          );
        }}
      />

      {/* Active card highlight rectangle - fixed on screen */}
      <View style={styles.activeHighlight} />

      
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
    zIndex: 100,
    borderRadius: 12,
    shadowColor: '#999',
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  card: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogo: {
    width: Math.round(CARD_WIDTH * 0.4),
    height: Math.round(CARD_HEIGHT * 0.2),
    marginBottom: 8,
    tintColor: 'white',
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
  activeHighlight: {
    position: 'absolute',
    top: '52%',
    left: '50%',
    width: CARD_WIDTH + 16,
    height: CARD_HEIGHT + 16,
    marginTop: -(CARD_HEIGHT + 16) / 2,
    marginLeft: -(CARD_WIDTH + 16) / 2,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#ffcc4d',
    backgroundColor: 'transparent',
    shadowColor: '#ffcc4d',
    shadowOpacity: 0.8,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
    pointerEvents: 'none',
    // Force shadow outside
    overflow: 'visible',
  },
});


