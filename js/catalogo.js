import { db, auth } from './auth.js';

let catalogData = null;
let pages = [];
let currentPageIndex = 0;
let selectedProducts = new Map(); // Guardará los productos seleccionados { id: producto }

const PHONE_NUMBER = "593991234567"; // Número de WhatsApp de tu esposa para recibir los pedidos

document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const catalogId = urlParams.get('id');

  if (!catalogId) {
    alert("No se especificó un catálogo válido.");
    window.location.href = "index.html";
    return;
  }

  cargarDatosCatalogo(catalogId);

  document.getElementById("btnPrevPage").addEventListener("click", () => cambiarPagina(-1));
  document.getElementById("btnNextPage").addEventListener("click", () => cambiarPagina(1));
  document.getElementById("btnSendWhatsApp").addEventListener("click", enviarPedidoWhatsApp);
});

async function cargarDatosCatalogo(catalogId) {
  try {
    const doc = await db.collection("catalogos").doc(catalogId).get();
    if (!doc.exists) {
      alert("El catálogo no existe.");
      window.location.href = "index.html";
      return;
    }

    catalogData = doc.data();
    document.getElementById("catalogTitle").innerText = catalogData.nombre || "Catálogo Virtual";

    // Cargar las páginas asociadas a este catálogo
    const pagesSnapshot = await db.collection("catalogos")
      .doc(catalogId)
      .collection("paginas")
      .orderBy("numeroPagina", "asc")
      .get();

    pages = [];
    pagesSnapshot.forEach(pDoc => pages.push({ id: pDoc.id, ...pDoc.data() }));

    if (pages.length === 0) {
      document.getElementById("productsContainer").innerHTML = "<p>Este catálogo aún no tiene páginas procesadas.</p>";
      return;
    }

    renderizarPagina(0);
  } catch (error) {
    console.error("Error al cargar el catálogo:", error);
  }
}

function renderizarPagina(index) {
  if (index < 0 || index >= pages.length) return;
  currentPageIndex = index;

  const page = pages[currentPageIndex];

  // Actualizar indicador y botones
  document.getElementById("pageIndicator").innerText = `Página ${currentPageIndex + 1} de ${pages.length}`;
  document.getElementById("btnPrevPage").disabled = (currentPageIndex === 0);
  document.getElementById("btnNextPage").disabled = (currentPageIndex === pages.length - 1);

  // Actualizar imagen principal
  const imgElement = document.getElementById("catalogPageImg");
  imgElement.src = page.imageUrl || page.url;

  // Limpiar contenedores
  const hotspotsContainer = document.getElementById("hotspotsContainer");
  const productsContainer = document.getElementById("productsContainer");
  hotspotsContainer.innerHTML = "";
  productsContainer.innerHTML = "";

  const productos = page.productos || [];

  if (productos.length === 0) {
    productsContainer.innerHTML = "<p style='color:#666;'>No se detectaron productos automáticos en esta página.</p>";
    return;
  }

  // Renderizar hotspots y checkboxes
  productos.forEach((prod, pIdx) => {
    const prodId = `${page.id}_p${pIdx}`;

    // 1. Hotspot dinámico sobre la imagen si Gemini devolvió coordenadas (box_2d)
    if (prod.box_2d && prod.box_2d.length === 4) {
      const [ymin, xmin, ymax, xmax] = prod.box_2d; // Formato normalizado Gemini [0-1000]
      const hotspot = document.createElement("div");
      hotspot.className = `product-hotspot ${selectedProducts.has(prodId) ? 'selected' : ''}`;
      hotspot.style.top = `${ymin / 10}%`;
      hotspot.style.left = `${xmin / 10}%`;
      hotspot.style.width = `${(xmax - xmin) / 10}%`;
      hotspot.style.height = `${(ymax - ymin) / 10}%`;
      hotspot.onclick = () => toggleProducto(prodId, prod);
      hotspotsContainer.appendChild(hotspot);
    }

    // 2. Elemento interactivo en la lista inferior
    const item = document.createElement("div");
    item.className = "product-item";
    item.innerHTML = `
      <div class="product-info">
        <div class="product-name">${prod.nombre || 'Producto sin nombre'}</div>
        <div class="product-price">$${parseFloat(prod.precio || 0).toFixed(2)}</div>
      </div>
      <input type="checkbox" class="product-check" id="chk_${prodId}" ${selectedProducts.has(prodId) ? 'checked' : ''}>
    `;

    item.querySelector("input").addEventListener("change", () => toggleProducto(prodId, prod));
    productsContainer.appendChild(item);
  });
}

function toggleProducto(prodId, producto) {
  if (selectedProducts.has(prodId)) {
    selectedProducts.delete(prodId);
  } else {
    selectedProducts.set(prodId, producto);
  }

  // Volver a renderizar la página para refrescar hotspots y marcas
  renderizarPagina(currentPageIndex);
  actualizarBarraCarrito();
}

function actualizarBarraCarrito() {
  let total = 0;
  selectedProducts.forEach(prod => {
    total += parseFloat(prod.precio || 0);
  });

  document.getElementById("cartCount").innerText = selectedProducts.size;
  document.getElementById("cartTotal").innerText = `$${total.toFixed(2)}`;
}

function cambiarPagina(delta) {
  renderizarPagina(currentPageIndex + delta);
}

function enviarPedidoWhatsApp() {
  if (selectedProducts.size === 0) {
    alert("Por favor selecciona al menos un producto del catálogo.");
    return;
  }

  const cliente = JSON.parse(localStorage.getItem("beauty_cliente")) || { nombre: "Cliente", celular: "N/A" };
  const userAuth = auth.currentUser;
  const nombreCliente = userAuth ? userAuth.displayName : cliente.nombre;

  let mensaje = `✨ *NUEVO PEDIDO DE BEAUTY SHOP* ✨\n`;
  mensaje += `👤 *Cliente:* ${nombreCliente}\n`;
  mensaje += `📖 *Catálogo:* ${catalogData?.nombre || 'General'}\n`;
  mensaje += `-----------------------------------\n`;

  let total = 0;
  let i = 1;

  selectedProducts.forEach(prod => {
    const precio = parseFloat(prod.precio || 0);
    mensaje += `${i}. *${prod.nombre}* - $${precio.toFixed(2)}\n`;
    total += precio;
    i++;
  });

  mensaje += `-----------------------------------\n`;
  mensaje += `💰 *TOTAL PEDIDO:* $${total.toFixed(2)}\n\n`;
  mensaje += `¡Hola! Quisiera coordinar el pago y entrega de estos productos.`;

  const urlWhatsApp = `https://wa.me/${PHONE_NUMBER}?text=${encodeURIComponent(mensaje)}`;
  window.open(urlWhatsApp, "_blank");
}
