import { db, collection, addDoc } from '../js/firebase-config.js';

// Configuración de API Keys
const IMGBB_API_KEY = '5d138e2cd20043614a23b093b818f7f4';
const GEMINI_API_KEY = 'AQ.Ab8RN6J1IMK2xCCnfTQcV_oO3i06qkKPUkGujIhks8U-znPfOQ'; 

// Función para manejar pausas de tiempo
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 1. Subida obligatoria de la imagen de la página a ImgBB
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
 * 2. Análisis obligatorio con Gemini IA usando X-goog-api-key
 * No sale del bucle hasta obtener respuesta válida de coordenadas.
 */
async function analizarConGeminiObligatorio(base64Image, numeroPagina) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`;
  
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

  let exito = false;
  let intentos = 0;
  let productos = [];

  while (!exito) {
    intentos++;
    try {
      console.log(`[Pág ${numeroPagina}] Pidiendo coordenadas a Gemini (Intento ${intentos})...`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-goog-api-key': GEMINI_API_KEY
        },
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
      exito = true;
      console.log(`[Pág ${numeroPagina}] Coordenadas obtenidas correctamente (${productos.length} productos).`);

    } catch (error) {
      console.warn(`[Pág ${numeroPagina}] Error en Gemini: ${error.message}. Reintentando en 4s...`);
      await delay(4000);
    }
  }

  return productos;
}

/**
 * 3. Proceso principal secuencial por Campaña y Fecha
 */
export async function procesarPaginaCatalogo(numeroPagina, base64Image, nombreCampana = "Campaña C09") {
  console.log(`\n=== PROCESANDO PÁGINA ${numeroPagina} ===`);
  
  // Paso A: Subir Imagen
  const urlImagen = await subirAImgBB(base64Image, numeroPagina);

  // Paso B: Obtener Coordenadas (Bloqueante hasta éxito)
  const productos = await analizarConGeminiObligatorio(base64Image, numeroPagina);

  // Paso C: Guardar en Firestore con fecha e identificador de campaña
  await addDoc(collection(db, "campanas"), {
    campana_id: nombreCampana,
    numero_pagina: numeroPagina,
    url_imagen_imgbb: urlImagen,
    productos: productos,
    creado_el: new Date().toISOString()
  });

  console.log(`=== PÁGINA ${numeroPagina} GUARDADA EXITOSAMENTE EN FIRESTORE ===\n`);
  
  // Pausa de 2.5 segundos para evitar límites de tasa (Rate Limit) entre páginas
  await delay(2500);
}
