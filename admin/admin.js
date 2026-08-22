export async function procesarArchivoAdmin(file, marca, logCallback) {
  if (file.type === 'application/pdf') {
    logCallback('📄 Leyendo archivo PDF...');

    const fileReader = new FileReader();
    fileReader.onload = async function() {
      try {
        const typedarray = new Uint8Array(this.result);
        const pdf = await pdfjsLib.getDocument(typedarray).promise;

        logCallback(`Total de páginas detectadas: ${pdf.numPages}`);

        for (let numPagina = 1; numPagina <= pdf.numPages; numPagina++) {
          logCallback(`\n--- Procesando Página ${numPagina} de ${pdf.numPages} ---`);
          const page = await pdf.getPage(numPagina);
          const viewport = page.getViewport({ scale: 1.5 });

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({ canvasContext: context, viewport: viewport }).promise;

          const base64Image = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
          await procesarPaginaIndividual(base64Image, marca, numPagina, logCallback);
        }

        logCallback('\n🎉 ¡Catálogo PDF procesado exitosamente!');
      } catch (err) {
        logCallback(`❌ Error leyendo PDF: ${err.message}`);
      }
    };
    fileReader.readAsArrayBuffer(file);

  } else {
    logCallback('🖼️ Procesando imagen individual...');
    const reader = new FileReader();
    reader.onload = async function() {
      const base64Image = reader.result.split(',')[1];
      await procesarPaginaIndividual(base64Image, marca, 1, logCallback);
      logCallback('\n🎉 ¡Página publicada!');
    };
    reader.readAsDataURL(file);
  }
}

async function procesarPaginaIndividual(base64Image, marca, numPagina, logCallback) {
  logCallback(`[Pág ${numPagina}] 1. Subiendo imagen a ImgBB...`);
  const resImg = await fetch('/api/imgbb', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Image })
  });
  const dataImg = await resImg.json();

  if (!dataImg.data || !dataImg.data.url) {
    throw new Error(`Error en ImgBB para página ${numPagina}`);
  }

  logCallback(`[Pág ${numPagina}] 2. Analizando productos con Gemini...`);
  const prompt = "Analiza esta página. Devuelve JSON con productos, precios y coordenadas 'box_2d': [ymin, xmin, ymax, xmax]";

  const resGemini = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Image, prompt })
  });

  const dataGemini = await resGemini.json();
  logCallback(`[Pág ${numPagina}] ✅ Completado.`);
}
