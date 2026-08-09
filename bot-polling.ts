// Node.js 18+ has built-in fetch
const BOT_TOKEN = '8952606142:AAHXzZ-5FrdRqNCc3GRd_9--yuq_YGXPmG8';
const API_URL = 'https://api.telegram.org/bot' + BOT_TOKEN;
const WEBHOOK_URL = 'https://report_toys_2026.evtsarenko.workers.dev/webhook/telegram';

let lastUpdateId = 0;

async function pollUpdates() {
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
  }
}

// Poll every 5 seconds
console.log('🤖 Bot polling started...');
setInterval(pollUpdates, 5000);

// Also poll immediately
pollUpdates();
