import { getMessagingInstance } from '../firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { firestore, auth } from '../firebase';

// Your VAPID key from Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
const VAPID_KEY = 'ng7hzPaG7ZiOT9KjxLU1spkHj3VUgbMwLVR9Dm_TBo4'; // TODO: Add your VAPID key

export interface NotificationPermissionState {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

/**
 * Check if notifications are supported in this browser
 */
export const areNotificationsSupported = (): boolean => {
  return 'Notification' in window && 'serviceWorker' in navigator;
};

/**
 * Get current notification permission state
 */
export const getNotificationPermission = (): NotificationPermissionState => {
  if (!areNotificationsSupported()) {
    return { granted: false, denied: true, default: false };
  }

  const permission = Notification.permission;
  return {
    granted: permission === 'granted',
    denied: permission === 'denied',
    default: permission === 'default',
  };
};

/**
 * Request notification permission from the user
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!areNotificationsSupported()) {
    console.warn('Notifications not supported');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

/**
 * Get FCM token and save it to Firestore
 */
export const getFCMToken = async (): Promise<string | null> => {
  const messaging = getMessagingInstance();
  if (!messaging) {
    console.warn('Firebase Messaging not available');
    return null;
  }

  try {
    const currentToken = await getToken(messaging, {
      vapidKey: VAPID_KEY,
    });

    if (currentToken) {
      console.log('FCM Token obtained:', currentToken);
      
      // Save token to Firestore for the current user
      const user = auth.currentUser;
      if (user) {
        await setDoc(
          doc(firestore, 'users', user.uid),
          {
            fcmToken: currentToken,
            notificationsEnabled: true,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      return currentToken;
    } else {
      console.log('No registration token available');
      return null;
    }
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

/**
 * Initialize FCM and set up foreground message handler
 */
export const initializeNotifications = async (
  onMessageReceived?: (payload: any) => void
): Promise<void> => {
  const messaging = getMessagingInstance();
  if (!messaging) {
    return;
  }

  // Handle foreground messages
  onMessage(messaging, (payload) => {
    console.log('Message received in foreground:', payload);

    if (onMessageReceived) {
      onMessageReceived(payload);
    }

    // Show notification manually when app is in foreground
    if (payload.notification) {
      const { title, body, icon } = payload.notification;
      
      if (Notification.permission === 'granted') {
        new Notification(title || 'Habit Reminder', {
          body: body || 'Time to complete your habit!',
          icon: icon || '/icon-192.png',
          badge: '/icon-192.png',
          tag: 'habit-reminder',
          requireInteraction: true,
        });
      }
    }
  });
};

/**
 * Schedule a local notification (for habits with specific times)
 * Note: This is a client-side implementation. For production, use a backend service.
 */
export const scheduleHabitNotification = (
  habitTitle: string,
  habitTime: string // "HH:mm" format
): void => {
  if (!areNotificationsSupported() || Notification.permission !== 'granted') {
    return;
  }

  const [hours, minutes] = habitTime.split(':').map(Number);
  const now = new Date();
  const scheduledTime = new Date();
  scheduledTime.setHours(hours, minutes, 0, 0);

  // If time has passed today, schedule for tomorrow
  if (scheduledTime <= now) {
    scheduledTime.setDate(scheduledTime.getDate() + 1);
  }

  const delay = scheduledTime.getTime() - now.getTime();

  // Schedule notification
  setTimeout(() => {
    new Notification('Habit Reminder', {
      body: `Time to: ${habitTitle}`,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `habit-${habitTitle}`,
      requireInteraction: false,
    });
  }, delay);
};

/**
 * Show an immediate test notification
 */
export const showTestNotification = (): void => {
  if (!areNotificationsSupported()) {
    alert('Notifications not supported in this browser');
    return;
  }

  if (Notification.permission !== 'granted') {
    alert('Please grant notification permission first');
    return;
  }

  new Notification('Test Notification', {
    body: 'Your habit reminders will look like this! 🎉',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
  });
};

/**
 * Disable notifications for the user
 */
export const disableNotifications = async (): Promise<void> => {
  const user = auth.currentUser;
  if (user) {
    await setDoc(
      doc(firestore, 'users', user.uid),
      {
        notificationsEnabled: false,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  }
};
