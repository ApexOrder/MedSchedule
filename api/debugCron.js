// @vercel/cron: "0 * * * *"
module.exports = async function handler(req, res) {
  const now = new Date();
  console.log(`[CRON-DEBUG] Scheduled cron fired at ${now.toISOString()}`);
  res.status(200).json({
    debug: `[CRON-DEBUG] Scheduled cron fired at ${now.toISOString()}`
  });
};
