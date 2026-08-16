const BOT_TOKEN = '8952606142:AAHXzZ-5FrdRqNCc3GRd_9--yuq_YGXPmG8';

fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`, {
  method: 'POST'
})
  .then(r => r.json())
  .then(d => {
    console.log('Webhook deleted:');
    console.log(JSON.stringify(d, null, 2));
  })
  .catch(e => console.error('Error:', e.message));
