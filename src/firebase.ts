import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";


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