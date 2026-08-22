export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Endpoint listo para gestionar lecturas/escrituras desde el backend si es necesario
    return res.status(200).json({ status: "API Firestore Serverless Lista" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
