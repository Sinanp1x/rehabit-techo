// Firebase Cloud Messaging Service Worker
// This file handles background notifications

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Your Firebase configuration
firebase.initializeApp({
  apiKey: "AIzaSyCc1ywGusKtkQgz-M5quga7YpA0eT9W_xM",
  authDomain: "habit-tracker-48c90.firebaseapp.com",
  projectId: "habit-tracker-48c90",
  storageBucket: "habit-tracker-48c90.firebasestorage.app",
  messagingSenderId: "385432675908",
  appId: "1:385432675908:web:61c1dd4a9dcdffe562fe11"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'Habit Reminder';
  const notificationOptions = {
    body: payload.notification?.body || 'Time to complete your habit!',
    icon: payload.notification?.icon || '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'habit-reminder',
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: payload.data || {},
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});
