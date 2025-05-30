// /api/getUser.js
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const decoded = jwt.decode(token, { complete: true });

    if (!decoded) {
      return res.status(400).json({ error: "Invalid token" });
    }

    // You can log or inspect this for debugging
    const claims = decoded.payload;

    // Optional: Check the `aud` matches your app
    if (claims.aud !== "api://72934a41-9161-4502-9a56-3f9809fb305d") {
      return res.status(403).json({ error: "Invalid audience" });
    }

    return res.status(200).json({
      displayName: claims.name || claims.preferred_username,
      email: claims.preferred_username || claims.upn || claims.email
    });

  } catch (err) {
    return res.status(500).json({ error: "Token validation failed", details: err.message });
  }
}
