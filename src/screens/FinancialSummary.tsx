import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const EXPANDABLE_ITEMS = [
  { id: '1', title: 'Transport', icon: 'car', percentage: '18%' },
  { id: '2', title: 'Groceries', icon: 'basket', percentage: '32%' },
  { id: '3', title: 'Shopping', icon: 'bag', percentage: '27%' },
  { id: '4', title: 'Food and drinks', icon: 'wine', percentage: '14%' },
  { id: '5', title: 'Others', icon: 'grid', percentage: '9%' },
];

export default function FinancialSummary() {
  const [isExpanded, setIsExpanded] = useState(false);
  const rotationValue = useRef(new Animated.Value(0)).current;
  const expandValue = useRef(new Animated.Value(0)).current;

  const handleArrowPress = () => {
    const toValue = isExpanded ? 0 : 1;
    
    Animated.timing(rotationValue, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start();

    Animated.timing(expandValue, {
      toValue,
      duration: 800,
      useNativeDriver: false,
    }).start();
    
    setIsExpanded(!isExpanded);
  };

  const rotateInterpolate = rotationValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const getItemAnimation = (index: number) => {
    const reverseIndex = 4 - index;
    
    const startDelay = Math.min(0.3 + (index * 0.15), 0.8);
    const endDelay = Math.min(0.4 + (index * 0.25), 0.9);
    
    const itemProgress = expandValue.interpolate({
      inputRange: [0, startDelay, endDelay, 1],
      outputRange: [0, 0, 0, 1],
    });

    const disappearStartDelay = Math.min(0.05 + (reverseIndex * 0.15), 0.8);
    const disappearEndDelay = Math.min(0.3 + (reverseIndex * 0.15), 0.9);
    
    const disappearProgress = expandValue.interpolate({
      inputRange: [0, disappearStartDelay, disappearEndDelay, 1],
      outputRange: [1, 1, 1, 0],
    });

    return {
      translateY: itemProgress.interpolate({
        inputRange: [0, 0.3, 1],
        outputRange: [60, 60, 0],
      }),
      opacity: itemProgress.interpolate({
        inputRange: [0, 0.1, 0.4, 1],
        outputRange: [0, 0, 0, 1],
      }),
      scale: itemProgress.interpolate({
        inputRange: [0, 0.2, 0.6, 1],
        outputRange: [0.6, 0.6, 1.05, 1],
      }),
      // Disappearing animations - smoother and matching appearing
      disappearTranslateY: disappearProgress.interpolate({
        inputRange: [0, 0.3, 1],
        outputRange: [0, 0, -60],
      }),
      disappearOpacity: disappearProgress.interpolate({
        inputRange: [0, 0.1, 0.4, 1],
        outputRange: [1, 1, 1, 0],
      }),
      disappearScale: disappearProgress.interpolate({
        inputRange: [0, 0.2, 0.6, 1],
        outputRange: [1, 1, 1.05, 0.6],
      }),
    };
  };

  const getProgressAnimation = (index: number) => {
    // Progress bars appear one by one after all items are shown with much more delay
    const progressStartDelay = Math.min(0.9 + (index * 0.01), 0.95);
    const progressEndDelay = Math.min(1 + (index * 0.01), 0.95);
    
    const progressValue = expandValue.interpolate({
      inputRange: [0, progressStartDelay, progressEndDelay, 1],
      outputRange: [0, 0, 0, 1],
    });

    return progressValue;
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.card, { 
        height: expandValue.interpolate({
          inputRange: [0, 0.3, 1],
          outputRange: [150, 250, 480],
        }),
        transform: [{
          scale: expandValue.interpolate({
            inputRange: [0, 0.1, 1],
            outputRange: [1, 1.02, 1],
          })
        }]
      }]}>
        <View style={styles.cardHeader}>
          <Text style={styles.monthText}>October 2024</Text>
        </View>
        
        <View style={styles.amountSection}>
          <Text style={styles.amount}>$4,578</Text>
          <Pressable 
            onPress={handleArrowPress}
            style={styles.arrowButton}
            android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
          >
            <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
              <Ionicons name="chevron-down" size={20} color="#fff" />
            </Animated.View>
          </Pressable>
        </View>
        
        <View style={styles.messageSection}>
          <Text style={styles.message}>You spent 22% less than last month!</Text>
        </View>

        <Animated.View style={[styles.expandableSection, {
          opacity: expandValue.interpolate({
            inputRange: [0, 0.1, 1],
            outputRange: [0, 0, 1],
          }),
        }]}>
          {EXPANDABLE_ITEMS.map((item, index) => {
            const animation = getItemAnimation(index);
            const progressAnimation = getProgressAnimation(index);
            const percentage = parseInt(item.percentage.replace('%', ''));
            
            return (
              <Animated.View
                key={item.id}
                style={[
                  styles.expandableItem,
                  {
                    transform: [
                      { translateY: animation.translateY },
                      { scale: animation.scale }
                    ],
                    opacity: animation.opacity,
                  }
                ]}
              >
                <View style={styles.itemLeft}>
                  <View style={styles.iconContainer}>
                    <Ionicons name={item.icon as any} size={20} color="#fff" />
                  </View>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                </View>
                <View style={styles.itemRight}>
                  <Text style={styles.itemPercentage}>{item.percentage}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#fff" style={styles.chevron} />
                </View>
                
                <Animated.View 
                  style={[
                    styles.progressFill,
                    {
                      width: progressAnimation.interpolate({
                        inputRange: [0, 0.3, 0.7, 1],
                        outputRange: ['0%', '0%', '0%', `${percentage}%`],
                      }),
                      opacity: progressAnimation.interpolate({
                        inputRange: [0, 0.3, 0.7, 1],
                        outputRange: [0, 0, 0, 1],
                      }),
                      transform: [{
                        translateX: progressAnimation.interpolate({
                          inputRange: [0, 0.3, 0.7, 1],
                          outputRange: [-400, -400, -200, 0],
                        })
                      }]
                    }
                  ]}
                />
              </Animated.View>
            );
          })}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#111',
    borderRadius: 30,
    paddingLeft: 24,
    paddingRight: 24,
    paddingTop: 20,
    paddingBottom: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  monthText: {
    fontSize: 14,
    color: '#ddd',
    fontWeight: '500',
  },
  arrowButton: {
    padding: 8,
    borderRadius: 8,
  },
  amountSection: {
    marginBottom: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amount: {
    fontSize: 40,
    fontWeight: '700',
    color: '#fff',
  },
  messageSection: {
    marginTop: 8,
  },
  message: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  expandableSection: {
    marginTop: 10,
    paddingTop: 10,
    
  },
  expandableItem: {
    position: 'relative',
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    zIndex: 2,
  },
  iconContainer: {
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  itemTitle: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  itemPercentage: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
    marginRight: 8,
  },
  chevron: {
    opacity: 1,
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
});
