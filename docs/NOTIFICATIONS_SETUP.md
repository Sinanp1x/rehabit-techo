# Push Notifications Setup Guide

This guide explains how to set up push notifications for habit reminders in the Rehabit Techo app.

## Prerequisites

1. Firebase project with Cloud Messaging enabled
2. VAPID key from Firebase Console
3. Service worker support in your browser

## Setup Steps

### 1. Generate VAPID Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Project Settings** → **Cloud Messaging** tab
4. Scroll to **Web Push certificates** section
5. Click **Generate key pair**
6. Copy the generated key

### 2. Add VAPID Key to Your App

Edit `src/services/notifications.ts` and replace the placeholder:

```typescript
const VAPID_KEY = 'YOUR_VAPID_KEY_HERE'; // Replace with your actual VAPID key
```

### 3. Test Notifications

#### A. Enable Notifications in App

1. Log in to your app
2. Go to **Settings** page
3. Find the **Notifications** section
4. Click **Enable** button
5. Grant permission when browser prompts
6. Click **Send Test Notification** to verify it works

#### B. Test with Browser DevTools

Open browser console and run:

```javascript
Notification.requestPermission().then(permission => {
  if (permission === 'granted') {
    new Notification('Test', { body: 'It works!' });
  }
});
```

### 4. How Notifications Work

#### Client-Side (Local Notifications)

The app schedules local notifications for habits with specific times:

- **Trigger:** When habit time arrives
- **Type:** Browser Notification API
- **Limitation:** Only works while browser is open
- **Best for:** Testing and immediate reminders

#### Server-Side (Push Notifications - Recommended for Production)

For production, you need a backend to send notifications:

1. **User enables notifications** → FCM token saved to Firestore
2. **Backend service** (Cloud Functions, Node.js server, etc.) reads user habits
3. **At scheduled time** → Backend sends push via FCM
4. **Service Worker** receives push and shows notification
5. **User clicks notification** → Opens app

### 5. Backend Implementation (Optional)

#### Option A: Firebase Cloud Functions

Create a scheduled function to check habits and send notifications:

```javascript
// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.sendHabitReminders = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async (context) => {
    const now = new Date();
    const currentTime = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // Get all users with notifications enabled
    const usersSnapshot = await admin.firestore()
      .collection('users')
      .where('notificationsEnabled', '==', true)
      .get();
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const fcmToken = userDoc.data().fcmToken;
      
      if (!fcmToken) continue;
      
      // Get user's habits that match current time
      const habitsSnapshot = await admin.firestore()
        .collection('users')
        .doc(userId)
        .collection('habits')
        .where('hasTime', '==', true)
        .where('time', '==', currentTime)
        .get();
      
      // Send notification for each matching habit
      for (const habitDoc of habitsSnapshot.docs) {
        const habit = habitDoc.data();
        
        await admin.messaging().send({
          token: fcmToken,
          notification: {
            title: 'Habit Reminder',
            body: `Time to: ${habit.title}`,
            icon: '/icon-192.png',
          },
          data: {
            habitId: habitDoc.id,
            habitTitle: habit.title,
          },
          webpush: {
            fcmOptions: {
              link: 'https://your-app-url.com'
            }
          }
        });
      }
    }
    
    return null;
  });
```

Deploy:
```bash
cd functions
npm install firebase-functions firebase-admin
firebase deploy --only functions
```

#### Option B: Custom Backend Server

Example with Node.js + Express:

```javascript
const express = require('express');
const admin = require('firebase-admin');
const cron = require('node-cron');

admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const app = express();

// Check every minute for habits that need reminders
cron.schedule('* * * * *', async () => {
  const now = new Date();
  const currentTime = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  // Same logic as Cloud Functions example above
  // ...
});

app.listen(3000, () => {
  console.log('Notification server running on port 3000');
});
```

### 6. Testing End-to-End

#### Test Local Notifications (No Backend Needed)

1. Create a habit with a specific time (e.g., 2 minutes from now)
2. Wait for the time
3. You should see a notification (browser must be open)

#### Test Push Notifications (Backend Required)

1. Enable notifications in Settings
2. Verify FCM token is saved in Firestore (check `users/{uid}` document)
3. Use Firebase Console to send a test message:
   - Go to **Cloud Messaging** → **Send test message**
   - Add your FCM token
   - Send
4. You should receive the notification even if app is closed

### 7. Notification Actions

The service worker includes two action buttons:

- **✓ Mark Done** - Opens app with completion intent
- **Dismiss** - Closes notification

To handle the "Mark Done" action, check for `?action=complete` in the URL:

```typescript
// In HomePage.tsx
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('action') === 'complete') {
    // Show completion UI or auto-mark habit as done
  }
}, []);
```

### 8. Troubleshooting

#### "Notification permission denied"
- User must manually grant permission
- If denied, they need to reset in browser settings
- Chrome: Settings → Privacy → Site Settings → Notifications

#### "FCM token not generated"
- Check VAPID key is correct
- Verify Firebase project settings
- Check browser console for errors

#### "Notifications not appearing"
- Verify service worker is registered
- Check notification permission is granted
- Test with browser notification API first
- Check if "Do Not Disturb" mode is enabled on device

#### "Service worker not updating"
- Hard refresh (Ctrl+Shift+R)
- Unregister old service worker in DevTools
- Clear site data

### 9. Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ | Full support |
| Firefox | ✅ | Full support |
| Safari | ⚠️ | Limited (iOS 16.4+) |
| Edge | ✅ | Full support |
| Opera | ✅ | Full support |

### 10. Privacy & Permissions

- Notifications require explicit user permission
- FCM tokens are stored securely in Firestore
- Users can disable notifications anytime
- Tokens are refreshed automatically by Firebase

### 11. Production Checklist

- [ ] VAPID key configured
- [ ] Backend notification scheduler deployed
- [ ] Service worker registered correctly
- [ ] Firestore rules allow token storage
- [ ] Error handling for failed sends
- [ ] Rate limiting to prevent spam
- [ ] Analytics to track notification engagement
- [ ] Fallback for unsupported browsers

---

## Quick Reference

### Enable Notifications
```typescript
import { requestNotificationPermission, getFCMToken } from './services/notifications';

const enabled = await requestNotificationPermission();
if (enabled) {
  await getFCMToken();
}
```

### Send Test Notification
```typescript
import { showTestNotification } from './services/notifications';

showTestNotification();
```

### Disable Notifications
```typescript
import { disableNotifications } from './services/notifications';

await disableNotifications();
```

---

**Last Updated:** January 2026
