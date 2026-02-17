import { getApps, initializeApp, getApp } from "firebase/app";
import {
  getReactNativePersistence,
  initializeAuth,
  getAuth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyBiWZRrE0RS0dFJ4TzU8kqKqarDhbwu18I",
  authDomain: "budgetbox-eee26.firebaseapp.com",
  projectId: "budgetbox-eee26",
  storageBucket: "budgetbox-eee26.firebasestorage.app",
  messagingSenderId: "790628039895",
  appId: "1:790628039895:web:e79ed7e4891771b922c492",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// initializeAuth must only be called once per app. On hot-reload the app
// already exists so getAuth is used instead.
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
} catch (e: any) {
  // "already-initialized" is thrown on hot-reload
  if (e?.code === "auth/already-initialized") {
    auth = getAuth(app);
  } else {
    throw e; // surface unexpected errors instead of silently swallowing them
  }
}

const db = getFirestore(app);

export { app, auth, db };
