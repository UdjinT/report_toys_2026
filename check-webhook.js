const BOT_TOKEN = '8952606142:AAHXzZ-5FrdRqNCc3GRd_9--yuq_YGXPmG8';

fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`)
  .then(r => r.json())
  .then(d => {
    console.log('Webhook info:');
    console.log(JSON.stringify(d, null, 2));
  })
  .catch(e => console.error('Error:', e.message));
