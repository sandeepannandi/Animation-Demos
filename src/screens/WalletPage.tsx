import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = { onBack: () => void };

export default function WalletPage({ onBack }: Props) {
  return (
    <SafeAreaView style={styles.root}>
      <Pressable onPress={onBack} style={styles.backBtn} android_ripple={{ color: 'rgba(0,0,0,0.06)' }}>
        <Ionicons name="chevron-back" size={24} color="#fff" />
      </Pressable>

      <View style={styles.card}>
        <View style={styles.walletWrap}>
        {/* Cards */}
          <View style={[styles.cardRow, { backgroundColor: '#8266ff', zIndex: 1 }]}> 
          <Text style={[styles.brand, { color: 'white' }]}>stripe</Text>
          <Text style={styles.dots}>•••••</Text>
        </View>
          <View style={[styles.cardRow, { backgroundColor: '#9be37b', marginTop: -24, zIndex: 1 }]}> 
          <Text style={[styles.brand, { color: '#111' }]}>WISE</Text>
          <Text style={[styles.dots, { color: '#111' }]}>•••••</Text>
        </View>
          <View style={[styles.cardRow, { backgroundColor: '#e8f0ff', marginTop: -24, zIndex: 1 }]}> 
          <Text style={[styles.brand, { color: '#0a58ff' }]}>PayPal</Text>
          <Text style={[styles.dots, { color: '#111' }]}>•••••</Text>
        </View>

        {/* Pocket */}
          <View style={styles.pocketShadow} />
          <View style={styles.pocket}>
          <View style={styles.stitch} />
          <Text style={styles.balanceDots}>*  *  *  *  *  *  *</Text>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <Ionicons name="eye-off-outline" size={18} color="#8fa08a" style={{ marginTop: 18 }} />
        </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const POCKET = '#1f3522';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'black',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    position: 'absolute',
    top: 8,
    left: 12,
    padding: 6,
    zIndex: 10,
    borderRadius: 999,
  },
  card: {
    width: '88%',
    backgroundColor: 'transparent',
    borderRadius: 30,
    padding: 0,
    paddingBottom: 0,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
  },
  walletWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  cardRow: {
    width: '88%',
    height: 78,
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  brand: {
    fontSize: 18,
    fontWeight: '800',
  },
  dots: {
    fontSize: 16,
    color: 'white',
    alignSelf: 'flex-end',
  },
  pocketShadow: {
    position: 'absolute',
    bottom: 18,
    width: '100%',
    height: 180,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.18)',
    transform: [{ scaleX: 0.96 }],
    zIndex: 1,
  },
  pocket: {
    width: '100%',
    height: 200,
    backgroundColor: POCKET,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 20,
    zIndex: 2,
    // Bring pocket above background but visually on top of cards edges
    elevation: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  stitch: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    bottom: 10,
    borderRadius: 30,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#6a7b68',
  },
  balanceDots: {
    color: '#dce5d8',
    letterSpacing: 2,
    fontSize: 16,
  },
  balanceLabel: {
    color: '#9fb0a0',
    fontSize: 12,
    marginTop: 6,
  },
});


