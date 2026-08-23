import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", cargarCatalogos);

async function cargarCatalogos() {
  const grid = document.getElementById("catalogGrid");
  try {
    const querySnapshot = await getDocs(collection(db, "catalogos"));
    grid.innerHTML = "";

    if (querySnapshot.empty) {
      grid.innerHTML = `<p style="color: var(--text-muted);">No hay catálogos activos por ahora.</p>`;
      return;
    }

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const item = document.createElement("div");
      item.className = "catalog-item";
      item.innerHTML = `
        <h3 style="margin-bottom: 0.5rem;">${data.nombre}</h3>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1rem;">Total Páginas: ${data.totalPaginas}</p>
        <a href="catalogo.html?id=${doc.id}" class="btn-main">Ver Catálogo</a>
      `;
      grid.appendChild(item);
    });
  } catch (error) {
    console.error("Error al cargar catálogos:", error);
    grid.innerHTML = `<p style="color: red;">Error al cargar datos.</p>`;
  }
}
