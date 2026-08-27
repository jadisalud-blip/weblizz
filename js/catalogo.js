import { db } from './firebase-config.js';
import { verificarSesion } from './auth.js';
import { 
  doc, getDoc, collection, addDoc, query, orderBy, getDocs 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let pages = [];
let currentPageIndex = 0;
let selectedProducts = new Map();
let clienteData = null;

document.addEventListener("DOMContentLoaded", async () => {
  const user = await verificarSesion();
  if (!user) {
    document.getElementById("modalRegistro").style.display = "flex";
    return;
  }
  clienteData = user;
  
  const urlParams = new URLSearchParams(window.location.search);
  const catalogId = urlParams.get('id');
  if (!catalogId) {
    alert("Catálogo no válido");
    window.location.href = "index.html";
    return;
  }
  await cargarDatosCatalogo(catalogId);
  
  document.getElementById("btnPrevPage").addEventListener("click", () => cambiarPagina(-1));
  document.getElementById("btnNextPage").addEventListener("click", () => cambiarPagina(1));
  document.getElementById("btnConfirmOrder").addEventListener("click", confirmarPedido);
});

async function cargarDatosCatalogo(catalogId) {
  try {
    const docSnap = await getDoc(doc(db, "catalogos", catalogId));
    if (!docSnap.exists()) {
      alert("El catálogo no existe.");
      window.location.href = "index.html";
      return;
    }
    document.getElementById("catalogTitle").innerText = docSnap.data().nombre || "Catálogo";
    
    const pagesQuery = query(collection(db, "catalogos", catalogId, "paginas"), orderBy("numeroPagina", "asc"));
    const pagesSnapshot = await getDocs(pagesQuery);
    pages = [];
    pagesSnapshot.forEach(pDoc => pages.push({ id: pDoc.id, ...pDoc.data() }));
    if (pages.length === 0) {
      document.getElementById("productsContainer").innerHTML = "<p>Sin páginas procesadas.</p>";
      return;
    }
    renderizarPagina(0);
  } catch (error) {
    console.error("Error:", error);
  }
}

function renderizarPagina(index) {
  if (index < 0 || index >= pages.length) return;
  currentPageIndex = index;
  const page = pages[currentPageIndex];
  
  document.getElementById("pageIndicator").innerText = `Página ${currentPageIndex + 1} de ${pages.length}`;
  document.getElementById("btnPrevPage").disabled = (currentPageIndex === 0);
  document.getElementById("btnNextPage").disabled = (currentPageIndex === pages.length - 1);
  
  document.getElementById("catalogPageImg").src = page.imageUrl || page.url;
  
  const hotspotsContainer = document.getElementById("hotspotsContainer");
  const productsContainer = document.getElementById("productsContainer");
  hotspotsContainer.innerHTML = "";
  productsContainer.innerHTML = "";
  
  const productos = page.productos || [];
  if (productos.length === 0) {
    productsContainer.innerHTML = "<p style='color:#666;'>No hay productos en esta página.</p>";
    return;
  }
  
  productos.forEach((prod, pIdx) => {
    const prodId = `${page.id}_p${pIdx}`;
    const selected = selectedProducts.get(prodId);
    const cantidad = selected ? selected.cantidad : 0;
    
    if (prod.box_2d && prod.box_2d.length === 4) {
      const [ymin, xmin, ymax, xmax] = prod.box_2d;
      const hotspot = document.createElement("div");
      hotspot.className = `product-hotspot ${cantidad > 0 ? 'selected' : ''}`;
      hotspot.style.top = `${ymin / 10}%`;
      hotspot.style.left = `${xmin / 10}%`;
      hotspot.style.width = `${(xmax - xmin) / 10}%`;
      hotspot.style.height = `${(ymax - ymin) / 10}%`;
      hotspot.onclick = () => toggleProducto(prodId, prod);
      hotspotsContainer.appendChild(hotspot);
    }
    
    const item = document.createElement("div");
    item.className = "product-item";
    item.innerHTML = `
      <div class="product-info">
        <div class="product-name">${prod.nombre || 'Producto'}</div>
        <div style="font-size:0.8rem;color:#94a3b8;">Código: ${prod.codigo || 'N/A'}</div>
        <div class="product-price">$${parseFloat(prod.precio || 0).toFixed(2)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <button class="btn-cantidad" data-id="${prodId}" data-action="minus">−</button>
        <span class="cantidad-num" id="cant_${prodId}">${cantidad}</span>
        <button class="btn-cantidad" data-id="${prodId}" data-action="plus">+</button>
      </div>
    `;
    item.querySelectorAll('.btn-cantidad').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        const prod = productos.find((_, idx) => `${page.id}_p${idx}` === id);
        if (prod) {
          const current = selectedProducts.get(id)?.cantidad || 0;
          const nuevaCant = action === 'plus' ? current + 1 : Math.max(0, current - 1);
          if (nuevaCant === 0) {
            selectedProducts.delete(id);
          } else {
            selectedProducts.set(id, { ...prod, cantidad: nuevaCant });
          }
          renderizarPagina(currentPageIndex);
          actualizarBarraCarrito();
        }
      });
    });
    productsContainer.appendChild(item);
  });
}

function toggleProducto(prodId, producto) {
  const selected = selectedProducts.get(prodId);
  if (selected) {
    selectedProducts.set(prodId, { ...producto, cantidad: selected.cantidad + 1 });
  } else {
    selectedProducts.set(prodId, { ...producto, cantidad: 1 });
  }
  renderizarPagina(currentPageIndex);
  actualizarBarraCarrito();
}

function actualizarBarraCarrito() {
  let total = 0, cantidad = 0;
  selectedProducts.forEach(prod => {
    total += parseFloat(prod.precio || 0) * prod.cantidad;
    cantidad += prod.cantidad;
  });
  document.getElementById("cartCount").innerText = cantidad;
  document.getElementById("cartTotal").innerText = `$${total.toFixed(2)}`;
  document.getElementById("btnConfirmOrder").disabled = cantidad === 0;
}

function cambiarPagina(delta) {
  renderizarPagina(currentPageIndex + delta);
}

async function confirmarPedido() {
  if (selectedProducts.size === 0) {
    alert("Selecciona al menos un producto.");
    return;
  }
  const productosArray = [];
  let total = 0;
  selectedProducts.forEach((prod) => {
    const precio = parseFloat(prod.precio || 0);
    productosArray.push({
      nombre: prod.nombre,
      codigo: prod.codigo || "N/A", // ✅ GUARDAMOS EL CÓDIGO
      precio: precio,
      cantidad: prod.cantidad
    });
    total += precio * prod.cantidad;
  });
  
  try {
    await addDoc(collection(db, "pedidos"), {
      clienteId: clienteData.uid || clienteData.celular || "anonimo",
      clienteNombre: clienteData.nombre || clienteData.displayName || "Cliente",
      clienteCelular: clienteData.celular || "",
      productos: productosArray,
      total: total,
      estado: "pendiente",
      fechaCreacion: new Date().toISOString()
    });
    alert(`✅ Pedido enviado! Total: $${total.toFixed(2)}`);
    selectedProducts.clear();
    renderizarPagina(currentPageIndex);
    actualizarBarraCarrito();
  } catch (error) {
    alert("❌ Error: " + error.message);
  }
}
