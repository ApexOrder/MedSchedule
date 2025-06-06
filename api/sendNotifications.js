const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const axios = require("axios");

// Only initialize Firebase once
if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_ADMIN_JSON)),
  });
}
const db = getFirestore();

const tenantId = process.env.MS_TENANT_ID;
const clientId = process.env.MS_CLIENT_ID;
const clientSecret = process.env.MS_CLIENT_SECRET;

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

async function sendTeamsNotification(email, eventTitle) {
  const token = await getGraphToken();

  // Get the user's ID from email using Graph API
  const userRes = await axios.get(
    `https://graph.microsoft.com/v1.0/users/${email}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const userId = userRes.data.id;

  // Send notification
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
    // Today's date string (YYYY-MM-DD)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];
    debug.push(`Checking for events on: ${todayStr}`);

    // Query Firestore for events with start/date matching today
    // Change "start" to your field name if it's "date" instead
    const snapshot = await db
      .collection("events")
      .where("start", "==", todayStr)
      .get();

    const events = [];
    snapshot.forEach((doc) => events.push({ id: doc.id, ...doc.data() }));

    debug.push(`Found ${events.length} events scheduled for today.`);

    let sentCount = 0;
    let errors = [];

    for (const event of events) {
      try {
        const email = `${event.username}@RelianceCommunityCare007.onmicrosoft.com`;
        await sendTeamsNotification(email, event.title, event.id);
        await db.collection("events").doc(event.id).update({ notified: true });
        debug.push(`✅ Notified for event "${event.title}" (${event.id})`);
        sentCount++;
      } catch (err) {
        const errMsg = `❌ Failed for event "${event.title}" (${event.id}): ${
          err.response ? JSON.stringify(err.response.data) : err.message
        }`;
        debug.push(errMsg);
        errors.push(errMsg);
      }
    }

    debug.push(`Sent ${sentCount} notifications.`);
    if (errors.length) debug.push("Errors:").concat(errors);

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
