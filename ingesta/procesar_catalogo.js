import { db, collection, addDoc } from '../js/firebase-config.js';

// Configuración de API Keys proporcionadas
const IMGBB_API_KEY = '5d138e2cd20043614a23b093b818f7f4';
const GEMINI_API_KEY = 'AQ.Ab8RN6JWVg044Rf1A5AorOtWfmecJgjbWNJ9FTfj8Suy0uKBTQ';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 1. Subir imagen a ImgBB vinculada a la cuenta de usuario
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
    throw new Error(`Error en ImgBB: ${data.error ? data.error.message : 'No se pudo subir la imagen'}`);
  }
  return data.data.url;
}

// 2. Intentar análisis con Gemini IA
async function analizarConGemini(base64Image) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const prompt = `Analiza esta página de catálogo. Extrae productos con código, precio y coordenadas 2D [top, left, bottom, right].
  Responde ÚNICAMENTE con un JSON válido:
  {
    "productos": [
      {
        "codigo": "123",
        "nombre": "Producto",
        "precio": 25.00,
        "box_2d": [10, 10, 40, 40]
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

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(`Gemini API Error (${response.status}): ${errData.error ? errData.error.message : response.statusText}`);
  }

  const result = await response.json();
  const textResponse = result.candidates[0].content.parts[0].text;
  return JSON.parse(textResponse);
}

// 3. Ingesta robusta
export async function procesarPaginaCatalogo(numeroPagina, base64Image) {
  console.log(`[Página ${numeroPagina}] Iniciando subida a ImgBB...`);
  
  // Paso 1: Subir a ImgBB
  const urlImagen = await subirAImgBB(base64Image, numeroPagina);
  console.log(`[Página ${numeroPagina}] Guardada en ImgBB: ${urlImagen}`);

  await delay(3500);

  // Paso 2: Intentar procesar con IA
  let productos = [];
  try {
    const datosIA = await analizarConGemini(base64Image);
    productos = datosIA.productos || [];
    console.log(`[Página ${numeroPagina}] Productos detectados por IA:`, productos.length);
  } catch (errIA) {
    console.warn(`[Página ${numeroPagina}] Continuación sin IA por aviso:`, errIA.message);
  }

  // Paso 3: Guardar obligatoriamente en Firestore
  const docRef = await addDoc(collection(db, "campanas"), {
    numero_pagina: numeroPagina,
    url_imagen_imgbb: urlImagen,
    productos: productos,
    creado_el: new Date().toISOString()
  });

  console.log(`[Página ${numeroPagina}] Guardada exitosamente en Firestore con ID: ${docRef.id}`);
}
