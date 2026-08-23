import { db } from './firebase-config.js';
import { collection, addDoc, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Configurar Worker de PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const getEnv = (key) => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  return '';
};

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formUploadCatalog");
  form?.addEventListener("submit", gestionarSubida);
});

async function gestionarSubida(e) {
  e.preventDefault();

  const nombreMarca = document.getElementById("nombreMarca").value.trim();
  const fileInput = document.getElementById("filePdf");
  const filePdf = fileInput.files[0];
  const btnProcesar = document.getElementById("btnProcesar");
  const statusContainer = document.getElementById("statusContainer");
  const statusMessage = document.getElementById("statusMessage");
  const progressBar = document.getElementById("progressBar");

  if (!filePdf) {
    alert("Por favor selecciona un archivo PDF.");
    return;
  }

  const imgbbApiKey = getEnv("VITE_IMGBB_API_KEY");
  if (!imgbbApiKey) {
    alert("Error: No se encontró la API Key de ImgBB en las variables de entorno.");
    return;
  }

  btnProcesar.disabled = true;
  statusContainer.style.display = "block";

  try {
    const arrayBuffer = await filePdf.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPaginas = pdfDoc.numPages;

    // 1. Crear documento principal en Firestore
    const catalogRef = await addDoc(collection(db, "catalogos"), {
      nombre: nombreMarca,
      totalPaginas: totalPaginas,
      fechaCreacion: new Date().toISOString()
    });

    // 2. Procesar cada página del PDF
    for (let pageNum = 1; pageNum <= totalPaginas; pageNum++) {
      statusMessage.innerText = `Procesando Página ${pageNum} de ${totalPaginas}...`;
      progressBar.value = Math.round(((pageNum - 1) / totalPaginas) * 100);

      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: ctx, viewport }).promise;

      // Convertir a WebP
      const webpBase64 = canvas.toDataURL("image/webp", 0.85);
      const base64Puro = webpBase64.split(',')[1];

      // 3. Subir a ImgBB
      const formData = new FormData();
      formData.append("image", base64Puro);

      const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
        method: "POST",
        body: formData
      });
      const imgbbData = await imgbbRes.json();
      const urlImagenPublica = imgbbData?.data?.url || "";

      // 4. Procesar la imagen con Gemini IA via Serverless API
      const geminiRes = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: webpBase64, numeroPagina: pageNum })
      });
      const dataIA = await geminiRes.json();

      // 5. Guardar página y productos en Firestore
      await setDoc(doc(db, "catalogos", catalogRef.id, "paginas", `pagina_${pageNum}`), {
        numeroPagina: pageNum,
        imageUrl: urlImagenPublica,
        productos: dataIA.productos || []
      });
    }

    progressBar.value = 100;
    statusMessage.innerText = "¡Catálogo procesado con éxito!";
    alert(`¡El catálogo "${nombreMarca}" se ha procesado y guardado correctamente!`);
    form.reset();

  } catch (error) {
    console.error("Error al procesar el catálogo:", error);
    alert("Ocurrió un error al procesar el catálogo: " + error.message);
  } finally {
    btnProcesar.disabled = false;
  }
}
