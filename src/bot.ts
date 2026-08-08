interface UserState {
  step: 'ask_name' | 'select_point' | 'select_machine' | 'input_amount' | 'input_quantity' | 'ask_comment';
  name?: string;
  pointId?: number;
  machineId?: number;
  amount?: number;
  quantity?: number;
  comment?: string;
}

// In-memory store for user states (will be reset on redeployment)
const userStates = new Map<number, UserState>();

// Debug logging
const debugLogs: string[] = [];
const addLog = (msg: string) => {
  console.log(msg);
  debugLogs.push(msg);
};

export { debugLogs };

export async function handleTelegramBot(update: any, db: any, token: string) {
  try {
    addLog('🤖 TG Update: ' + update.update_id);
    addLog('📨 Update data: ' + JSON.stringify(update).substring(0, 200));

    const message = update.message;
    const callbackQuery = update.callback_query;

    if (message) {
      addLog('✅ Has message, calling handleMessage');
      await handleMessage(message, db, token);
    } else if (callbackQuery) {
      addLog('✅ Has callback_query, calling handleCallback');
      await handleCallback(callbackQuery, db, token);
    } else {
      addLog('⚠️ No message or callback_query found');
    }
  } catch (error) {
    addLog('❌ Bot error: ' + String(error));
  }
}

async function handleMessage(message: any, db: any, token: string) {
  const userId = message.from.id;
  const chatId = message.chat.id;
  const text = message.text;

  addLog(`📝 Message from ${userId}: ${text}`);

  let state = userStates.get(userId);

  // Handle /start command
  if (text === '/start') {
    addLog(`🚀 /start command received`);
    // Check if user already has a name saved
    if (state && state.name) {
      addLog(`📝 User already has name: ${state.name}, skipping to points`);
      // Reset state but keep the name
      state = {
        step: 'select_point',
        name: state.name,
        pointId: undefined,
        machineId: undefined,
        amount: undefined,
        quantity: undefined,
        comment: '',
      };
      userStates.set(userId, state);
      // Load and show points
      try {
        const result = await db.prepare('SELECT id, name FROM points ORDER BY name').all();
        const points = result.results as any[] || [];
        if (points.length > 0) {
          const keyboard = {
            inline_keyboard: points.map((p) => [
              { text: p.name, callback_data: `point_${p.id}` },
            ]),
          };
          await sendMessage(
            chatId,
            `📍 Добро пожаловать, ${state.name}! Выберите точку:`,
            token,
            keyboard
          );
        }
      } catch (e) {
        addLog('❌ Error in /start with saved name: ' + String(e));
      }
      return;
    }
    // New user - ask for name
    await sendMessage(chatId, '👋 Добро пожаловать! Введите ваше имя (как вы хотите отображаться в системе):', token);
    return;
  }

  // If no state, initialize with name
  if (!state) {
    state = {
      step: 'ask_name',
      name: text,
      pointId: undefined,
      machineId: undefined,
      amount: undefined,
      quantity: undefined,
      comment: '',
    };
    userStates.set(userId, state);

    // Load points
    try {
      addLog('🔄 Loading points from DB...');
      const result = await db.prepare('SELECT id, name FROM points ORDER BY name').all();
      const points = result.results as any[] || [];

      addLog(`✅ Loaded ${points.length} points`);

      if (points.length === 0) {
        addLog('⚠️ No points found');
        await sendMessage(chatId, '❌ Нет доступных точек', token);
        return;
      }

      const keyboard = {
        inline_keyboard: points.map((p) => [
          { text: p.name, callback_data: `point_${p.id}` },
        ]),
      };

      addLog(`📍 Built keyboard with ${points.length} buttons`);

      await sendMessage(
        chatId,
        `✅ Спасибо, ${state.name}!\n\n📍 Выберите точку:`,
        token,
        keyboard
      );
    } catch (error) {
      addLog('❌ Error loading points: ' + String(error));
      addLog('Stack: ' + (error instanceof Error ? error.stack : 'no stack'));
      await sendMessage(chatId, '❌ Ошибка загрузки точек', token);
    }
    return;
  }

  // Step: Input amount
  if (state.step === 'input_amount') {
    const amount = parseFloat(text);
    if (isNaN(amount) || amount <= 0) {
      await sendMessage(chatId, '❌ Пожалуйста, введите корректную сумму:', token);
      return;
    }

    state.amount = amount;
    state.step = 'input_quantity';
    userStates.set(userId, state);
    await sendMessage(chatId, `✅ Сумма: ${amount}₴\n\nТеперь введите количество товаров:`, token);
  }
  // Step: Input quantity
  else if (state.step === 'input_quantity') {
    const quantity = parseInt(text);
    if (isNaN(quantity) || quantity <= 0) {
      await sendMessage(chatId, '❌ Пожалуйста, введите корректное количество:', token);
      return;
    }

    state.quantity = quantity;
    state.step = 'ask_comment';
    userStates.set(userId, state);

    const keyboard = {
      inline_keyboard: [
        [
          { text: '✏️ Добавить комментарий', callback_data: 'add_comment' },
          { text: '⏭️ Пропустить', callback_data: 'skip_comment' },
        ],
      ],
    };

    await sendMessage(
      chatId,
      `✅ Количество: ${quantity} шт.\n\nХотите добавить комментарий?`,
      token,
      keyboard
    );
  }
  // Step: Input comment
  else if (state.step === 'ask_comment') {
    state.comment = text;
    await saveCollection(chatId, userId, state, db, token);
  }
}

