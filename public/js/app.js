// app.js - Lógica principal de la PWA y renderizado de Firestore

import { db, collection, getDocs } from './firebase-config.js';

const appContainer = document.getElementById('catalog-app');
let carrito = [];

// Cargar catálogo desde la colección 'campanas' de Firestore
async function cargarCatalogo() {
  try {
    appContainer.innerHTML = '<p style="text-align:center; padding: 20px;">Cargando productos...</p>';
    
    const querySnapshot = await getDocs(collection(db, "campanas"));
    
    if (querySnapshot.empty) {
      appContainer.innerHTML = `
        <div style="text-align: center; padding: 40px;">
          <h3>¡Bienvenido a tu Catálogo!</h3>
          <p style="margin-top: 10px; color: #666;">Aún no se han cargado productos con el script de IA.</p>
        </div>`;
      return;
    }

    appContainer.innerHTML = ''; // Limpiar contenedor

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      renderizarPagina(data);
    });

  } catch (error) {
    console.error("Error al cargar Firestore:", error);
    appContainer.innerHTML = '<p style="text-align:center; padding: 20px; color: red;">Error al conectar con la base de datos.</p>';
  }
}

// Renderizar la imagen del catálogo y sus overlays interactivos
function renderizarPagina(data) {
  const pageWrapper = document.createElement('div');
  pageWrapper.style.position = 'relative';
  pageWrapper.style.marginBottom = '20px';

  // Imagen cargada desde ImgBB
  const img = document.createElement('img');
  img.src = data.url_imagen_imgbb || 'https://via.placeholder.com/600x800?text=Catalogo';
  img.className = 'page-image';
  pageWrapper.appendChild(img);

  // Dibujar checkboxes si existen productos mapeados
  if (data.productos && Array.isArray(data.productos)) {
    data.productos.forEach((prod) => {
      const box = document.createElement('div');
      box.className = 'checkbox-overlay';
      
      // Coordenadas normalizadas (%)
      box.style.top = `${prod.box_2d[0]}%`;
      box.style.left = `${prod.box_2d[1]}%`;
      box.style.height = `${prod.box_2d[2] - prod.box_2d[0]}%`;
      box.style.width = `${prod.box_2d[3] - prod.box_2d[1]}%`;

      box.addEventListener('click', () => toggleProducto(prod, box));
      pageWrapper.appendChild(box);
    });
  }

  appContainer.appendChild(pageWrapper);
}

// Alternar selección de producto
function toggleProducto(producto, elemento) {
  const index = carrito.findIndex(p => p.codigo === producto.codigo);
  
  if (index > -1) {
    carrito.splice(index, 1);
    elemento.style.background = 'rgba(0, 123, 255, 0.2)';
  } else {
    carrito.push(producto);
    elemento.style.background = 'rgba(40, 167, 69, 0.6)'; // Verde seleccionado
  }
  
  console.log("Carrito actual:", carrito);
}

// Inicializar al cargar el DOM
document.addEventListener('DOMContentLoaded', cargarCatalogo);
