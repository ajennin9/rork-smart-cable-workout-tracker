import createContextHook from '@nkzw/create-context-hook';
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, X } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface NotificationState {
  showNotification: (message: string, duration?: number) => void;
  NotificationOverlay: () => React.JSX.Element;
}

interface NotificationData {
  id: string;
  message: string;
  duration: number;
}

const { width } = Dimensions.get('window');

export const [NotificationProvider, useNotification] = createContextHook<NotificationState>(() => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  const showNotification = useCallback((message: string, duration: number = 5000) => {
    const id = Date.now().toString();
    const notification: NotificationData = { id, message, duration };
    
    setNotifications(prev => [...prev, notification]);
    
    // Auto-dismiss after duration
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, duration);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const NotificationOverlay = useCallback(() => {
    return (
      <NotificationOverlayComponent 
        notifications={notifications} 
        onDismiss={dismissNotification} 
      />
    );
  }, [notifications, dismissNotification]);

  return useMemo(() => ({
    showNotification,
    NotificationOverlay,
  }), [showNotification, NotificationOverlay]);
});

interface NotificationOverlayProps {
  notifications: NotificationData[];
  onDismiss: (id: string) => void;
}

function NotificationOverlayComponent({ notifications, onDismiss }: NotificationOverlayProps) {
  const insets = useSafeAreaInsets();

  if (notifications.length === 0) return null;

  return (
    <View style={[styles.overlay, { top: insets.top + 10 }]} pointerEvents="box-none">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
        />
      ))}
    </View>
  );
}

interface NotificationItemProps {
  notification: NotificationData;
  onDismiss: (id: string) => void;
}

function NotificationItem({ notification, onDismiss }: NotificationItemProps) {
  const [slideAnim] = useState(new Animated.Value(-width));
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Slide in animation
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, fadeAnim]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -width,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss(notification.id);
    });
  };

  return (
    <Animated.View
      style={[
        styles.notification,
        {
          transform: [{ translateX: slideAnim }],
          opacity: fadeAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.notificationContent}
        onPress={handleDismiss}
        activeOpacity={0.9}
      >
        <View style={styles.iconContainer}>
          <CheckCircle size={20} color={Colors.success} />
        </View>
        <Text style={styles.notificationText} numberOfLines={2}>
          {notification.message}
        </Text>
        <TouchableOpacity style={styles.closeButton} onPress={handleDismiss}>
          <X size={16} color={Colors.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: 16,
  },
  notification: {
    marginBottom: 8,
  },
  notificationContent: {
    backgroundColor: '#f0f9f0',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: Colors.success + '40',
  },
  iconContainer: {
    marginRight: 12,
  },
  notificationText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 20,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
});