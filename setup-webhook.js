fetch('https://report_toys_2026.evtsarenko.workers.dev/setup/webhook', {
  method: 'POST'
})
  .then(r => r.json())
  .then(d => {
    console.log('Webhook setup result:');
    console.log(JSON.stringify(d, null, 2));
  })
  .catch(e => console.error('Error:', e.message));
