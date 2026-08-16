const BOT_TOKEN = '8952606142:AAHXzZ-5FrdRqNCc3GRd_9--yuq_YGXPmG8';
const WEBHOOK_URL = 'https://report_toys_2026.evtsarenko.workers.dev/webhook/telegram';
const SECRET = 'collector_secret_token_2026';

fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: WEBHOOK_URL,
    secret_token: SECRET,
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: true
  })
})
  .then(r => r.json())
  .then(d => {
    console.log('Webhook setup result:');
    console.log(JSON.stringify(d, null, 2));
  })
  .catch(e => console.error('Error:', e.message));
