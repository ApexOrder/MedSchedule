const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const axios = require("axios");

if (!getApps().length) {
  initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_ADMIN_JSON)) });
}
const db = getFirestore();

const tenantId = process.env.MS_TENANT_ID;
const clientId = process.env.MS_CLIENT_ID;
const clientSecret = process.env.MS_CLIENT_SECRET;

// Helper to get userId from email
async function getUserIdByEmail(email, token) {
  const userRes = await axios.get(
    `https://graph.microsoft.com/v1.0/users?$filter=mail eq '${email}'`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (userRes.data.value.length === 0) throw new Error(`User not found for email: ${email}`);
  return userRes.data.value[0].id;
}

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

async function sendTeamsNotification(userId, deepLink, tag, eventsList, token) {
  let message = `Events for tag: **${tag}**\n\n`;
  eventsList.forEach(evt => {
    message += `• **${evt.title}**${evt.notes ? `: ${evt.notes}` : ""}\n`;
  });

  await axios.post(
    `https://graph.microsoft.com/v1.0/users/${userId}/teamwork/sendActivityNotification`,
    {
      topic: {
        source: "text",
        value: "Care Calendar Events",
        webUrl: deepLink,
      },
      activityType: "systemDefault",
      previewText: { content: message },
      recipient: {
        "@odata.type": "microsoft.graph.aadUserNotificationRecipient",
        userId,
      },
      templateParameters: [{ name: "systemDefaultText", value: message }],
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

module.exports = async function handler(req, res) {
  const debug = [];
  try {
    // Prepare date string
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];
    debug.push(`Checking for events on: ${todayStr}`);

    // Query events for today
    const snapshot = await db.collection("events").where("date", "==", todayStr).get();
    const events = [];
    snapshot.forEach(doc => events.push({ id: doc.id, ...doc.data() }));
    debug.push(`Found ${events.length} event(s) for today.`);

    // Group events by user and tag
    // Structure: { [email]: { [tagName]: [events] } }
    const grouped = {};
    for (const evt of events) {
      const email = evt.createdBy;
      const tag = evt.tagName || "Untagged";
      if (!email) continue;
      if (!grouped[email]) grouped[email] = {};
      if (!grouped[email][tag]) grouped[email][tag] = [];
      grouped[email][tag].push(evt);
    }

    let sentCount = 0;
    let errors = [];
    const token = await getGraphToken();

    for (const email of Object.keys(grouped)) {
      let userId;
      try {
        userId = await getUserIdByEmail(email, token);
      } catch (err) {
        debug.push(`❌ Could not get userId for ${email}: ${err.message}`);
        errors.push(err.message);
        continue;
      }
      for (const tag of Object.keys(grouped[email])) {
        const eventsList = grouped[email][tag];
        // Add your deepLink logic (customize as needed)
        const deepLink = "https://teams.microsoft.com/l/entity/19901a37-647d-456a-a758-b3c58bc3120b/_djb2_msteams_prefix_3671250058?context=%7B%22channelId%22%3A%2219%3ARTtJikWB7NQj4ysOlIfpaFqP7DUlmKomPbEtfzIcAEs1%40thread.tacv2%22%7D&tenantId=a3fa1e2a-6173-409a-8f0d-35492b1e54cc";

        try {
          await sendTeamsNotification(userId, deepLink, tag, eventsList, token);
          debug.push(`✅ Notified ${email} for tag "${tag}" with ${eventsList.length} event(s)`);
          sentCount++;
        } catch (err) {
          const errMsg = `❌ Notification failed for ${email}, tag "${tag}": ${err.message}`;
          debug.push(errMsg);
          errors.push(errMsg);
        }
      }
    }

    debug.push(`Sent ${sentCount} grouped notifications.`);
    if (errors.length) debug.push("Errors:", ...errors);

    res.status(200).json({
      debug,
      status: `Grouped notifications sent: ${sentCount}`,
      time: new Date().toISOString(),
      errors,
    });
  } catch (error) {
    debug.push(`❌ Error: ${error.message}`);
    res.status(500).json({ debug, error: error.message });
  }
};
