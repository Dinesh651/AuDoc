import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// IMPORTANT: Replace the following config with your own Firebase project configuration
// found in Project Settings > General > Your apps > SDK setup and configuration.
const firebaseConfig = {
  apiKey: "AIzaSyAorD9R4FiSq6M1MeJwFukkO3Leu7q6F7o",
  authDomain: "cozey-8ad64.firebaseapp.com",
  databaseURL: "https://cozey-8ad64.firebaseio.com",
  projectId: "cozey-8ad64",
  storageBucket: "cozey-8ad64.appspot.com",
  messagingSenderId: "841803166613",
  appId: "1:841803166613:web:15a2f747f20aba1c4f3c9c",
  measurementId: "G-1WZGGQ6ZG7"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
