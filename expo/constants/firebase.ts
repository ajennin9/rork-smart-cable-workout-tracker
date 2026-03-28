import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your Firebase config - replace with your actual config
const firebaseConfig = {
  apiKey: "AIzaSyDzY4Jshryd8OjxIYSDY0tpEyelrDoJrW4",
  authDomain: "project-ironiq.firebaseapp.com",
  projectId: "project-ironiq",
  storageBucket: "project-ironiq.firebasestorage.app",
  messagingSenderId: "690570562633",
  appId: "1:690570562633:web:e3e8427a2ae6777823c398",
  measurementId: "G-M77H3GL2K0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
const auth = getAuth(app);

// Try to set persistence for React Native
try {
  setPersistence(auth, browserLocalPersistence);
} catch (error) {
  console.warn('Could not set persistence:', error);
}

// Initialize Firestore
const db = getFirestore(app);

export { auth, db };
export default app;