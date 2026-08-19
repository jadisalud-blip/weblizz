import { db, collection, addDoc } from '../js/firebase-config.js';

const IMGBB_API_KEY = 'AQ.Ab8RN6JWVg044Rf1A5AorOtWfmecJgjbWNJ9FTfj8Suy0uKBTQ';
const GEMINI_API_KEY = 'AQ.Ab8RN6JWVg044Rf1A5AorOtWfmecJgjbWNJ9FTfj8Suy0uKBTQ';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function subirAImgBB(base64Image) {
  const formData = new FormData();
  formData.append('image', base64Image);

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: 'POST',
    body: formData
  });

  const data = await response.json();
  return data.data.url;
}

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

export async function procesarPaginaCatalogo(numeroPagina, base64Image) {
  try {
    const urlImagen = await subirAImgBB(base64Image);
    await delay(4200);
    const datosIA = await analizarConGemini(base64Image);

    await addDoc(collection(db, "campanas"), {
      numero_pagina: numeroPagina,
      url_imagen_imgbb: urlImagen,
      productos: datosIA.productos || [],
      creado_el: new Date().toISOString()
    });

    console.log(`Página ${numeroPagina} procesada y guardada.`);
  } catch (error) {
    console.error(`Error en página ${numeroPagina}:`, error);
  }
}
