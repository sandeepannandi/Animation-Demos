import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView, Dimensions, Image, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function CallInterface() {
  const [isExpanded, setIsExpanded] = useState(false);
  const expandAnimation = useRef(new Animated.Value(0)).current;
  const cameraOpacity = useRef(new Animated.Value(1)).current;
  const minimizeOpacity = useRef(new Animated.Value(1)).current;

  const handleCallerInfoPress = () => {
    const toValue = isExpanded ? 0 : 1;
    
    if (toValue === 1) {
      // Expanding
      Animated.sequence([
        Animated.timing(expandAnimation, {
          toValue: 1.1,
          duration: 150,
          useNativeDriver: false,
        }),
        Animated.spring(expandAnimation, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: false,
        })
      ]).start();
      
      // Hide camera and minimize buttons
      Animated.timing(cameraOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      
      Animated.timing(minimizeOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      // Collapsing
      Animated.timing(expandAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
      
      // Show camera and minimize buttons
      Animated.timing(cameraOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      
      Animated.timing(minimizeOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
    
    setIsExpanded(!isExpanded);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Background Gradient */}
      <View style={styles.backgroundGradient} />
      
      {/* Call Interface Bar */}
      <View style={styles.callBar}>
        {/* Camera Button */}
        <Animated.View style={{ opacity: cameraOpacity }}>
          <Pressable style={styles.cameraButton} android_ripple={{ color: 'rgba(255,255,255,0.2)' }}>
            <Ionicons name="camera" size={22} color="#000" />
          </Pressable>
        </Animated.View>
        
        {/* Caller Info */}
        <Animated.View style={[
          styles.callerInfo,
          {
            height: expandAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [70, 120],
            }),
            width: expandAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [SCREEN_WIDTH - 40, SCREEN_WIDTH - 40],
            }),
          }
        ]}>
          <Pressable onPress={handleCallerInfoPress} style={[
            styles.callerInfoContent,
            {
              flexDirection: isExpanded ? 'column' : 'row',
              alignItems: isExpanded ? 'flex-start' : 'center',
              justifyContent: isExpanded ? 'space-between' : 'space-between',
            }
          ]}>
          <View style={styles.profileImageContainer}>
            <Image 
              source={{ uri: 'https://pbs.twimg.com/profile_images/1918654750977073152/kWFKH63n_400x400.jpg' }}
              style={styles.profileImage}
            />
          </View>
          
          <View style={styles.callerDetails}>
            <Text style={styles.callerName}>Sandi</Text>
            <Text style={styles.phoneNumber}>6397509378</Text>
          </View>
          
          <View style={styles.actionButtonsRow}>
            <Pressable style={styles.answerButton} android_ripple={{ color: 'rgba(255,255,255,0.2)' }}>
              <Ionicons name="call" size={20} color="#fff" />
            </Pressable>
            
            <Pressable style={styles.declineButton} android_ripple={{ color: 'rgba(255,255,255,0.2)' }}>
              <Ionicons name="call" size={20} color="#fff" style={{ transform: [{ scaleX: -1 }] }} />
            </Pressable>
            
            <Animated.View style={{ opacity: expandAnimation }}>
              <Pressable style={styles.messageButton} android_ripple={{ color: 'rgba(0,0,0,0.1)' }}>
                <Ionicons name="chatbubble-outline" size={20} color="#000" />
              </Pressable>
            </Animated.View>
          </View>
          </Pressable>
        </Animated.View>
        
        {/* Minimize Button */}
        <Animated.View style={{ opacity: minimizeOpacity }}>
          <Pressable style={styles.minimizeButton} android_ripple={{ color: 'rgba(0,0,0,0.8)' }}>
            <Ionicons name="remove" size={26} color="#000" />
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    opacity: 1,
  },
  callBar: {
    position: 'absolute',
    bottom: 80,
    left: 10,
    right: 10,
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 35,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  cameraButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    shadowColor: '#87CEEB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 20,
  },
  callerInfo: {
    marginRight: 8,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 40,
  },
  callerInfoContent: {
    flex: 1,
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 14,
    paddingRight: 14,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileImageContainer: {
    width: 40,
    height: 40,
    borderRadius: 25,
    marginRight: 8,
    borderWidth: 0,
    borderColor: 'rgba(255,255,255,0)',
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  callerDetails: {
    flex: 1,
    justifyContent: 'center',
    marginLeft: 8,
  },
  callerName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 0,
  },
  phoneNumber: {
    fontSize: 12,
    color: 'rgba(255,255,255,1)',
    fontWeight: '500',
  },
  answerButton: {
    width: 40,
    height: 40,
    borderRadius: 22.5,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  declineButton: {
    width: 40,
    height: 40,
    borderRadius: 22.5,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 0,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  minimizeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(245, 245, 220, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F5F5DC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 20,
  },
  messageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(245, 245, 220, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F5F5DC',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
});
