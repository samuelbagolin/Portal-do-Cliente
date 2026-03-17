import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBTFomY1E05OC6p7i8iaVLcgAp8nkB7Aso",
  authDomain: "portal-do-cliente-b1cc3.firebaseapp.com",
  projectId: "portal-do-cliente-b1cc3",
  storageBucket: "portal-do-cliente-b1cc3.firebasestorage.app",
  messagingSenderId: "1062000106254",
  appId: "1:1062000106254:web:b9978d2eaab5bf2992d55f",
  measurementId: "G-NMD5262CCL"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export default app;
