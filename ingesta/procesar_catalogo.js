// ingesta/procesar_catalogo.js - Motor de IA y optimización de imágenes

import { db, collection, addDoc } from '../public/js/firebase-config.js';

// Configuración de API Keys
const IMGBB_API_KEY = 'TU_IMGBB_API_KEY_AQUI';
const GEMINI_API_KEY = 'TU_GEMINI_API_KEY_AQUI';

// Temporizador de seguridad para la cuota gratuita de Gemini (4.2 segundos)
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 1. Subir imagen a ImgBB (Tráfico ilimitado)
async function subirAImgBB(base64Image) {
  const formData = new FormData();
  formData.append('image', base64Image);

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: 'POST',
    body: formData
  });

  const data = await response.json();
  return data.data.url; // Retorna la URL directa de la foto
}

// 2. Analizar página con Gemini 1.5 Flash
async function analizarConGemini(base64Image) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const prompt = `Analiza esta página de catálogo. Extrae todos los productos con su código, precio y coordenadas 2D relativas (% de top, left, bottom, right).
  Responde ÚNICAMENTE con un JSON válido usando esta estructura:
  {
    "productos": [
      {
        "codigo": "123",
        "nombre": "Nombre producto",
        "precio": 25.00,
        "box_2d": [top, left, bottom, right]
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

  const result = await response.json();
  const textResponse = result.candidates[0].content.parts[0].text;
  return JSON.parse(textResponse);
}

// 3. Procesador principal de catálogo (Iterador con Rate Limit)
export async function procesarPaginaCatalogo(numeroPagina, base64Image) {
  console.log(`Procesando página ${numeroPagina}...`);

  try {
    // Paso A: Subir imagen a ImgBB
    const urlImagen = await subirAImgBB(base64Image);
    console.log(`Imagen ${numeroPagina} subida a ImgBB:`, urlImagen);

    // Paso B: Pausa de 4.2s para no saturar el límite de 15 peticiones/min de Gemini
    await delay(4200);

    // Paso C: Analizar con Gemini IA
    const datosIA = await analizarConGemini(base64Image);
    console.log(`Página ${numeroPagina} analizada por Gemini:`, datosIA);

    // Paso D: Guardar en Google Firestore
    await addDoc(collection(db, "campanas"), {
      numero_pagina: numeroPagina,
      url_imagen_imgbb: urlImagen,
      productos: datosIA.productos || [],
      creado_el: new Date().toISOString()
    });

    console.log(`Página ${numeroPagina} guardada exitosamente en Firestore.`);

  } catch (error) {
    console.error(`Error en página ${numeroPagina}:`, error);
  }
}
