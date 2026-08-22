export async function procesarArchivoAdmin(file, marca, logCallback) {
  if (file.type === 'application/pdf') {
    logCallback('📄 PDF detectado. Extrayendo páginas...');
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    logCallback(`Total de páginas encontradas: ${pdf.numPages}`);

    for (let numPagina = 1; numPagina <= pdf.numPages; numPagina++) {
      logCallback(`\n--- Procesando Página ${numPagina} de ${pdf.numPages} ---`);
      const page = await pdf.getPage(numPagina);
      const viewport = page.getViewport({ scale: 1.5 });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport: viewport }).promise;
      
      // Convertir página PDF a Base64 JPG
      const base64Image = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
      
      await procesarPaginaIndividual(base64Image, marca, numPagina, logCallback);
    }
    logCallback('\n🎉 ¡Catálogo PDF procesado y publicado por completo!');
  } else {
    // Si es una sola imagen
    logCallback('🖼️ Imagen individual detectada...');
    const reader = new FileReader();
    reader.onload = async function() {
      const base64Image = reader.result.split(',')[1];
      await procesarPaginaIndividual(base64Image, marca, 1, logCallback);
      logCallback('\n🎉 ¡Página publicada correctamente!');
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
    throw new Error(`Error al subir la página ${numPagina} a ImgBB`);
  }

  logCallback(`[Pág ${numPagina}] 2. Analizando productos con Gemini...`);
  const prompt = "Analiza esta página. Devuelve JSON con productos, precios y coordenadas 'box_2d': [ymin, xmin, ymax, xmax]";

  const resGemini = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Image, prompt })
  });

  const dataGemini = await resGemini.json();
  logCallback(`[Pág ${numPagina}] ✅ Procesada exitosamente.`);
}
