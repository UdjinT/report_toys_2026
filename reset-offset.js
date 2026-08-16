fetch('https://report_toys_2026.evtsarenko.workers.dev/reset/offset', {
  method: 'POST'
})
  .then(r => r.json())
  .then(d => console.log('Result:', JSON.stringify(d, null, 2)))
  .catch(e => console.error('Error:', e.message));
