// Node.js 18+ has built-in fetch
const BOT_TOKEN = '8952606142:AAHXzZ-5FrdRqNCc3GRd_9--yuq_YGXPmG8';
const API_URL = 'https://api.telegram.org/bot' + BOT_TOKEN;
const WEBHOOK_URL = 'https://report_toys_2026.evtsarenko.workers.dev/webhook/telegram';
const SECRET_TOKEN = 'collector_secret_token_2026';
let lastUpdateId = 0;
let pollingActive = false;
let consecutiveErrors = 0;
async function deleteWebhook() {
    try {
        const response = await fetch(`${API_URL}/deleteWebhook`);
        const data = await response.json();
        if (data.ok) {
            console.log('✅ Webhook deleted');
        }
    }
    catch (error) {
        console.error('❌ Failed to delete webhook:', error);
    }
}
async function pollUpdates() {
    if (pollingActive) {
        return;
    }
    pollingActive = true;
    const now = new Date().toISOString();
    try {
        console.log(`[${now}] 🔄 Polling...`);
        const url = `${API_URL}/getUpdates?offset=${lastUpdateId + 1}&timeout=5&allowed_updates=message,callback_query`;
        const response = await fetch(url);
        const data = (await response.json());
        if (!data.ok) {
            // If we get 409 conflict, another instance is running
            // Exit so Railway can restart us and kill the old one
            if (data.error_code === 409) {
                consecutiveErrors++;
                console.error(`[${now}] [409 CONFLICT #${consecutiveErrors}] Another instance detected.`);
                if (consecutiveErrors >= 3) {
                    console.error('🛑 Killing process due to repeated 409 conflicts');
                    process.exit(1);
                }
                return;
            }
            consecutiveErrors = 0;
            console.error(`[${now}] ❌ API error:`, data.error_code, data.description);
            return;
        }
        consecutiveErrors = 0;
        if (data.result && data.result.length > 0) {
            console.log(`[${now}] 📥 Got ${data.result.length} updates`);
            for (const update of data.result) {
                lastUpdateId = update.update_id;
                try {
                    const updateType = update.message ? 'message' : update.callback_query ? 'callback_query' : 'unknown';
                    const response = await fetch(WEBHOOK_URL, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Telegram-Bot-Api-Secret-Token': SECRET_TOKEN,
                        },
                        body: JSON.stringify(update),
                    });
                    console.log(`[${now}] ✅ Update ${update.update_id} (${updateType}) sent to webhook, status=${response.status}`);
                }
                catch (e) {
                    console.error(`[${now}] ❌ Webhook error:`, e.message);
                }
            }
        }
        else {
            console.log(`[${now}] ✓ No updates`);
        }
    }
    catch (error) {
        console.error(`[${now}] ❌ Poll error:`, error.message);
    }
    finally {
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
    console.log(`🆔 Instance ID: ${process.pid}`);
    await deleteWebhook();
    console.log('🤖 Bot polling started...');
    // First poll after 5 seconds to give system time to stabilize
    setTimeout(pollUpdates, 5000);
    // Then poll every 5 seconds
    setInterval(pollUpdates, 5000);
    // Handle graceful shutdown
    process.on('SIGTERM', () => {
        console.log('📛 SIGTERM received - shutting down polling');
        process.exit(0);
    });
    process.on('SIGINT', () => {
        console.log('📛 SIGINT received - shutting down polling');
        process.exit(0);
    });
})();
