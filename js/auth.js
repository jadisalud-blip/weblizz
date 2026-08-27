import { auth, db } from './firebase-config.js';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged,
  signOut 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const provider = new GoogleAuthProvider();

export function verificarSesion() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        if (userDoc.exists()) {
          resolve({ ...user, ...userDoc.data() });
        } else {
          resolve(user);
        }
      } else {
        resolve(null);
      }
    });
  });
}

export async function esVendedor(user) {
  if (!user) return false;
  const userDoc = await getDoc(doc(db, "usuarios", user.uid));
  return userDoc.exists() && userDoc.data().rol === "vendedor";
}

export async function loginConGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const userDoc = await getDoc(doc(db, "usuarios", user.uid));
    if (!userDoc.exists()) {
      await setDoc(doc(db, "usuarios", user.uid), {
        nombre: user.displayName,
        email: user.email,
        celular: user.phoneNumber || "",
        rol: "cliente",
        fechaRegistro: new Date().toISOString()
      });
    }
    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function guardarUsuarioCelular(nombre, celular) {
  try {
    const q = query(collection(db, "usuarios"), where("celular", "==", celular));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const userData = snapshot.docs[0].data();
      return { success: true, user: userData, isNew: false };
    }
    const newUserRef = doc(db, "usuarios", `cel_${celular}`);
    await setDoc(newUserRef, {
      nombre: nombre,
      celular: celular,
      rol: "cliente",
      fechaRegistro: new Date().toISOString()
    });
    return { success: true, user: { nombre, celular, rol: "cliente" }, isNew: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function cerrarSesion() {
  try {
    await signOut(auth);
    localStorage.removeItem("beauty_cliente");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
