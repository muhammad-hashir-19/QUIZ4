import { initializeApp } from 'firebase/app';
import { inMemoryPersistence, initializeAuth } from 'firebase/auth';

// Firebase web config for project quiz4-otp. These values identify the project; they are not secrets.
export const firebaseConfig = {
  apiKey: 'AIzaSyD95vCE2b7pnwlRQ5BDH6H_h2hvCY3iwtk',
  authDomain: 'quiz4-otp.firebaseapp.com',
  projectId: 'quiz4-otp',
  storageBucket: 'quiz4-otp.firebasestorage.app',
  messagingSenderId: '655894647435',
  appId: '1:655894647435:web:fd2c90c3d98128449bfa8e',
};

export const app = initializeApp(firebaseConfig);

// In-memory persistence: every app launch starts signed out, so each demo run verifies from scratch.
export const auth = initializeAuth(app, { persistence: inMemoryPersistence });
