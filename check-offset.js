fetch('https://report_toys_2026.evtsarenko.workers.dev/check/offset')
  .then(r => r.json())
  .then(d => console.log('Current offset:', JSON.stringify(d, null, 2)))
  .catch(e => console.error('Error:', e.message));
