import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function Design1Overlay({ visible, onClose }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(40)).current;
  const scale = useRef(new Animated.Value(0.98)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 40, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.backdrop, { opacity }]}> 
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <Animated.View
        style={[styles.sheet, { transform: [{ translateY }, { scale }] }]}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }} />
          <Text style={styles.tcText}>T&Cs</Text>
        </View>
        <View style={styles.headerTitle}>
          <Ionicons name="gift-outline" size={26} color="#ffcc4d" />
          <Text style={styles.title}>Choose your{"\n"}welcome gift</Text>
        </View>

        <View style={styles.cardsArea}>
          {/* Left tilted card */}
          <View style={[styles.sideCard, { transform: [{ rotate: '-18deg' }], backgroundColor: '#f2f2f2' }]} />

          {/* Main highlighted card */}
          <View style={styles.centerCardOuterGlow}>
            <View style={styles.centerCard}> 
              <Text style={styles.centerCardTitle}>50%</Text>
              <Text style={styles.centerCardSubtitle}>Cashback{"\n"}up to ₹100</Text>
            </View>
          </View>

          {/* Right tilted card */}
          <View style={[styles.sideCard, { transform: [{ rotate: '16deg' }], backgroundColor: '#e5732b' }]} />
        </View>

        <View style={styles.chevrons}>
          <Ionicons name="chevron-down" size={20} color="#d6d0c4" />
          <Ionicons name="chevron-down" size={20} color="#d6d0c4" style={{ marginTop: -6 }} />
        </View>

        <View style={styles.bottomShelf} />

        <Text style={styles.hint}>Drag down to activate offer</Text>
      </Animated.View>
    </Animated.View>
  );
}

const BG = '#15120f';
const GOLD = '#ffcc4d';

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  sheet: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: BG,
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tcText: {
    color: '#d6d0c4',
    fontSize: 12,
    fontWeight: '600',
  },
  headerTitle: {
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  title: {
    color: '#efe9dc',
    fontSize: 22,
    textAlign: 'center',
    fontWeight: '700',
  },
  cardsArea: {
    marginTop: 28,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideCard: {
    position: 'absolute',
    width: 130,
    height: 190,
    borderRadius: 16,
    opacity: 0.85,
  },
  centerCardOuterGlow: {
    width: 170,
    height: 220,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: GOLD,
    shadowOpacity: 0.75,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 20,
  },
  centerCard: {
    width: 170,
    height: 220,
    borderRadius: 20,
    backgroundColor: '#62a8e5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerCardTitle: {
    color: 'white',
    fontSize: 44,
    fontWeight: '800',
  },
  centerCardSubtitle: {
    marginTop: 8,
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
  chevrons: {
    alignItems: 'center',
    marginTop: 28,
  },
  bottomShelf: {
    alignSelf: 'center',
    marginTop: 26,
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


