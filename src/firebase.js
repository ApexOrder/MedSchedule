// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAa2a2bBbFZcEfzTLdUWtbnTYPA7wuLz1c",
  authDomain: "carecalendar-9950a.firebaseapp.com",
  projectId: "carecalendar-9950a",
  storageBucket: "carecalendar-9950a.firebasestorage.app",
  messagingSenderId: "903912896385",
  appId: "1:903912896385:web:13ae48073658506d325a80"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
