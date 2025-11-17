

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA-RrgY7hKLSyC751yX5z1GoYgO1wHglJs",
  authDomain: "chat-app-4a3c2.firebaseapp.com",
  projectId: "chat-app-4a3c2",
  storageBucket: "chat-app-4a3c2.firebasestorage.app",
  messagingSenderId: "828846885768",
  appId: "1:828846885768:web:42535df00b8babd5a3883d",
  measurementId: "G-0SET9HY9LM"
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
