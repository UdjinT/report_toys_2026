// Node.js 18+ has built-in fetch
const BOT_TOKEN = '8952606142:AAHXzZ-5FrdRqNCc3GRd_9--yuq_YGXPmG8';
const API_URL = 'https://api.telegram.org/bot' + BOT_TOKEN;
const WEBHOOK_URL = 'https://report_toys_2026.evtsarenko.workers.dev/webhook/telegram';

let lastUpdateId = 0;
let pollingActive = false;

async function deleteWebhook() {
  try {
    const response = await fetch(`${API_URL}/deleteWebhook`);
    const data = await response.json() as any;
    if (data.ok) {
      console.log('✅ Webhook deleted');
    }
  } catch (error) {
    console.error('❌ Failed to delete webhook:', error);
  }
}

async function pollUpdates() {
  if (pollingActive) {
    console.log('⏳ Previous poll still in progress, skipping...');
    return;
  }

  pollingActive = true;
  try {
    const url = `${API_URL}/getUpdates?offset=${lastUpdateId + 1}&timeout=30&allowed_updates=message,callback_query`;
    const response = await fetch(url);
    const data = (await response.json()) as any;

    if (!data.ok) {
      console.error('Telegram API error:', data);
      return;
    }

    if (data.result && data.result.length > 0) {
      console.log(`📥 Got ${data.result.length} updates`);

      for (const update of data.result) {
        lastUpdateId = update.update_id;

        // Forward to webhook
        await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(update),
        });

        console.log(`✅ Processed update ${update.update_id}`);
      }
    }
  } catch (error) {
    console.error('❌ Polling error:', error);
  } finally {
    pollingActive = false;
  }
}

// Poll every 5 seconds
(async () => {
  // Only run polling if enabled (default true for backward compatibility)
  const pollingEnabled = process.env.POLLING_ENABLED !== 'false';

  if (!pollingEnabled) {
    console.log('⚠️  Polling disabled via POLLING_ENABLED env var');
    return;
  }

  console.log('🤖 Bot polling starting...');
  await deleteWebhook();
  console.log('🤖 Bot polling started...');

  // First poll after 2 seconds to give system time to stabilize
  setTimeout(pollUpdates, 2000);

  // Then poll every 5 seconds
  setInterval(pollUpdates, 5000);
})();
