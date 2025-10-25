import React from 'react';
import { StyleSheet, SafeAreaView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CallInterface from './CallInterface';

type Props = { onBack: () => void };

export default function CallInterfacePage({ onBack }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <Pressable onPress={onBack} style={styles.backBtn} android_ripple={{ color: 'rgba(255,255,255,0.9)' }}>
        <Ionicons name="chevron-back" size={24} color="#fff" />
      </Pressable>
      <CallInterface />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backBtn: {
    position: 'absolute',
    top: 8,
    left: 12,
    padding: 6,
    zIndex: 10,
  },
});
