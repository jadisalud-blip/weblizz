import { db, collection, addDoc } from '../js/firebase-config.js';

// Configuración de API Keys
const IMGBB_API_KEY = '5d138e2cd20043614a23b093b818f7f4';

// Clave API exacta de tu proyecto
const GEMINI_API_KEY = 'AQ.Ab8RN6LG2qNRUcrOAYISpGwMSOzUbLVwm27OqO6u3sP8oPBduQ';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 1. Subida de la imagen a ImgBB
 */
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

/**
 * 2. Análisis con Gemini IA usando el endpoint con parámetro key
 */
async function analizarConGeminiObligatorio(base64Image, numeroPagina) {
  // Se incluye la clave AQ... directamente en el parámetro ?key= del endpoint oficial de Google
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const prompt = `Analiza esta página de catálogo comercial.
Identifica todos los productos visibles y extrae su código, nombre, precio y sus coordenadas 2D en porcentaje (0 a 100) con la estructura [ymin, xmin, ymax, xmax].
Responde ÚNICAMENTE en JSON válido con este formato:
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

  const MAX_INTENTOS = 3;
  let intentos = 0;

  while (intentos < MAX_INTENTOS) {
    intentos++;
    try {
      console.log(`[Pág ${numeroPagina}] Pidiendo coordenadas a Gemini (Intento ${intentos}/${MAX_INTENTOS})...`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const mensajeError = errData.error ? errData.error.message : response.statusText;
        throw new Error(`HTTP ${response.status}: ${mensajeError}`);
      }

      const result = await response.json();
      const textResponse = result.candidates[0].content.parts[0].text;
      const jsonParsed = JSON.parse(textResponse);

      console.log(`[Pág ${numeroPagina}] Coordenadas obtenidas correctamente.`);
      return jsonParsed.productos || [];

    } catch (error) {
      console.error(`[Pág ${numeroPagina}] Error en Gemini: ${error.message}`);
      if (intentos === MAX_INTENTOS) {
        throw new Error(`Gemini falló tras ${MAX_INTENTOS} intentos. Causa: ${error.message}`);
      }
      await delay(3000);
    }
  }
}

/**
 * 3. Proceso principal
 */
export async function procesarPaginaCatalogo(numeroPagina, base64Image, nombreCampana = "Campaña C09") {
  console.log(`\n=== PROCESANDO PÁGINA ${numeroPagina} ===`);

  const urlImagen = await subirAImgBB(base64Image, numeroPagina);
  const productos = await analizarConGeminiObligatorio(base64Image, numeroPagina);

  await addDoc(collection(db, "campanas"), {
    campana_id: nombreCampana,
    numero_pagina: numeroPagina,
    url_imagen_imgbb: urlImagen,
    productos: productos,
    creado_el: new Date().toISOString()
  });

  console.log(`=== PÁGINA ${numeroPagina} GUARDADA EXITOSAMENTE EN FIRESTORE ===\n`);
  await delay(2500);
}
