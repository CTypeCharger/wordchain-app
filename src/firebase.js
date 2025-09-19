import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Firebase 설정
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBVVotiRdcakw5CpDVZFoME_Ol5hsdl4_8",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "wordchain-9db18.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "wordchain-9db18",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "wordchain-9db18.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "790881499796",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:790881499796:web:f8fece7e845f6e5afb5281"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
