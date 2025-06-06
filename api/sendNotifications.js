const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
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

const db = getFirestore();

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

async function sendTeamsNotification(userId, deepLink, eventTitle, eventNotes) {
  const token = await getGraphToken();
  const eventMsg = `Reminder: "${eventTitle}" scheduled today.` + (eventNotes ? `\nNotes: ${eventNotes}` : "");
  console.log(`[NOTIFY] Sending Teams event notification to ${userId}: ${eventMsg}`);
  await axios.post(
    `https://graph.microsoft.com/v1.0/users/${userId}/teamwork/sendActivityNotification`,
    {
      topic: {
        source: "text",
        value: "Care Calendar Event",
        webUrl: deepLink,
      },
      activityType: "systemDefault",
      previewText: { content: eventMsg },
      recipient: {
        "@odata.type": "microsoft.graph.aadUserNotificationRecipient",
        userId,
      },
      templateParameters: [
        {
          name: "systemDefaultText",
          value: eventMsg,
        },
      ],
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  console.log("[NOTIFY] Event notification sent successfully!");
}

module.exports = async function handler(req, res) {
  const debug = [];
  const now = new Date();
  console.log(`[RUN] Handler started at ${now.toISOString()}`);

  try {
    // Get today's date string (YYYY-MM-DD)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];
    debug.push(`Checking for events on: ${todayStr}`);

    // Query Firestore for today's events
    const snapshot = await db
      .collection("events")
      .where("date", "==", todayStr)
      .get();

    const events = [];
    snapshot.forEach(doc => events.push({ id: doc.id, ...doc.data() }));

    debug.push(`Found ${events.length} event(s) for today.`);

    let sentCount = 0;
    let errors = [];

    for (const event of events) {
      try {
        // Construct user email or ID
        const userId = `${event.username}@RelianceCommunityCare007.onmicrosoft.com`; // adjust as needed
        const deepLink =
          "https://teams.microsoft.com/l/entity/19901a37-647d-456a-a758-b3c58bc3120b/_djb2_msteams_prefix_3671250058?context=%7B%22channelId%22%3A%2219%3ARTtJikWB7NQj4ysOlIfpaFqP7DUlmKomPbEtfzIcAEs1%40thread.tacv2%22%7D&tenantId=a3fa1e2a-6173-409a-8f0d-35492b1e54cc";

        await sendTeamsNotification(userId, deepLink, event.title, event.notes || "");
        debug.push(`✅ Notified "${event.title}" for ${userId}`);
        sentCount++;
      } catch (err) {
        const errMsg = `❌ Failed "${event.title}" for user: ${err.message}`;
        debug.push(errMsg);
        errors.push(errMsg);
        console.error(errMsg, err);
      }
    }

    debug.push(`Sent ${sentCount} notifications.`);

    if (errors.length) {
      debug.push("Errors:");
      debug.push(...errors);
    }

    console.log(`[END] Handler completed at ${new Date().toISOString()}`);
    res.status(200).json({
      debug,
      status: `Notifications sent: ${sentCount}`,
      time: new Date().toISOString(),
      errors,
    });
  } catch (error) {
    debug.push(`❌ Error sending notification: ${error.message}`);
    console.error(`[ERROR] Handler failed at ${new Date().toISOString()}:`, error);
    res.status(500).json({ debug, error: error.message });
  }
};