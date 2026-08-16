fetch('https://report_toys_2026.evtsarenko.workers.dev/test/bot')
  .then(r => r.json())
  .then(d => {
    console.log('Init result:', JSON.stringify(d, null, 2));
    // Now try to reset offset
    return fetch('https://report_toys_2026.evtsarenko.workers.dev/reset/offset', {
      method: 'POST'
    }).then(r => r.json());
  })
  .then(d => console.log('Reset result:', JSON.stringify(d, null, 2)))
  .catch(e => console.error('Error:', e.message));