async function handleCallback(callbackQuery: any, db: any, token: string) {
  const userId = callbackQuery.from.id;
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  const messageId = callbackQuery.message.message_id;

  console.log(`🔘 Button from ${userId}: ${data}`);

  let state = userStates.get(userId);

  if (!state) {
    await answerCallback(callbackQuery.id, '⚠️ Сессия истекла', token);
    return;
  }

  try {
    // Select point
    if (data.startsWith('point_')) {
      const pointId = parseInt(data.split('_')[1]);
      state.pointId = pointId;
      state.step = 'select_machine';
      userStates.set(userId, state);

      // Load machines
      const result = await db
        .prepare('SELECT id, name FROM machines WHERE point_id = ? ORDER BY name')
        .bind(pointId)
        .all();
      const machines = result.results as any[] || [];

      if (machines.length === 0) {
        await answerCallback(callbackQuery.id, '', token);
        await editMessage(chatId, messageId, '❌ Нет автоматов на этой точке', token);
        return;
      }

      const keyboard = {
        inline_keyboard: machines.map((m) => [
          { text: m.name, callback_data: `machine_${m.id}` },
        ]),
      };

      await answerCallback(callbackQuery.id, '', token);
      await editMessage(chatId, messageId, '🤖 Выберите автомат:', token, keyboard);
    }
    // Select machine
    else if (data.startsWith('machine_')) {
      const machineId = parseInt(data.split('_')[1]);
      state.machineId = machineId;
      state.step = 'input_amount';
      userStates.set(userId, state);

      await answerCallback(callbackQuery.id, '', token);
      await editMessage(chatId, messageId, 'Введите сумму инкассации (₴):', token);
      await sendMessage(chatId, '💰 Введите сумму:', token);
    }
    // Add comment
    else if (data === 'add_comment') {
      state.step = 'ask_comment';
      userStates.set(userId, state);
      await answerCallback(callbackQuery.id, '', token);
      await editMessage(chatId, messageId, '✏️ Введите комментарий:', token);
      await sendMessage(chatId, '📝 Введите ваш комментарий:', token);
    }
    // Skip comment
    else if (data === 'skip_comment') {
      state.comment = '';
      await answerCallback(callbackQuery.id, '', token);
      await saveCollection(chatId, userId, state, db, token);
    }
  } catch (error) {
    console.error('❌ Callback error:', error);
    await answerCallback(callbackQuery.id, '❌ Ошибка', token);
  }
}

async function saveCollection(chatId: number, userId: number, state: UserState, db: any, token: string) {
  try {
    // Save to database
    const now = new Date().toISOString();
    const result = await db
      .prepare(
        'INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .bind(state.machineId, state.name, state.amount, state.quantity, state.comment || '', now)
      .run();

    const recordId = result.meta.last_row_id;
    const date = new Date().toLocaleString('ru-RU');

    const summary = `✅ Инкассация добавлена! (Запись #${recordId})

📊 Данные:
• Инкассатор: ${state.name}
• Точка ID: ${state.pointId}
• Автомат ID: ${state.machineId}
• Сумма: ${state.amount}₴
• Количество: ${state.quantity} шт.
• Комментарий: ${state.comment || '—'}
• Дата: ${date}`;

    await sendMessage(chatId, summary, token);

    // Keep the name and ask for next point selection
    try {
      const pointsResult = await db.prepare('SELECT id, name FROM points ORDER BY name').all();
      const points = pointsResult.results as any[] || [];

      if (points.length > 0) {
        const keyboard = {
          inline_keyboard: points.map((p) => [
            { text: p.name, callback_data: `point_${p.id}` },
          ]),
        };
        await sendMessage(
          chatId,
          `📍 Готовы к следующей инкассации? Выберите точку:`,
          token,
          keyboard
        );
      }
    } catch (e) {
      addLog('❌ Error loading points after save: ' + String(e));
      await sendMessage(chatId, '❌ Ошибка загрузки точек для следующей инкассации', token);
    }

    // Reset state but keep name for next collection
    userStates.set(userId, {
      step: 'select_point',
      name: state.name,
      pointId: undefined,
      machineId: undefined,
      amount: undefined,
      quantity: undefined,
      comment: '',
    });
    addLog(`✅ State reset but kept name: ${state.name}`);
  } catch (error) {
    console.error('❌ Save error:', error);
    await sendMessage(chatId, `❌ Ошибка при сохранении: ${error}`, token);
    userStates.delete(userId);
  }
}

async function sendMessage(chatId: number, text: string, token: string, markup?: any) {
  const payload: any = { chat_id: chatId, text };
  if (markup) {
    payload.reply_markup = markup;
  }

  addLog(`📤 SEND MESSAGE to ${chatId}: ${text.substring(0, 50)}...`);

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!data.ok) {
      addLog('❌ Telegram API error: ' + data.description);
    } else {
      addLog('✅ Message sent successfully to Telegram');
    }
  } catch (e) {
    addLog('❌ Send error: ' + String(e));
  }
}

async function editMessage(chatId: number, messageId: number, text: string, token: string, markup?: any) {
  const payload: any = { chat_id: chatId, message_id: messageId, text };
  if (markup) {
    payload.reply_markup = markup;
  }

  await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

async function answerCallback(callbackId: string, text: string, token: string) {
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackId, text, show_alert: false }),
  });
}
