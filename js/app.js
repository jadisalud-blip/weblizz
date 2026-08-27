import { db, auth } from './firebase-config.js';
import { verificarSesion, esVendedor } from './auth.js';
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  const user = await verificarSesion();
  if (user) {
    const esVend = await esVendedor(user);
    if (esVend) {
      document.querySelector(".user-badge").innerHTML = `
        <span>👑 Vendedora</span>
        <a href="/admin.html" style="color:#ff007f;margin-left:10px;">Panel Admin</a>
      `;
    } else {
      document.querySelector(".user-badge").innerHTML = `Hola, ${user.nombre || user.displayName || "Cliente"}`;
    }
  }
  cargarCatalogosDinamicos();
});

function cargarCatalogosDinamicos() {
  const wrapper = document.getElementById("catalogsList");
  if (!wrapper) return;

  onSnapshot(collection(db, "catalogos"), (snapshot) => {
    if (snapshot.empty) {
      wrapper.innerHTML = `<div class="neon-card"><h3>📚 Sin catálogos</h3><p>No hay catálogos disponibles.</p></div>`;
      return;
    }
    let html = "";
    snapshot.forEach((doc) => {
      const data = doc.data();
      html += `
        <div class="neon-card" data-id="${doc.id}">
          <h3>✨ ${data.nombre || 'Catálogo'}</h3>
          <p>${data.descripcion || 'Haz clic para explorar.'}</p>
        </div>`;
    });
    wrapper.innerHTML = html;
    wrapper.querySelectorAll('.neon-card').forEach(card => {
      card.addEventListener('click', () => {
        window.location.href = `catalogo.html?id=${card.dataset.id}`;
      });
    });
  });
}
