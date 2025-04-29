// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDkMeaYHrvwJY7vsIsqrjpp8-weEf3QR0Y",
  authDomain: "chatroom-bab80.firebaseapp.com",
  projectId: "chatroom-bab80",
  storageBucket: "chatroom-bab80.appspot.com",
  messagingSenderId: "635206793181",
  appId: "1:635206793181:web:673328cd1eec5803af2834"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);