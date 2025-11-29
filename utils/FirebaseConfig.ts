import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyD4iE1aIi40Fry75O_2VByjSRyZaxiB-Ls",
    authDomain: "earnarena.firebaseapp.com",
    projectId: "earnarena",
    storageBucket: "earnarena.firebasestorage.app",
    messagingSenderId: "6947808066",
    appId: "1:6947808066:web:68f66600dfe1b630a41edb",
    measurementId: "G-2H1X9XJVX9"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
// export const analytics = getAnalytics(app);
export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence()
});
export const db = getFirestore(app);