import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = { onBack: () => void };

const ITEMS = [
  { id: '1', title: 'Netflix', subtitle: 'Subscription', amount: '-$6.99', icon: 'ticket-outline' },
  { id: '2', title: 'Verizon', subtitle: 'Mobile Recharge', amount: '-$4.05', icon: 'cellular' },
  { id: '3', title: 'Rive', subtitle: 'Subscription', amount: '-$32.00', icon: 'ticket-outline' },
  { id: '4', title: 'Figma', subtitle: 'Subscription', amount: '-$15.00', icon: 'logo-figma' },
  { id: '5', title: 'Big Belly Burger', subtitle: 'Restaurant', amount: '-$12.05', icon: 'fast-food-outline' },
];

export default function TransactionsPage({ onBack }: Props) {
  const [selected, setSelected] = useState<typeof ITEMS[number] | null>(null);
  const progress = useRef(new Animated.Value(0)).current; // 0=list, 1=detail

  const openDetail = (item: typeof ITEMS[number]) => {
    setSelected(item);
    Animated.spring(progress, {
      toValue: 1,
      useNativeDriver: true,
      tension: 220,
      friction: 18,
    }).start();
  };

  const closeDetail = () => {
    Animated.spring(progress, {
      toValue: 0,
      useNativeDriver: true,
      tension: 220,
      friction: 18,
    }).start(({ finished }) => {
      if (finished) setSelected(null);
    });
  };

  const listOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const listTranslateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  const listScale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96] });
  const detailOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const detailTranslateY = progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });
  const detailScale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });

  return (
    <SafeAreaView style={styles.root}>
      <Pressable onPress={onBack} style={styles.backBtn} android_ripple={{ color: 'rgba(255,255,255,0.9)' }}>
        <Ionicons name="chevron-back" size={24} color="#fff" />
      </Pressable>

      <View style={styles.card}>
        {!selected && (
          <>
            <Text style={styles.heading}>Transactions</Text>
            <View style={{ height: 4 }} />
          </>
        )}

        {!selected && (
        <Animated.View
          pointerEvents={selected ? 'none' : 'auto'}
          style={{ opacity: listOpacity, transform: [{ translateY: listTranslateY }, { scale: listScale }] }}
        >
          {ITEMS.map((it) => (
            <Pressable key={it.id} onPress={() => openDetail(it)} android_ripple={{ color: 'rgba(0,0,0,0.05)' }}>
              <View style={styles.row}>
                <View style={styles.leftGroup}>
                  <View style={styles.circle}>
                    <Ionicons name={it.icon as any} size={18} color="#fff" />
                  </View>
                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.title}>{it.title}</Text>
                    <Text style={styles.subtitle}>{it.subtitle}</Text>
                  </View>
                </View>
                <Text style={styles.amount}>{it.amount}</Text>
              </View>
            </Pressable>
          ))}

          <View style={{ height: 10 }} />
          <Pressable style={styles.cta} android_ripple={{ color: 'rgba(0,0,0,0.05)' }}>
            <Text style={styles.ctaText}>All Transactions</Text>
            <Ionicons name="arrow-forward" size={18} color="#111" />
          </Pressable>
        </Animated.View>
        )}

        {selected ? (
          <Animated.View
            pointerEvents={selected ? 'auto' : 'none'}
            style={{ opacity: detailOpacity, transform: [{ translateY: detailTranslateY }, { scale: detailScale }] }}
          >
            <View style={styles.detailHeader}>
              <View style={styles.detailIconWrap}>
                <View style={styles.circle}>
                  <Ionicons name={selected.icon as any} size={18} color="#fff" />
                </View>
              </View>
              <View style={{ flex: 1 }} />
              <Pressable onPress={closeDetail} hitSlop={8}>
                <Ionicons name="close" size={20} color="#111" style={{ backgroundColor: '#e7e0d8', borderRadius: 999, padding: 5 }} />
              </Pressable>
            </View>

            <View style={styles.detailRowTop}>
              <View>
                <Text style={styles.title}>{selected.title}</Text>
                <Text style={styles.subtitle}>{selected.subtitle}</Text>
              </View>
              <Text style={styles.amount}>{selected.amount}</Text>
            </View>

            <View style={styles.divider} />

            <View style={{ gap: 6 }}>
              <Text style={styles.meta}>#54635</Text>
              <Text style={styles.meta}>September 16</Text>
              <Text style={styles.meta}>02:11 pm</Text>
            </View>

            <View style={styles.divider} />

            <View style={{ gap: 6 }}>
              <Text style={styles.metaTitle}>Paid Via Credit Card</Text>
              <Text style={styles.meta}>XXXX 9342 <Text style={{ fontWeight: '900' }}>VISA</Text></Text>
            </View>
          </Animated.View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

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
  },
  card: {
    width: '88%',
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 18,
    paddingBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
  },
  heading: {
    color: '#6B7280',
    fontSize: 20,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
    opacity: 0.8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  detailRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circle: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#111',
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    color: '#4B5563',
    fontSize: 14,
    marginTop: 2,
  },
  amount: {
    color: '#4B5563',
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    color: '#6B7280',
    fontSize: 14,
  },
  metaTitle: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  cta: {
    marginTop: 10,
    backgroundColor: '#e7e0d8',
    borderRadius: 999,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  ctaText: {
    color: '#111',
    fontSize: 15,
    fontWeight: '600',
  },
});


