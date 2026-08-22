import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Se conecta utilizando las variables públicas del frontend o endpoints seguros
const firebaseConfig = {
  projectId: "weblizz"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
