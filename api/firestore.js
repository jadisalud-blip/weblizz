import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  projectId: process.env.FIREBASE_PROJECT_ID || "weblizz"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const { marca, numPagina, imagenUrl, datosPagina } = req.body;

    if (!marca || !numPagina || !imagenUrl) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos.' });
    }

    const idPagina = `${marca.toLowerCase()}_pagina_${numPagina}`;

    // Intentar interpretar el JSON de Gemini
    let productos = [];
    try {
      const textRaw = datosPagina.candidates[0].content.parts[0].text;
      const jsonClean = textRaw.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(jsonClean);
      productos = parsed.productos || [];
    } catch (e) {
      console.warn("No se pudo parsear el JSON de productos, guardando respuesta base.");
    }

    // Guardar en Firestore
    await setDoc(doc(db, "catalogo_paginas", idPagina), {
      marca: marca,
      numero_pagina: numPagina,
      url_imagen: imagenUrl,
      productos: productos,
      creado_el: new Date().toISOString()
    });

    return res.status(200).json({ success: true, id: idPagina });
  } catch (error) {
    console.error("Error en Firestore Serverless:", error);
    return res.status(500).json({ error: error.message });
  }
}
