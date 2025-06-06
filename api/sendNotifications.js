// @vercel/cron: "35 16 * * *"



import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import axios from "axios";

// Only initialize once (Vercel hot reload)
if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_ADMIN_JSON))
  });
}
const db = getFirestore();

// Microsoft Graph setup
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
      scope: "https://graph.microsoft.com/.default"
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
        value: "https://med-schedule-theta.vercel.app/" // Change to your app/event URL if you want
      },
      activityType: "eventReminder",
      previewText: {
        content: `Reminder: "${eventTitle}" starts now`
      },
      recipient: {
        "@odata.type": "microsoft.graph.aadUserNotificationRecipient",
        userId: userId
      }
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export default async function handler(req, res) {
  // This job runs every minute, so check for events in a +/- 1min window
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  const oneMinuteAhead = now + 60 * 1000;

  // Query Firestore for events starting ~now
  const snapshot = await db.collection("events")
    .where("start", ">=", new Date(oneMinuteAgo))
    .where("start", "<=", new Date(oneMinuteAhead))
    .get();

  const events = [];
  snapshot.forEach(doc => events.push({ id: doc.id, ...doc.data() }));

  // For each event, send Teams notification
  for (const event of events) {
  try {
    const email = `${event.username}@RelianceCommunityCare007.onmicrosoft.com`;
    await sendTeamsNotification(email, event.title, event.id);
    await db.collection("events").doc(event.id).update({ notified: true });
    sentCount++;
  } catch (err) {
    console.error(
      `Failed to notify for event ${event.title} (${event.id}):`,
      err.response ? err.response.data : err
    );
  }
}


  res.status(200).json({ sent: events.length });
}
