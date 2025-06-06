// @vercel/cron: "* * * * *"

const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const axios = require("axios");

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_ADMIN_JSON)),
  });
}
const db = getFirestore();

const tenantId = process.env.MS_TENANT_ID;
const clientId = process.env.MS_CLIENT_ID;
const clientSecret = process.env.MS_CLIENT_SECRET;

// Helper: get Graph API token
async function getGraphToken() {
  const response = await axios.post(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
    })
  );
  return response.data.access_token;
}

// NEW: Teams notification with full customisation for debug
async function sendTeamsDebugNotification(userId, debugText) {
  const token = await getGraphToken();

  // Replace this with your real Teams tab link (deep link) if you have it
  const webUrl = "https://teams.microsoft.com/l/entity/72934a41-9161-4502-9a56-3f9809fb305d/med-schedule-tab-id";

  // Teams notification for debug
  await axios.post(
    `https://graph.microsoft.com/v1.0/users/${userId}/teamwork/sendActivityNotification`,
    {
      topic: {
        source: "text",
        value: "Care Calendar",
        webUrl,
      },
      activityType: "systemDefault",
      previewText: {
        content: debugText,
      },
      recipient: {
        "@odata.type": "microsoft.graph.aadUserNotificationRecipient",
        userId: userId,
      },
      templateParameters: [
        {
          name: "systemDefaultText",
          value: debugText,
        },
      ],
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

// Your old sendTeamsNotification for event reminders (can be left as is)
async function sendTeamsNotification(email, eventTitle) {
  const token = await getGraphToken();
  const userRes = await axios.get(
    `https://graph.microsoft.com/v1.0/users/${email}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const userId = userRes.data.id;

  // ... (you could swap this to the same payload style as above for consistency)
  await axios.post(
    `https://graph.microsoft.com/v1.0/users/${userId}/teamwork/sendActivityNotification`,
    {
      topic: {
        source: "entityUrl",
        value: "https://your-app-url/", // Optionally change to your event/app URL
      },
      activityType: "eventReminder",
      previewText: {
        content: `Reminder: "${eventTitle}" is scheduled for today`,
      },
      recipient: {
        "@odata.type": "microsoft.graph.aadUserNotificationRecipient",
        userId: userId,
      },
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

module.exports = async function handler(req, res) {
  const debug = [];
  try {
    // Send debug notification to YOURSELF on every cron run!
    const testUserId = "0b652ebb-b452-4369-869b-fc227bb7f48b"; // <--- Replace with your real object ID!
    const now = new Date();
    const debugMsg = `DEBUG: Cron ran at ${now.toLocaleTimeString()}`;
    try {
      await sendTeamsDebugNotification(testUserId, debugMsg);
      debug.push(`✅ Sent debug notification: "${debugMsg}"`);
    } catch (err) {
      debug.push(`❌ Failed to send debug notification: ${err.message}`);
    }

    // ---- Your original notification/event logic ----

    // Get today's date string (YYYY-MM-DD)
    now.setHours(0, 0, 0, 0);
    const todayStr = now.toISOString().split("T")[0];
    debug.push(`Checking for events on: ${todayStr}`);

    // Query all events scheduled for today (across all channels)
    const snapshot = await db
      .collection("events")
      .where("date", "==", todayStr)
      .get();

    const events = [];
    snapshot.forEach((doc) => events.push({ id: doc.id, ...doc.data() }));

    // Group by channelId
    const eventsByChannel = {};
    for (const event of events) {
      const ch = event.channelId || "unknown";
      if (!eventsByChannel[ch]) eventsByChannel[ch] = [];
      eventsByChannel[ch].push(event);
    }

    debug.push(`Found ${events.length} total events for today.`);
    let sentCount = 0;
    let errors = [];

    for (const [channelId, channelEvents] of Object.entries(eventsByChannel)) {
      debug.push(`Channel: ${channelId} (${channelEvents.length} events)`);
      for (const event of channelEvents) {
        try {
          const email = `${event.username}@RelianceCommunityCare007.onmicrosoft.com`;
          await sendTeamsNotification(email, event.title, event.id);
          await db.collection("events").doc(event.id).update({ notified: true });
          debug.push(`✅ Notified "${event.title}" (${event.id}) in channel ${channelId}`);
          sentCount++;
        } catch (err) {
          const errMsg = `❌ Failed "${event.title}" (${event.id}) in channel ${channelId}: ${
            err.response ? JSON.stringify(err.response.data) : err.message
          }`;
          debug.push(errMsg);
          errors.push(errMsg);
        }
      }
    }

    debug.push(`Sent ${sentCount} notifications.`);
    if (errors.length) {
      debug.push("Errors:");
      debug.push(...errors);
    }

    res.status(200).json({
      sent: sentCount,
      checked: events.length,
      errors,
      debug,
    });
  } catch (error) {
    debug.push(`Server error: ${error.message}`);
    res.status(500).json({ sent: 0, checked: 0, errors: [error.message], debug });
  }
};
