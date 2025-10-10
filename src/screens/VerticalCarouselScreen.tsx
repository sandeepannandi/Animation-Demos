import React, { useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Platform, Pressable } from 'react-native';
import Design1Page from './Design1Page';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

const HORIZONTAL_PADDING = 20;
const CARD_SPACING = 16;
// Active card height smaller than screen so neighbors peek
const ACTIVE_CARD_HEIGHT = Math.round(SCREEN_HEIGHT * 0.68);

const DATA = Array.from({ length: 8 }).map((_, i) => ({
  id: `card-${i}`,
  title: `Design ${i + 1}`,
  subtitle: 'Swipe up or down',
  color: `hsl(${(i * 45) % 360} 70% 45%)`
}));

const ITEM_SIZE = ACTIVE_CARD_HEIGHT; // logical size used for snap interval

export default function VerticalCarouselScreen() {
  const scrollY = useRef(new Animated.Value(0)).current;
  const [showDesign1, setShowDesign1] = React.useState(false);

  const snapToInterval = useMemo(() => ITEM_SIZE + CARD_SPACING, []);

  return (
    <View style={styles.container}>
      <Animated.FlatList
        data={DATA}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: (SCREEN_HEIGHT - ITEM_SIZE) / 2,
          paddingBottom: (SCREEN_HEIGHT - ITEM_SIZE) / 2,
        }}
        snapToInterval={snapToInterval}
        decelerationRate={'fast'}
        bounces={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        renderItem={({ item, index }) => {
          const inputRange = [
            (index - 1) * snapToInterval,
            index * snapToInterval,
            (index + 1) * snapToInterval,
          ];

          const scale = scrollY.interpolate({
            inputRange,
            outputRange: [0.88, 1, 0.88],
            extrapolate: 'clamp',
          });

          const opacity = scrollY.interpolate({
            inputRange,
            outputRange: [0.55, 1, 0.55],
            extrapolate: 'clamp',
          });

          const elevation = scrollY.interpolate({
            inputRange,
            outputRange: [1, 9, 1],
            extrapolate: 'clamp',
          });

          const isFirst = index === 0;

          return (
            <Animated.View
              style={[
                styles.cardWrapper,
                {
                  height: ACTIVE_CARD_HEIGHT,
                  transform: [{ scale }],
                  opacity,
                },
              ]}
            >
              <Pressable
                onPress={() => {
                  if (isFirst) setShowDesign1(true);
                }}
                android_ripple={{ color: 'rgba(255,255,255,0.06)' }}
                style={{ flex: 1, borderRadius: 24, overflow: 'hidden' }}
              >
              <Animated.View
                style={[
                  styles.card,
                  {
                    backgroundColor: item.color,
                    shadowOpacity: 0.45,
                    shadowRadius: 16,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 8 },
                    elevation,
                  },
                ]}
              >
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.subtitle}>{item.subtitle}</Text>
              </Animated.View>
              </Pressable>
            </Animated.View>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: CARD_SPACING }} />}
      />
      {showDesign1 ? (
        <View style={styles.pageOverlay}>
          <Design1Page onBack={() => setShowDesign1(false)} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  cardWrapper: {
    width: SCREEN_WIDTH - HORIZONTAL_PADDING * 2,
  },
  card: {
    flex: 1,
    borderRadius: 24,
    padding: 24,
    justifyContent: 'flex-end',
  },
  title: {
    color: 'white',
    fontSize: 34,
    fontWeight: '600',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    marginTop: 8,
  },
  pageOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
});


