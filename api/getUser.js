// pages/api/getUser.js
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'No Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.decode(token);

    if (!decoded) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    // fallback logic if displayName is missing
    res.status(200).json({
      displayName: decoded.name || decoded.preferred_username || "Unknown",
      email: decoded.preferred_username || decoded.upn || decoded.email || "unknown@example.com"
    });
  } catch (err) {
    res.status(500).json({ error: 'Token decode failed', details: err.message });
  }
}
