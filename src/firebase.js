import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyBVVotiRdcakw5CpDVZFoME_Ol5hsdl4_8",
  authDomain: "wordchain-9db18.firebaseapp.com",
  projectId: "wordchain-9db18",
  storageBucket: "wordchain-9db18.firebasestorage.app",
  messagingSenderId: "790881499796",
  appId: "1:790881499796:web:f8fece7e845f6e5afb5281"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
