import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  setDoc, 
  query, 
  where 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC589apKfCaiuVvkGJROob53KhtBLw3yN0",
  authDomain: "weblizz.firebaseapp.com",
  projectId: "weblizz",
  storageBucket: "weblizz.firebasestorage.app",
  messagingSenderId: "300678497389",
  appId: "1:300678497389:web:a7b4a472ff68332cfe2b64"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { 
  db, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  setDoc, 
  query, 
  where 
};
