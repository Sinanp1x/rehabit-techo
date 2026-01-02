import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getMessaging, isSupported, type Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyCc1ywGusKtkQgz-M5quga7YpA0eT9W_xM",
  authDomain: "habit-tracker-48c90.firebaseapp.com",
  projectId: "habit-tracker-48c90",
  storageBucket: "habit-tracker-48c90.firebasestorage.app",
  messagingSenderId: "385432675908",
  appId: "1:385432675908:web:61c1dd4a9dcdffe562fe11"
};

const app = initializeApp(firebaseConfig);
export const firestore = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize messaging only if supported (not in all browsers)
let messaging: Messaging | null = null;
isSupported().then((supported) => {
  if (supported) {
    messaging = getMessaging(app);
  }
}).catch(() => {
  console.log('Firebase Messaging not supported in this browser');
});

export const getMessagingInstance = (): Messaging | null => messaging;