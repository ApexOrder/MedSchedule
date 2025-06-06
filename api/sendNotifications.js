// @vercel/cron: "20 * * * *"

const { initializeApp, cert, getApps } = require("firebase-admin/app");
const axios = require("axios");

if (!getApps().length) {
  console.log("[INIT] Initializing Firebase app...");
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_ADMIN_JSON)),
  });
  console.log("[INIT] Firebase app initialized.");
} else {
  console.log("[INIT] Firebase app already initialized.");
}

const tenantId = process.env.MS_TENANT_ID;
const clientId = process.env.MS_CLIENT_ID;
const clientSecret = process.env.MS_CLIENT_SECRET;

async function getGraphToken() {
  console.log("[TOKEN] Requesting Microsoft Graph token...");
  const response = await axios.post(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
    })
  );
  console.log("[TOKEN] Token received.");
  return response.data.access_token;
}

// Sends a debug notification to YOUR Teams feed every run
async function sendDebugTeamsNotification(userId, deepLink) {
  const token = await getGraphToken();

  const debugMsg = `DEBUG: Cron ran at ${new Date().toLocaleTimeString()}`;
  console.log(`[NOTIFY] Sending Teams debug notification to ${userId} at ${debugMsg}`);
  await axios.post(
    `https://graph.microsoft.com/v1.0/users/${userId}/teamwork/sendActivityNotification`,
    {
      topic: {
        source: "text",
        value: "Care Calendar Debug",
        webUrl: deepLink,
      },
      activityType: "systemDefault",
      previewText: { content: debugMsg },
      recipient: {
        "@odata.type": "microsoft.graph.aadUserNotificationRecipient",
        userId,
      },
      templateParameters: [
        {
          name: "systemDefaultText",
          value: debugMsg,
        },
      ],
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  console.log("[NOTIFY] Debug notification sent successfully!");
}

module.exports = async function handler(req, res) {
  const debug = [];
  const now = new Date();
  console.log(`[RUN] Handler started at ${now.toISOString()}`);

  try {
    // Fire debug notification EVERY time
    await sendDebugTeamsNotification(
      "0b652ebb-b452-4369-869b-fc227bb7f48b",
      "https://teams.microsoft.com/l/entity/19901a37-647d-456a-a758-b3c58bc3120b/_djb2_msteams_prefix_3671250058?context=%7B%22channelId%22%3A%2219%3ARTtJikWB7NQj4ysOlIfpaFqP7DUlmKomPbEtfzIcAEs1%40thread.tacv2%22%7D&tenantId=a3fa1e2a-6173-409a-8f0d-35492b1e54cc"
    );
    debug.push("✅ Debug notification sent to Teams Activity feed.");
    console.log(`[END] Handler completed at ${new Date().toISOString()}`);
    res.status(200).json({
      debug,
      status: "Notification sent.",
      time: new Date().toISOString(),
    });
  } catch (error) {
    debug.push(`❌ Error sending notification: ${error.message}`);
    console.error(`[ERROR] Handler failed at ${new Date().toISOString()}:`, error);
    res.status(500).json({ debug, error: error.message });
  }
};
