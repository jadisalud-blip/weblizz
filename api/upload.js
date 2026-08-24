export default async function handler(req, res) {
  // Permitir únicamente peticiones POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No se envió la imagen' });
    }

    // Vercel lee automáticamente la variable de entorno
    const apiKey = process.env.VITE_IMGBB_API_KEY || process.env.IMGBB_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'API Key de ImgBB no configurada en Vercel' });
    }

    // Preparar el cuerpo para ImgBB (form-urlencoded)
    const formData = new URLSearchParams();
    formData.append('image', image);

    const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = await imgbbRes.json();
    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
