import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const params = new URLSearchParams(window.location.search);
const catalogId = params.get("id");

let paginaActual = 1;
let totalPaginas = 1;
let carrito = [];

document.addEventListener("DOMContentLoaded", async () => {
  if (!catalogId) {
    alert("Catálogo no especificado.");
    window.location.href = "index.html";
    return;
  }

  await cargarInfoCatalogo();
  await cargarPagina(paginaActual);

  document.getElementById("btnPrevPage")?.addEventListener("click", () => {
    if (paginaActual > 1) {
      paginaActual--;
      cargarPagina(paginaActual);
    }
  });

  document.getElementById("btnNextPage")?.addEventListener("click", () => {
    if (paginaActual < totalPaginas) {
      paginaActual++;
      cargarPagina(paginaActual);
    }
  });

  document.getElementById("btnSendWhatsapp")?.addEventListener("click", enviarPedidoWhatsApp);
});

async function cargarInfoCatalogo() {
  const catRef = doc(db, "catalogos", catalogId);
  const catSnap = await getDoc(catRef);
  if (catSnap.exists()) {
    const data = catSnap.data();
    document.getElementById("catalogTitle").innerText = data.nombre;
    totalPaginas = data.totalPaginas;
  }
}

async function cargarPagina(numPage) {
  document.getElementById("pageIndicator").innerText = `Página ${numPage} de ${totalPaginas}`;
  const pagRef = doc(db, "catalogos", catalogId, "paginas", `pagina_${numPage}`);
  const pagSnap = await getDoc(pagRef);

  if (!pagSnap.exists()) return;

  const data = pagSnap.data();
  const imgEl = document.getElementById("catalogPageImage");
  const hotspotsOverlay = document.getElementById("hotspotsOverlay");

  imgEl.src = data.imageUrl;
  hotspotsOverlay.innerHTML = "";

  (data.productos || []).forEach((prod, index) => {
    if (!prod.box_2d) return;

    // Convertir coordenadas [ymin, xmin, ymax, xmax] normalizadas (0-1000) a %
    const topPct = (prod.box_2d[0] / 1000) * 100;
    const leftPct = (prod.box_2d[1] / 1000) * 100;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "hotspot-checkbox";
    checkbox.style.top = `${topPct}%`;
    checkbox.style.left = `${leftPct}%`;

    // Si ya fue seleccionado, mantener marcado
    if (carrito.some(item => item.codigo === prod.codigo && item.nombre === prod.nombre)) {
      checkbox.checked = true;
    }

    checkbox.addEventListener("change", (e) => {
      if (e.target.checked) {
        carrito.push(prod);
      } else {
        carrito = carrito.filter(item => !(item.codigo === prod.codigo && item.nombre === prod.nombre));
      }
      actualizarResumenCarrito();
    });

    hotspotsOverlay.appendChild(checkbox);
  });
}

function actualizarResumenCarrito() {
  const total = carrito.reduce((acc, p) => acc + (parseFloat(p.precio) || 0), 0);
  document.getElementById("orderTotal").innerText = `$${total.toFixed(2)}`;
  document.getElementById("itemCount").innerText = carrito.length;
}

function enviarPedidoWhatsApp() {
  if (carrito.length === 0) {
    alert("Selecciona al menos un producto haciendo clic en las casillas del catálogo.");
    return;
  }

  let mensaje = "¡Hola! Quisiera realizar el siguiente pedido de la tienda:\n\n";
  let total = 0;

  carrito.forEach((p, idx) => {
    const precio = parseFloat(p.precio) || 0;
    total += precio;
    mensaje += `${idx + 1}. *${p.nombre}*\n`;
    mensaje += `   • Pág: ${p.pagina} | Cód: ${p.codigo}\n`;
    if (p.fichaTecnica && p.fichaTecnica !== 'N/A') {
      mensaje += `   • Ficha: ${p.fichaTecnica}\n`;
    }
    mensaje += `   • Precio: $${precio.toFixed(2)}\n\n`;
  });

  mensaje += `*TOTAL ESTIMADO: $${total.toFixed(2)}*`;

  // Número de WhatsApp del negocio (Reemplazar con el tuyo/de tu esposa)
  const telefonoNegocio = "593900000000"; 
  const urlWhatsapp = `https://wa.me/${telefonoNegocio}?text=${encodeURIComponent(mensaje)}`;
  
  window.open(urlWhatsapp, "_blank");
}
