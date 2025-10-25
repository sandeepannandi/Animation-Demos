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
  const itemAnimations = useRef(EXPANDABLE_ITEMS.map(() => new Animated.Value(0))).current;
  const progressAnimations = useRef(EXPANDABLE_ITEMS.map(() => new Animated.Value(0))).current;

  const handleArrowPress = () => {
    const toValue = isExpanded ? 0 : 1;
    
    Animated.timing(rotationValue, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start();

    if (toValue === 1) {
      // Opening: animate container immediately
      Animated.timing(expandValue, {
        toValue,
        duration: 500,
        useNativeDriver: false,
      }).start();
    } else {
      // Closing: delay container animation until tabs finish
      const totalTabAnimationTime = (EXPANDABLE_ITEMS.length - 0) * 100; // Last tab delay + duration
      Animated.timing(expandValue, {
        toValue,
        duration: 200,
        delay: totalTabAnimationTime,
        useNativeDriver: false,
      }).start();
    }

    if (toValue === 1) {
      // Opening: animate items one by one
      EXPANDABLE_ITEMS.forEach((_, index) => {
        Animated.timing(itemAnimations[index], {
          toValue: 1,
          duration: 300,
          delay: index * 130,
          useNativeDriver: true,
        }).start(() => {
          // After items are shown, animate progress bars
          if (index === EXPANDABLE_ITEMS.length - 1) {
            EXPANDABLE_ITEMS.forEach((_, progressIndex) => {
              Animated.timing(progressAnimations[progressIndex], {
                toValue: 1,
                duration: 800,
                delay: progressIndex * 1,
                useNativeDriver: false,
              }).start();
            });
          }
        });
      });
    } else {
      // Closing: animate items in reverse order (bottom to top)
      // First reset progress bars
      progressAnimations.forEach(anim => anim.setValue(0));
      
      // Then animate items in reverse order
      EXPANDABLE_ITEMS.forEach((_, index) => {
        const reverseIndex = EXPANDABLE_ITEMS.length - 1 - index;
        Animated.timing(itemAnimations[reverseIndex], {
          toValue: 0,
          duration: 120,
          delay: index * 90,
          useNativeDriver: true,
        }).start();
      });
    }
    
    setIsExpanded(!isExpanded);
  };

  const rotateInterpolate = rotationValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

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
            const percentage = parseInt(item.percentage.replace('%', ''));
            
            return (
              <Animated.View
                key={item.id}
                style={[
                  styles.expandableItem,
                  {
                    transform: [
                      { 
                        translateY: itemAnimations[index].interpolate({
                          inputRange: [0, 1],
                          outputRange: [60, 0],
                        })
                      },
                      { 
                        scale: itemAnimations[index].interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [0.6, 1.05, 1],
                        })
                      }
                    ],
                    opacity: itemAnimations[index],
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
                      width: progressAnimations[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', `${percentage}%`],
                      }),
                      opacity: progressAnimations[index],
                      transform: [{
                        translateX: progressAnimations[index].interpolate({
                          inputRange: [0, 1],
                          outputRange: [-200, 0],
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
