import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCc1ywGusKtkQgz-M5quga7YpA0eT9W_xM",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "habit-tracker-48c90.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "habit-tracker-48c90",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "habit-tracker-48c90.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "385432675908",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:385432675908:web:61c1dd4a9dcdffe562fe11",
};

const app = initializeApp(firebaseConfig);
export const firestore = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Enable offline persistence for Firestore
enableIndexedDbPersistence(firestore).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Firestore persistence failed: multiple tabs open');
  } else if (err.code === 'unimplemented') {
    console.warn('Firestore persistence not supported in this browser');
  }
});