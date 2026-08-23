import { db, auth, abrirModal } from './auth.js';

document.addEventListener("DOMContentLoaded", () => {
  cargarCatalogosDinamicos();
});

function cargarCatalogosDinamicos() {
  const wrapper = document.getElementById("catalogsList");
  if (!wrapper) return;

  db.collection("catalogos").onSnapshot((snapshot) => {
    if (snapshot.empty) {
      wrapper.innerHTML = `
        <div class="neon-card">
          <h3>✨ Catálogos en preparación</h3>
          <p>Los nuevos catálogos subidos desde la administración aparecerán aquí automáticamente.</p>
        </div>`;
      return;
    }

    let html = "";
    snapshot.forEach((doc) => {
      const data = doc.data();
      html += `
        <div class="neon-card" data-id="${doc.id}">
          <h3>✨ ${data.nombre || 'Marca'}</h3>
          <p>${data.descripcion || 'Haz clic para explorar los productos e iniciar tu pedido.'}</p>
        </div>`;
    });

    wrapper.innerHTML = html;

    // Asignar eventos de clic a las tarjetas dinámicas
    wrapper.querySelectorAll('.neon-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-id');
        abrirCatalogo(id);
      });
    });
  });
}

function abrirCatalogo(id) {
  const clienteLocal = localStorage.getItem("beauty_cliente");
  const userFirebase = auth.currentUser;

  if (!clienteLocal && !userFirebase) {
    alert("Inicia sesión primero para acceder al catálogo.");
    abrirModal();
  } else {
    window.location.href = `catalogo.html?id=${id}`;
  }
}
