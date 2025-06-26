import { initializeApp } from "firebase/app";
import { getAuth , GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDGfUk21VmPyNbBlBEDBAbObwwkiE_mPbc",
  authDomain: "crm-application-64f82.firebaseapp.com",
  projectId: "crm-application-64f82",
  storageBucket: "crm-application-64f82.firebasestorage.app",
  messagingSenderId: "1001478107726",
  appId: "1:1001478107726:web:a7c761cae27f4a8026891f",
  
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider();
