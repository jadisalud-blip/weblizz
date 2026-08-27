export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const { marca, numPagina, imagenUrl, datosPagina } = req.body;
    const projectId = process.env.FIREBASE_PROJECT_ID || 'weblizz';
    const idPagina = `${marca.toLowerCase()}_pagina_${numPagina}`;

    let textoRespuesta = "";
    if (datosPagina?.candidates?.[0]?.content?.parts?.[0]?.text) {
      textoRespuesta = datosPagina.candidates[0].content.parts[0].text;
    }

    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/catalogo_paginas/${idPagina}`;

    const payload = {
      fields: {
        marca: { stringValue: marca },
        numero_pagina: { integerValue: numPagina },
        url_imagen: { stringValue: imagenUrl },
        datos_raw: { stringValue: textoRespuesta },
        creado_el: { stringValue: new Date().toISOString() }
      }
    };

    const response = await fetch(firestoreUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(400).json({ error: data.error?.message || 'Error al guardar en Firestore' });
    }
    return res.status(200).json({ success: true, id: idPagina });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
