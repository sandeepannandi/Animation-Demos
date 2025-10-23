import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = { onBack: () => void };

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function HamburgerMenuPage({ onBack }: Props) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuAnimation = useRef(new Animated.Value(0)).current;

  const toggleMenu = () => {
    if (isMenuOpen) {
      Animated.timing(menuAnimation, {
        toValue: 0,
        duration: 600, // Faster closing
        useNativeDriver: true,
      }).start(() => {
        setIsMenuOpen(false);
      });
    } else {
      setIsMenuOpen(true);
      Animated.timing(menuAnimation, {
        toValue: 1,
        duration: 500, // Faster opening
        useNativeDriver: true,
      }).start();
    }
  };

  const getItemAnimation = (index: number) => {
    const reverseIndex = 3 - index;
    
    const itemProgress = menuAnimation.interpolate({
      inputRange: [0, 0.05 + (index * 0.2), 0.3 + (index * 0.2), 1],
      outputRange: [0, 0, 0, 1],
    });

    const disappearProgress = menuAnimation.interpolate({
      inputRange: [0, 0.05 + (reverseIndex * 0.2), 0.3 + (reverseIndex * 0.2), 1],
      outputRange: [1, 1, 1, 0],
    });

    return {
      translateY: itemProgress.interpolate({
        inputRange: [0, 0.3, 1],
        outputRange: [60, 60, 0], // Start from below and slide up
      }),
      opacity: itemProgress.interpolate({
        inputRange: [0, 0.1, 0.4, 1],
        outputRange: [0, 0, 0, 1],
      }),
      scale: itemProgress.interpolate({
        inputRange: [0, 0.2, 0.6, 1],
        outputRange: [0.6, 0.6, 1.05, 1], // Smooth scale with slight bounce
      }),
      // Disappearing animations
      disappearTranslateY: disappearProgress.interpolate({
        inputRange: [0, 0.3, 1],
        outputRange: [0, 0, -60], // Slide up and disappear
      }),
      disappearOpacity: disappearProgress.interpolate({
        inputRange: [0, 0.1, 0.4, 1],
        outputRange: [1, 1, 1, 0],
      }),
      disappearScale: disappearProgress.interpolate({
        inputRange: [0, 0.2, 0.6, 1],
        outputRange: [1, 1, 1.05, 0.6], // Scale down while disappearing with slight bounce
      }),
    };
  };

  const hamburgerRotation = menuAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <SafeAreaView style={styles.container}>
      <Pressable onPress={onBack} style={styles.backBtn} android_ripple={{ color: 'rgba(255,255,255,0.9)' }}>
        <Ionicons name="chevron-back" size={24} color="#fff" />
      </Pressable>

      

      {/* Hamburger Menu Button */}
      <Pressable 
        style={styles.hamburgerBtn} 
        onPress={toggleMenu}
        android_ripple={{ color: 'rgba(255,255,255,0.05)' }}
      >
        <Animated.View>
          <Ionicons name="menu" size={24} color="#fff" />
        </Animated.View>
      </Pressable>

      {/* Menu Overlay */}
      <Animated.View 
        style={[
          styles.menuOverlay,
          {
            opacity: menuAnimation.interpolate({
              inputRange: [0, 0.1, 1],
              outputRange: [0, 0, 1],
            }),
          }
        ]}
        pointerEvents={isMenuOpen ? 'auto' : 'none'}
      >
        <Pressable 
          style={StyleSheet.absoluteFillObject}
          onPress={toggleMenu}
        />
         <Animated.View 
           style={[
             styles.menuContent,
             {
               transform: [
                 {
                   translateY: menuAnimation.interpolate({
                     inputRange: [0, 0.3, 1],
                     outputRange: [80, 80, 0], // Slide up from bottom more smoothly
                   })
                 }
               ]
             }
           ]}
           onStartShouldSetResponder={() => true}
         >
            {/* Contents Bar */}
            <Animated.View 
              style={[
                styles.contentsBar,
                {
                  transform: [
                    { 
                      translateY: isMenuOpen 
                        ? getItemAnimation(0).translateY 
                        : getItemAnimation(0).disappearTranslateY 
                    },
                    { 
                      scale: isMenuOpen 
                        ? getItemAnimation(0).scale 
                        : getItemAnimation(0).disappearScale 
                    }
                  ],
                  opacity: isMenuOpen 
                    ? getItemAnimation(0).opacity 
                    : getItemAnimation(0).disappearOpacity,
                }
              ]}
            >
              <Text style={styles.contentsText}>Contents  •  0%</Text>
              <Ionicons name="list" size={20} color="#fff" style={{ paddingLeft: 55 }} />
            </Animated.View>

            {/* Search Book Bar */}
            <Animated.View 
              style={[
                styles.menuBar,
                {
                  transform: [
                    { 
                      translateY: isMenuOpen 
                        ? getItemAnimation(1).translateY 
                        : getItemAnimation(1).disappearTranslateY 
                    },
                    { 
                      scale: isMenuOpen 
                        ? getItemAnimation(1).scale 
                        : getItemAnimation(1).disappearScale 
                    }
                  ],
                  opacity: isMenuOpen 
                    ? getItemAnimation(1).opacity 
                    : getItemAnimation(1).disappearOpacity,
                }
              ]}
            >
              <Text style={styles.menuText}>Search Book</Text>
              <Ionicons name="search" size={20} color="#fff" style={{ paddingLeft: 75 }} />
            </Animated.View>

            {/* Themes & Settings Bar */}
            <Animated.View 
              style={[
                styles.menuBar,
                {
                  transform: [
                    { 
                      translateY: isMenuOpen 
                        ? getItemAnimation(2).translateY 
                        : getItemAnimation(2).disappearTranslateY 
                    },
                    { 
                      scale: isMenuOpen 
                        ? getItemAnimation(2).scale 
                        : getItemAnimation(2).disappearScale 
                    }
                  ],
                  opacity: isMenuOpen 
                    ? getItemAnimation(2).opacity 
                    : getItemAnimation(2).disappearOpacity,
                }
              ]}
            >
              <Text style={styles.menuText}>Themes & Settings</Text>
              <Text style={styles.aaIcon}>aA</Text>
            </Animated.View>

            {/* Bottom Action Buttons */}
            <Animated.View 
              style={[
                styles.bottomActions,
                {
                  transform: [
                    { 
                      translateY: isMenuOpen 
                        ? getItemAnimation(3).translateY 
                        : getItemAnimation(3).disappearTranslateY 
                    },
                    { 
                      scale: isMenuOpen 
                        ? getItemAnimation(3).scale 
                        : getItemAnimation(3).disappearScale 
                    }
                  ],
                  opacity: isMenuOpen 
                    ? getItemAnimation(3).opacity 
                    : getItemAnimation(3).disappearOpacity,
                }
              ]}
            >
              <Pressable style={styles.actionBtn} android_ripple={{ color: 'rgba(255,255,255,0.1)' }}>
                <Ionicons name="cloud-upload" size={20} color="#fff" />
              </Pressable>
              <Pressable style={styles.actionBtn} android_ripple={{ color: 'rgba(255,255,255,0.1)' }}>
                <Ionicons name="refresh" size={20} color="#fff" />
              </Pressable>
              <Pressable style={styles.actionBtn} android_ripple={{ color: 'rgba(255,255,255,0.1)' }}>
                <Ionicons name="list" size={20} color="#fff" />
              </Pressable>
              <Pressable style={styles.actionBtn} android_ripple={{ color: 'rgba(255,255,255,0.1)' }}>
                <Ionicons name="bookmark" size={20} color="#fff" />
              </Pressable>
            </Animated.View>
        </Animated.View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
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
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  hamburgerBtn: {
    position: 'absolute',
    bottom: 60,
    right: 40,
    width: 52,
    height: 52,
    borderRadius: 50,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,1)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingBottom: 120, // Position relative to hamburger button
    paddingRight: 20,
  },
  menuContent: {
    width: 380,
    gap: 8,
    alignItems: 'flex-end',
  },
  contentsBar: {
    backgroundColor: '#666',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contentsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  menuBar: {
    backgroundColor: '#333',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  aaIcon: {
    color: '#fff',
    fontSize: 18,
    paddingLeft: 30,
    fontWeight: '600',
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 0,
    width: 236,
  },
  actionBtn: {
    width: 55,
    height: 50,
    borderRadius: 20,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
