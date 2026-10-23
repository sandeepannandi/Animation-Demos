import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
/** Odometer-style numeric transitions. Pass the fully formatted text; digits roll, other characters stay put. Columns key from the right so grouping changes stay aligned. */
export function RollingNumber({ text, fontSize = 17, color = '#1e2a20', fontFamily, reduce = false }: { text: string; fontSize?: number; color?: string; fontFamily?: string; reduce?: boolean }) {
  const chars = text.split('');
  return <View style={{ flexDirection: 'row', alignItems: 'flex-end' }} accessibilityLabel={text}>
    {chars.map((ch, i) => {
      const key = chars.length - i;
      return /\d/.test(ch)
        ? <DigitColumn key={key} digit={Number(ch)} fontSize={fontSize} color={color} fontFamily={fontFamily} reduce={reduce} />
        : <Text key={key} importantForAccessibility="no" style={{ fontSize, lineHeight: fontSize * 1.2, color, fontFamily, fontVariant: ['tabular-nums'] }}>{ch}</Text>;
    })}
  </View>;
}
function DigitColumn({ digit, fontSize, color, fontFamily, reduce }: { digit: number; fontSize: number; color: string; fontFamily?: string; reduce: boolean }) {
  const anim = useRef(new Animated.Value(digit)).current, height = fontSize * 1.2;
  useEffect(() => {
    if (reduce) { anim.setValue(digit); return; }
    Animated.timing(anim, { toValue: digit, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [digit, reduce, anim]);
  return <View importantForAccessibility="no" style={{ height, width: fontSize * .62, overflow: 'hidden' }}>
    <Animated.View style={{ transform: [{ translateY: anim.interpolate({ inputRange: [0, 9], outputRange: [0, -9 * height] }) }] }}>
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => <Text key={d} style={{ fontSize, lineHeight: height, height, color, fontFamily, textAlign: 'center', fontVariant: ['tabular-nums'] }}>{d}</Text>)}
    </Animated.View>
  </View>;
}
