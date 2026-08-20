import { db, collection, addDoc } from '../js/firebase-config.js';

const IMGBB_API_KEY = '5d138e2cd20043614a23b093b818f7f4';
// Asegúrate de pegar aquí tu API Key real de Gemini (la que empieza por AIzaSy...)
const GEMINI_API_KEY = 'AQ.Ab8RN6JlIMK2xCCnfTQcV_oO3i06qkKPUkGujIhks8U-znPfOQ'; 

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 1. Subida obligatoria a ImgBB
async function subirAImgBB(base64Image, numeroPagina) {
  const formData = new FormData();
  formData.append('image', base64Image);
  formData.append('name', `pagina_${numeroPagina}`);

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: 'POST',
    body: formData
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(`Error ImgBB en Pág ${numeroPagina}: ${data.error ? data.error.message : 'Fallo de subida'}`);
  }
  return data.data.url;
}

// 2. Análisis obligatorio con Gemini (Reintento estricto)
async function analizarConGeminiObligatorio(base64Image, numeroPagina) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const prompt = `Analiza esta imagen de catálogo comercial.
Identifica todos los productos visibles con su código, precio y coordenadas 2D [ymin, xmin, ymax, xmax] en porcentajes (0 a 100).
Responde EXCLUSIVAMENTE en formato JSON:
{
  "productos": [
    {
      "codigo": "12345",
      "nombre": "Producto",
      "precio": 25.00,
      "box_2d": [10, 15, 40, 50]
    }
  ]
}`;

  const payload = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: "image/jpeg", data: base64Image } }
      ]
    }],
    generationConfig: { response_mime_type: "application/json" }
  };

  let exito = false;
  let intentos = 0;
  let productos = [];

  // Bucle de reintento: NO AVANZA hasta obtener respuesta válida de Gemini
  while (!exito) {
    intentos++;
    try {
      console.log(`[Pág ${numeroPagina}] Enviando a Gemini IA (Intento ${intentos})...`);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(`HTTP ${response.status}: ${errData.error ? errData.error.message : response.statusText}`);
      }

      const result = await response.json();
      const textResponse = result.candidates[0].content.parts[0].text;
      const jsonParsed = JSON.parse(textResponse);

      productos = jsonParsed.productos || [];
      exito = true; // Solo si se procesa el JSON correctamente salimos del bucle
      console.log(`[Pág ${numeroPagina}] Coordenadas obtenidas con éxito (${productos.length} productos).`);

    } catch (error) {
      console.warn(`[Pág ${numeroPagina}] Fallo en Gemini IA: ${error.message}. Reintentando en 4 segundos...`);
      await delay(4000); // Espera antes de volver a intentar la MISMA página
    }
  }

  return productos;
}

// 3. Proceso estricto en orden secuencial
export async function procesarPaginaCatalogo(numeroPagina, base64Image) {
  // Paso A: Subir imagen
  console.log(`\n=== INICIANDO PÁGINA ${numeroPagina} ===`);
  const urlImagen = await subirAImgBB(base64Image, numeroPagina);

  // Paso B: Obtener Coordenadas de Gemini (Bloqueante hasta tener éxito)
  const productos = await analizarConGeminiObligatorio(base64Image, numeroPagina);

  // Paso C: Guardar en Firestore solo cuando tenemos imagen + coordenadas
  await addDoc(collection(db, "campanas"), {
    numero_pagina: numeroPagina,
    url_imagen_imgbb: urlImagen,
    productos: productos,
    creado_el: new Date().toISOString()
  });

  console.log(`=== PÁGINA ${numeroPagina} GUARDADA Y COMPLETADA ===\n`);
  
  // Pausa de cortesía entre páginas
  await delay(2000);
}
