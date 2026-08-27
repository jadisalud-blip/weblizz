import { db, auth } from './firebase-config.js';
import { verificarSesion, esVendedor } from './auth.js';
import { 
  collection, addDoc, doc, setDoc, getDocs, query, orderBy, updateDoc, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let catalogIdActual = null;
let pedidosListener = null;

document.addEventListener("DOMContentLoaded", async () => {
  const user = await verificarSesion();
  if (!user || !(await esVendedor(user))) {
    alert("Acceso denegado. Solo vendedores.");
    window.location.href = "index.html";
    return;
  }
  cargarPedidos();
  document.getElementById("btnProcesar").addEventListener("click", procesarCatalogo);
  document.getElementById("btnRefreshPedidos").addEventListener("click", cargarPedidos);
  document.getElementById("tabSubir").addEventListener("click", () => mostrarTab("subir"));
  document.getElementById("tabPedidos").addEventListener("click", () => mostrarTab("pedidos"));
});

function mostrarTab(tab) {
  document.getElementById("tabSubir").classList.toggle("active", tab === "subir");
  document.getElementById("tabPedidos").classList.toggle("active", tab === "pedidos");
  document.getElementById("panelSubir").style.display = tab === "subir" ? "block" : "none";
  document.getElementById("panelPedidos").style.display = tab === "pedidos" ? "block" : "none";
  if (tab === "pedidos") cargarPedidos();
}

function logStatus(msg) {
  document.getElementById('status-console').innerHTML += `\n> ${msg}`;
  document.getElementById('status-console').scrollTop = document.getElementById('status-console').scrollHeight;
}

async function procesarCatalogo() {
  const fileInput = document.getElementById('pdfInput');
  const catalogName = document.getElementById('catalogName').value.trim();
  if (!fileInput.files[0] || !catalogName) {
    alert("Selecciona PDF y escribe un nombre.");
    return;
  }

  const btn = document.getElementById('btnProcesar');
  btn.disabled = true;
  document.getElementById('status-console').innerHTML = "";

  try {
    const file = fileInput.files[0];
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;
    logStatus(`📄 PDF: ${totalPages} páginas`);

    const catalogRef = await addDoc(collection(db, "catalogos"), {
      nombre: catalogName,
      descripcion: `Subido ${new Date().toLocaleDateString()}`,
      totalPaginas: totalPages,
      fechaCreacion: new Date().toISOString()
    });
    catalogIdActual = catalogRef.id;

    for (let i = 1; i <= totalPages; i++) {
      logStatus(`📌 Procesando página ${i}/${totalPages}...`);
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await page.render({ canvasContext: context, viewport }).promise;
      
      const base64Image = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
      document.getElementById('imageContainer').innerHTML = `<img src="${canvas.toDataURL()}" style="max-width:100%;">`;

      logStatus(`  📤 Subiendo a ImgBB...`);
      const imgbbRes = await fetch('/api/imgbb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Image })
      });
      const imgbbData = await imgbbRes.json();
      if (!imgbbData.data?.url) throw new Error("Error en ImgBB");
      const imageUrl = imgbbData.data.url;

      logStatus(`  🤖 Analizando con Gemini...`);
      
      // ✅ PROMPT MEJORADO - OBTIENE CÓDIGO DEL PRODUCTO
      const prompt = `
Analiza ESTA PÁGINA de un catálogo comercial de productos de belleza.

EXTRACCIÓN OBLIGATORIA:
1. Para CADA producto en la página, DEBES extraer:
   - "nombre": Nombre completo del producto.
   - "codigo": El CÓDIGO o REFERENCIA del producto (ej: "525", "YX-789", "REF-123"). 
     * Busca números o códigos cerca del nombre, en la descripción o en la imagen.
     * Si no encuentras un código claro, usa "N/A".
   - "precio": Precio del producto (solo el número, sin símbolos, ej: 25.99).
   - "ficha_tecnica": Descripción corta (ej: "Perfume floral, 50ml, nota de salida...")
   - "box_2d": Coordenadas [ymin, xmin, ymax, xmax] (valores 0-1000) donde está el producto en la imagen.

2. El código del producto es IMPORTANTE para el sistema de pedidos. ¡NO LO OMITAS!

FORMATO DE RESPUESTA (ÚNICAMENTE JSON):
{
  "productos": [
    {
      "nombre": "Perfume Flor de Luna",
      "codigo": "525",
      "precio": 45.99,
      "ficha_tecnica": "Perfume floral con notas de jazmín y vainilla. 50ml.",
      "box_2d": [200, 150, 400, 350]
    },
    {
      "nombre": "Crema Hidratante",
      "codigo": "789",
      "precio": 29.99,
      "ficha_tecnica": "Crema hidratante con ácido hialurónico. 100ml.",
      "box_2d": [450, 200, 650, 400]
    }
  ]
}

¡SOLO DEVUELVE EL JSON! No agregues texto adicional ni explicaciones.
`;

      const geminiRes = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Image, prompt })
      });
      const geminiData = await geminiRes.json();
      const textRaw = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const cleanJsonText = textRaw.replace(/```json/gi, '').replace(/```/g, '').trim();
      let parsed = { productos: [] };
      try { parsed = JSON.parse(cleanJsonText); } catch (err) { logStatus(`  ⚠️ Error parseando JSON`); }
      
      const productos = parsed.productos || [];
      logStatus(`  📦 ${productos.length} productos detectados`);

      // ✅ MOSTRAR CÓDIGO EN LA VISTA PREVIA
      let html = `<h4>Página ${i} - ${productos.length} productos</h4>`;
      productos.forEach(p => {
        html += `
          <div style="background:#0f172a;padding:5px;margin:4px 0;border-left:3px solid #ff007f;">
            <b>${p.nombre || 'Sin nombre'}</b><br>
            <span style="color:#94a3b8;font-size:0.85rem;">
              Código: <b style="color:#f8fafc;">${p.codigo || 'N/A'}</b> 
              | Precio: <b style="color:#4ade80;">$${p.precio || 0}</b>
            </span>
          </div>
        `;
      });
      document.getElementById('fichasContainer').innerHTML = html;

      // ✅ GUARDAR EN FIRESTORE CON CÓDIGO
      const pageRef = doc(collection(db, "catalogos", catalogIdActual, "paginas"));
      await setDoc(pageRef, {
        numeroPagina: i,
        imageUrl: imageUrl,
        productos: productos, // Aquí se guarda el campo "codigo"
        fechaProcesamiento: new Date().toISOString()
      });
      logStatus(`  ✅ Página ${i} guardada`);
    }
    logStatus(`🎉 ¡Catálogo completado!`);
  } catch (err) {
    logStatus(`❌ Error: ${err.message}`);
  } finally {
    btn.disabled = false;
  }
}

