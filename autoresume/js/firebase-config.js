// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyALhiKGiNuCY1FxL2Y0XRthtCOOtyf7qOU",
  authDomain: "lalitsresume.firebaseapp.com",
  projectId: "lalitsresume",
  storageBucket: "lalitsresume.firebasestorage.app",
  messagingSenderId: "915370328281",
  appId: "1:915370328281:web:cb42815d516ce17d273ec8",
  measurementId: "G-5B81JTT198"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Gemini API Config
export const GEMINI_API_KEY = "your_new_api_key_here";
export const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
