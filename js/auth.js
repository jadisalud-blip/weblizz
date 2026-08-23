// Inicialización de Firebase leyendo process.env o variables globales
const firebaseProjectId = process.env?.FIREBASE_PROJECT_ID || "weblizz";

const firebaseConfig = {
  apiKey: process.env?.FIREBASE_API_KEY,
  authDomain: `${firebaseProjectId}.firebaseapp.com`,
  projectId: firebaseProjectId,
  storageBucket: `${firebaseProjectId}.appspot.com`
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const db = firebase.firestore();
export const auth = firebase.auth();

document.addEventListener("DOMContentLoaded", () => {
  verificarSesionExistente();

  document.getElementById("btnMainAuth")?.addEventListener("click", abrirModal);
  document.getElementById("btnGoogleAuth")?.addEventListener("click", loginConGoogle);
  document.getElementById("btnCelularAuth")?.addEventListener("click", guardarPorCelular);
});

function verificarSesionExistente() {
  auth.onAuthStateChanged((user) => {
    if (user) {
      establecerSesionActiva(user.displayName || "Cliente", user.email);
      return;
    }
  });

  const clienteGuardado = localStorage.getItem("beauty_cliente");
  if (clienteGuardado) {
    const cliente = JSON.parse(clienteGuardado);
    establecerSesionActiva(cliente.nombre, cliente.celular);
  }
}

function establecerSesionActiva(nombre, identificador) {
  const sessionBadge = document.getElementById("userSession");
  const mainBtn = document.getElementById("btnMainAuth");

  if (sessionBadge) sessionBadge.innerText = `Hola, ${nombre}`;
  if (mainBtn) {
    mainBtn.innerText = "Mi Cuenta";
    mainBtn.onclick = () => alert(`Sesión activa:\nUsuario: ${nombre}\nContacto: ${identificador}`);
  }
}

export function abrirModal() {
  const modal = document.getElementById("modalAuth");
  if (modal) modal.style.display = "flex";
}

async function loginConGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const result = await auth.signInWithPopup(provider);
    const user = result.user;
    
    document.getElementById("modalAuth").style.display = "none";

    await db.collection("usuarios").doc(user.uid).set({
      nombre: user.displayName,
      email: user.email,
      tipo: "google",
      ultimoIngreso: new Date()
    }, { merge: true });

    establecerSesionActiva(user.displayName, user.email);
  } catch (err) {
    alert("Error de autenticación con Google: " + err.message);
  }
}

async function guardarPorCelular() {
  const nombre = document.getElementById("nombreUsuario").value.trim();
  const celular = document.getElementById("celularUsuario").value.trim();

  if (!nombre || !celular) {
    alert("Por favor ingresa tu nombre y número de celular.");
    return;
  }

  const clienteData = { nombre, celular, tipo: "celular", ultimoIngreso: new Date() };

  try {
    await db.collection("usuarios").add(clienteData);
    localStorage.setItem("beauty_cliente", JSON.stringify(clienteData));
    document.getElementById("modalAuth").style.display = "none";
    establecerSesionActiva(nombre, celular);
  } catch (e) {
    localStorage.setItem("beauty_cliente", JSON.stringify(clienteData));
    document.getElementById("modalAuth").style.display = "none";
    establecerSesionActiva(nombre, celular);
  }
}
