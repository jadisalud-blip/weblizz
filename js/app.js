import { db, collection, getDocs } from './firebase-config.js';

const appContainer = document.getElementById('catalog-app');
let carrito = [];

async function cargarCatalogo() {
  try {
    const querySnapshot = await getDocs(collection(db, "campanas"));
    
    if (querySnapshot.empty) {
      appContainer.innerHTML = `
        <div style="text-align: center; padding: 40px;">
          <h3>¡Bienvenido a tu Catálogo!</h3>
          <p style="margin-top: 10px; color: #666;">Aún no hay productos subidos en Firestore. Ejecuta el script de ingesta para subir tu primer PDF.</p>
        </div>`;
      return;
    }

    appContainer.innerHTML = '';

    querySnapshot.forEach((doc) => {
      renderizarPagina(doc.data());
    });

  } catch (error) {
    console.error("Error al cargar Firestore:", error);
    appContainer.innerHTML = '<p style="text-align:center; padding: 20px; color: red;">Error al conectar con la base de datos.</p>';
  }
}

function renderizarPagina(data) {
  const pageWrapper = document.createElement('div');
  pageWrapper.style.position = 'relative';
  pageWrapper.style.marginBottom = '20px';

  const img = document.createElement('img');
  img.src = data.url_imagen_imgbb || 'https://via.placeholder.com/600x800?text=Catalogo';
  img.className = 'page-image';
  pageWrapper.appendChild(img);

  if (data.productos && Array.isArray(data.productos)) {
    data.productos.forEach((prod) => {
      const box = document.createElement('div');
      box.className = 'checkbox-overlay';
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

function toggleProducto(producto, elemento) {
  const index = carrito.findIndex(p => p.codigo === producto.codigo);
  if (index > -1) {
    carrito.splice(index, 1);
    elemento.style.background = 'rgba(0, 123, 255, 0.2)';
  } else {
    carrito.push(producto);
    elemento.style.background = 'rgba(40, 167, 69, 0.6)';
  }
}

document.addEventListener('DOMContentLoaded', cargarCatalogo);
