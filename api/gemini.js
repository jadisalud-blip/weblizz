import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { imageBase64, numeroPagina } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'Falta la variable GEMINI_API_KEY en Vercel' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const imagePart = {
      inlineData: {
        data: imageBase64.replace(/^data:image\/(png|jpeg|webp);base64,/, ""),
        mimeType: "image/webp"
      }
    };

    const prompt = `
      Analiza la imagen de la página ${numeroPagina} de este catálogo comercial.
      Extrae todos los productos visibles y devuelve un JSON estricto con esta estructura:
      {
        "productos": [
          {
            "codigo": "Código o referencia del producto (si no existe poner N/A)",
            "nombre": "Nombre del producto",
            "precio": 0.00,
            "fichaTecnica": "Descripción detallada, aroma, beneficios o contenido del producto",
            "pagina": ${numeroPagina},
            "box_2d": [ymin, xmin, ymax, xmax]
          }
        ]
      }
      Las coordenadas box_2d deben estar normalizadas de 0 a 1000.
    `;

    const result = await model.generateContent([prompt, imagePart]);
    const jsonResponse = JSON.parse(result.response.text());

    return res.status(200).json(jsonResponse);

  } catch (error) {
    console.error("Error en Gemini API:", error);
    return res.status(500).json({ error: "Error procesando con Gemini", details: error.message });
  }
}
