import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API,
  authDomain: "connectify-29152.firebaseapp.com",
  projectId: "connectify-29152",
  storageBucket: "connectify-29152.appspot.com",
  appId: "1:3931100447:web:4570c89760c241823a0c2a",
  messagingSenderId: "3931100447",
};

export const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
