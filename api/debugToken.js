// /pages/api/debugToken.js
const axios = require("axios");

const tenantId = process.env.MS_TENANT_ID;
const clientId = process.env.MS_CLIENT_ID;
const clientSecret = process.env.MS_CLIENT_SECRET;

module.exports = async function handler(req, res) {
  try {
    const params = new URLSearchParams();
    params.append("grant_type", "client_credentials");
    params.append("client_id", clientId);
    params.append("client_secret", clientSecret);
    params.append("scope", "https://graph.microsoft.com/.default");

    const response = await axios.post(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      params
    );
    res.status(200).json({ access_token: response.data.access_token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
