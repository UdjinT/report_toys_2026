export async function handleTelegramUpdate(update: any, token: string) {
  try {
    console.log('🤖 Update received:', update.update_id);
    console.log('Token length:', token?.length || 0);
    console.log('Token first 10 chars:', token?.substring(0, 10) || 'UNDEFINED');

    const message = update.message;
    if (!message || !message.chat || !message.from) {
      console.log('Invalid message structure');
      return;
    }

    const { chat, from, text } = message;
    const chatId = chat.id;
    const userId = from.id;

    console.log(`📨 Message from ${userId} in chat ${chatId}: ${text}`);

    if (text === '/start') {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: '👋 Привет! Введите ваше имя:',
        }),
      });

      console.log('Response status:', response.status);
      if (!response.ok) {
        const error = await response.text();
        console.error('TG API error:', error);
      }
    } else if (text) {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `📝 Вы написали: ${text}`,
        }),
      });

      console.log('Echo response status:', response.status);
      if (!response.ok) {
        const error = await response.text();
        console.error('TG API error:', error);
      }
    }
  } catch (error) {
    console.error('❌ Telegram handler error:', error);
  }
}
