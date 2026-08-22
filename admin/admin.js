export async function procesarImagenAdmin(base64Image, marca) {
  console.log('1. Subiendo imagen a ImgBB vía Backend...');
  const resImg = await fetch('/api/imgbb', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Image })
  });
  const dataImg = await resImg.json();

  if (!dataImg.data || !dataImg.data.url) {
    throw new Error('Error al subir imagen a ImgBB');
  }

  console.log('2. Extrayendo datos con Gemini...');
  const prompt = "Analiza esta página. Devuelve JSON con productos, precios y coordenadas 'box_2d': [ymin, xmin, ymax, xmax]";
  
  const resGemini = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Image, prompt })
  });

  const dataGemini = await resGemini.json();
  
  return {
    urlImagen: dataImg.data.url,
    analisis: dataGemini,
    marca: marca
  };
}