function cargarPedidos() {
  const container = document.getElementById('pedidosContainer');
  container.innerHTML = '<p>Cargando pedidos...</p>';
  if (pedidosListener) pedidosListener();
  
  pedidosListener = onSnapshot(
    query(collection(db, "pedidos"), orderBy("fechaCreacion", "desc")),
    (snapshot) => {
      if (snapshot.empty) {
        container.innerHTML = '<div style="text-align:center;color:#666;padding:40px;"><h3>📭 Sin pedidos</h3></div>';
        return;
      }
      let html = `<div style="display:grid;gap:10px;">`;
      snapshot.forEach((doc) => {
        const p = doc.data();
        const id = doc.id;
        const estado = p.estado || "pendiente";
        const colores = { pendiente: '#f59e0b', en_proceso: '#3b82f6', entregado: '#22c55e', cancelado: '#ef4444' };
        
        // ✅ MOSTRAR CÓDIGOS EN EL PEDIDO
        let productosHtml = p.productos?.map(prod => 
          `${prod.nombre} (Cód: ${prod.codigo || 'N/A'}) x${prod.cantidad}`
        ).join(', ') || 'Sin productos';
        
        html += `
          <div style="background:#0f172a;padding:12px;border-radius:6px;border:1px solid #334155;">
            <div style="display:flex;justify-content:space-between;">
              <span><b>#${id.substring(0,6)}</b> - ${p.clienteNombre}</span>
              <span style="color:${colores[estado]};">${estado.toUpperCase()}</span>
            </div>
            <div style="font-size:0.85rem;color:#94a3b8;margin:5px 0;">
              ${productosHtml}
            </div>
            <div style="font-size:0.9rem;">💰 $${(p.total || 0).toFixed(2)}</div>
            <div style="display:flex;gap:10px;margin-top:8px;flex-wrap:wrap;">
              <select class="estado-select" data-id="${id}" style="background:#1e293b;color:white;border:1px solid #475569;border-radius:4px;padding:4px;">
                <option value="pendiente" ${estado==='pendiente'?'selected':''}>Pendiente</option>
                <option value="en_proceso" ${estado==='en_proceso'?'selected':''}>En proceso</option>
                <option value="entregado" ${estado==='entregado'?'selected':''}>Entregado</option>
                <option value="cancelado" ${estado==='cancelado'?'selected':''}>Cancelado</option>
              </select>
              <button class="btn-whatsapp" data-celular="${p.clienteCelular || ''}" data-mensaje="${encodeURIComponent(`Hola ${p.clienteNombre}, tu pedido #${id} está ${estado}. Total: $${(p.total||0).toFixed(2)}`)}" style="background:#25D366;color:white;border:none;border-radius:4px;padding:4px 12px;cursor:pointer;">💬 Contactar</button>
            </div>
          </div>`;
      });
      html += '</div>';
      container.innerHTML = html;

      container.querySelectorAll('.estado-select').forEach(select => {
        select.addEventListener('change', async (e) => {
          await updateDoc(doc(db, "pedidos", e.target.dataset.id), { estado: e.target.value, fechaActualizacion: new Date().toISOString() });
        });
      });
      container.querySelectorAll('.btn-whatsapp').forEach(btn => {
        btn.addEventListener('click', () => {
          if (btn.dataset.celular) {
            window.open(`https://wa.me/${btn.dataset.celular}?text=${btn.dataset.mensaje}`, "_blank");
          } else {
            alert("Cliente sin celular registrado.");
          }
        });
      });
    }
  );
}
