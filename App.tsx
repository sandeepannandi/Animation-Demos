import React from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import VerticalCarouselScreen from './src/screens/VerticalCarouselScreen';

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0b0b0c' }}>
      <StatusBar barStyle="light-content" />
      <VerticalCarouselScreen />
    </SafeAreaView>
  );
}


