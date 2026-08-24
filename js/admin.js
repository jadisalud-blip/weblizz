import { db } from './firebase-config.js';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// Configuración de PDF.js Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const formUploadCatalog = document.getElementById('formUploadCatalog');
const nombreMarcaInput = document.getElementById('nombreMarca');
const filePdfInput = document.getElementById('filePdf');
const btnProcesar = document.getElementById('btnProcesar');
const statusContainer = document.getElementById('statusContainer');
const statusMessage = document.getElementById('statusMessage');
const progressBar = document.getElementById('progressBar');

formUploadCatalog.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nombreMarca = nombreMarcaInput.value.trim();
  const file = filePdfInput.files[0];

  if (!nombreMarca || !file) {
    alert('Por favor, ingresa el nombre de la marca y selecciona un archivo PDF.');
    return;
  }

  btnProcesar.disabled = true;
  statusContainer.style.display = 'block';
  statusMessage.innerText = 'Cargando archivo PDF...';
  progressBar.value = 0;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;

    const paginasGuardadas = [];

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      statusMessage.innerText = `Procesando Página ${pageNum} de ${totalPages}...`;
      progressBar.value = Math.round((pageNum / totalPages) * 100);

      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport: viewport }).promise;

      // Convertir página a imagen Blob (WebP)
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.8));

      // Subida de imagen a ImgBB
      const formData = new FormData();
      formData.append('image', blob);

      // Reemplaza YOUR_IMGBB_API_KEY por tu API key de ImgBB
      const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=YOUR_IMGBB_API_KEY`, {
        method: 'POST',
        body: formData
      });
      const imgbbData = await imgbbRes.json();

      const imageUrl = imgbbData.data ? imgbbData.data.url : '';

      paginasGuardadas.push({
        numeroPagina: pageNum,
        imagenUrl: imageUrl
      });
    }

    statusMessage.innerText = 'Guardando datos del catálogo en Firestore...';

    // Guardar catálogo en Firestore
    await addDoc(collection(db, 'catalogos'), {
      marca: nombreMarca,
      totalPaginas: totalPages,
      paginas: paginasGuardadas,
      createdAt: serverTimestamp()
    });

    statusMessage.innerText = '¡Catálogo cargado y procesado con éxito!';
    alert('¡Catálogo procesado y guardado correctamente!');
    formUploadCatalog.reset();

  } catch (error) {
    console.error(error);
    alert(`Ocurrió un error al procesar el catálogo: ${error.message}`);
  } finally {
    btnProcesar.disabled = false;
  }
});
