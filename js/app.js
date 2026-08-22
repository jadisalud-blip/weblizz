let carrito = [];
let productoSeleccionado = null;

function seleccionarProducto(codigo, nombre, precio) {
  productoSeleccionado = { codigo, nombre, precio };
  document.getElementById('modal-title').innerText = nombre;
  document.getElementById('modal-code').innerText = `Código: ${codigo}`;
  document.getElementById('modal-price').innerText = `$${precio.toFixed(2)}`;
  document.getElementById('modal-product').style.display = 'flex';
}

function cerrarModal() {
  document.getElementById('modal-product').style.display = 'none';
}

function agregarAlCarrito() {
  if (productoSeleccionado) {
    carrito.push(productoSeleccionado);
    document.getElementById('cart-count').innerText = carrito.length;
    cerrarModal();
    alert('✅ Producto añadido al carrito.');
  }
}

function verCarrito() {
  if (carrito.length === 0) {
    alert('El carrito está vacío.');
    return;
  }

  let texto = '🛍️ *MI PEDIDO DE CATÁLOGO*\n\n';
  let total = 0;

  carrito.forEach((p, idx) => {
    texto += `${idx + 1}. [${p.codigo}] ${p.nombre} - $${p.precio.toFixed(2)}\n`;
    total += p.precio;
  });

  texto += `\n*TOTAL ESTIMADO:* $${total.toFixed(2)}`;
  
  const numeroWhatsApp = '593900000000'; // Reemplazar con el número oficial
  const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(texto)}`;
  
  window.open(urlWhatsApp, '_blank');
}

window.seleccionarProducto = seleccionarProducto;
window.cerrarModal = cerrarModal;
window.agregarAlCarrito = agregarAlCarrito;
window.verCarrito = verCarrito;
