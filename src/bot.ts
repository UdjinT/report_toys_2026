interface UserState {
  step: 'ask_name' | 'select_point' | 'select_machine' | 'input_amount' | 'input_quantity' | 'ask_comment';
  name?: string;
  pointId?: number;
  machineId?: number;
  amount?: number;
  quantity?: number;
  comment?: string;
}

async function loadUserState(db: any, kv: any, userId: number): Promise<UserState | null> {
  try {
    const kvKey = `user:${userId}:state`;

    // Try hot cache (KV) first - very fast (~10ms)
    try {
      const cached = await kv.get(kvKey, 'json');
      if (cached) {
        addLog(`📦 [CACHE HIT] User ${userId} state loaded from KV`);
        return cached as UserState;
      }
    } catch (kvError) {
      addLog(`⚠️ [KV ERROR] Failed to read from KV: ${kvError}`);
      // Continue to D1 fallback
    }

    // Fallback to cold storage (D1)
    const startTime = Date.now();
    const result = await db.prepare(
      'SELECT step, name, point_id, machine_id, amount, quantity, comment FROM bot_user_states WHERE user_id = ?'
    ).bind(userId).first();

    const loadTime = Date.now() - startTime;
    addLog(`📦 [D1 READ] User ${userId} took ${loadTime}ms, found: ${!!result}`);

    if (!result) return null;

    const state = {
      step: result.step as any,
      name: result.name,
      pointId: result.point_id,
      machineId: result.machine_id,
      amount: result.amount,
      quantity: result.quantity,
      comment: result.comment,
    };

    // Populate hot cache for next request (24h TTL)
    try {
      await kv.put(kvKey, JSON.stringify(state), { expirationTtl: 86400 });
      addLog(`💾 [KV WRITE] User ${userId} state cached in KV`);
    } catch (kvError) {
      addLog(`⚠️ [KV WRITE ERROR] Failed to cache: ${kvError}`);
    }

    return state;
  } catch (e) {
    console.error('Error loading user state:', e);
    addLog(`❌ [LOAD ERROR] ${String(e)}`);
    return null;
  }
}

async function saveUserState(db: any, kv: any, userId: number, state: UserState): Promise<void> {
  try {
    const kvKey = `user:${userId}:state`;
    const startTime = Date.now();

    // Write to both simultaneously (atomic from user perspective)
    const [dbResult, kvResult] = await Promise.allSettled([
      // Cold storage: D1
      db.prepare(`
        INSERT INTO bot_user_states (user_id, step, name, point_id, machine_id, amount, quantity, comment)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          step = excluded.step,
          name = excluded.name,
          point_id = excluded.point_id,
          machine_id = excluded.machine_id,
          amount = excluded.amount,
          quantity = excluded.quantity,
          comment = excluded.comment,
          updated_at = CURRENT_TIMESTAMP
      `).bind(userId, state.step, state.name, state.pointId, state.machineId, state.amount, state.quantity, state.comment).run(),

      // Hot cache: KV (24h TTL)
      kv.put(kvKey, JSON.stringify(state), { expirationTtl: 86400 })
    ]);

    const saveTime = Date.now() - startTime;

    if (dbResult.status === 'fulfilled') {
      addLog(`💾 [D1 WRITE] User ${userId} saved (${saveTime}ms)`);
    } else {
      addLog(`❌ [D1 ERROR] User ${userId}: ${dbResult.reason}`);
    }

    if (kvResult.status === 'fulfilled') {
      addLog(`💾 [KV WRITE] User ${userId} cached`);
    } else {
      addLog(`⚠️ [KV CACHE ERROR] ${kvResult.reason}`);
    }
  } catch (e) {
    console.error('Error saving user state:', e);
    addLog(`❌ [SAVE ERROR] ${String(e)}`);
  }
}

// Debug logging
const debugLogs: string[] = [];
const addLog = (msg: string) => {
  console.log(msg);
  debugLogs.push(msg);
};

export { debugLogs };

export async function handleTelegramBot(update: any, db: any, kv: any, token: string) {
  try {
    addLog('🤖 TG Update: ' + update.update_id);
    addLog('📨 Update data: ' + JSON.stringify(update).substring(0, 200));

    const message = update.message;
    const callbackQuery = update.callback_query;

    if (message) {
      addLog('✅ Has message, calling handleMessage');
      await handleMessage(message, db, kv, token);
    } else if (callbackQuery) {
      addLog('✅ Has callback_query, calling handleCallback');
      await handleCallback(callbackQuery, db, kv, token);
    } else {
      addLog('⚠️ No message or callback_query found');
    }
  } catch (error) {
    addLog('❌ Bot error: ' + String(error));
  }
}

async function handleMessage(message: any, db: any, kv: any, token: string) {
  const userId = message.from.id;
  const chatId = message.chat.id;
  const text = message.text;

  addLog(`📝 Message from ${userId}: ${text}`);

  // Load from cache or DB
  let state = await loadUserState(db, kv, userId);

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
      await saveUserState(db, kv, userId, state);
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
    await saveUserState(db, userId, state);

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
    await saveUserState(db, userId, state);
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
    await saveUserState(db, userId, state);

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
    await saveCollection(chatId, userId, state, db, kv, token);
  }
}

async function handleCallback(callbackQuery: any, db: any, kv: any, token: string) {
  const userId = callbackQuery.from.id;
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  const messageId = callbackQuery.message.message_id;

  addLog(`🔘 Button from ${userId}: ${data}`);

  // Load from cache or DB
  let state = await loadUserState(db, kv, userId);
  addLog(`📦 Loaded state for user ${userId}:`, state ? JSON.stringify(state) : 'NULL');

  if (!state) {
    addLog(`❌ State not found for user ${userId} - session expired`);
    await answerCallback(callbackQuery.id, '⚠️ Сессия истекла', token);
    return;
  }

  try {
    // Select point
    if (data.startsWith('point_')) {
      const pointId = parseInt(data.split('_')[1]);
      state.pointId = pointId;
      state.step = 'select_machine';
      await saveUserState(db, kv, userId, state);

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
      await saveUserState(db, kv, userId, state);

      await answerCallback(callbackQuery.id, '', token);
      await editMessage(chatId, messageId, 'Введите сумму инкассации (₴):', token);
    }
    // Add comment
    else if (data === 'add_comment') {
      state.step = 'ask_comment';
      await saveUserState(db, kv, userId, state);
      await answerCallback(callbackQuery.id, '', token);
      await editMessage(chatId, messageId, '✏️ Введите комментарий:', token);
    }
    // Skip comment
    else if (data === 'skip_comment') {
      state.comment = '';
      await answerCallback(callbackQuery.id, '', token);
      await saveCollection(chatId, userId, state, db, kv, token);
    }
  } catch (error) {
    console.error('❌ Callback error:', error);
    await answerCallback(callbackQuery.id, '❌ Ошибка', token);
  }
}

async function saveCollection(chatId: number, userId: number, state: UserState, db: any, kv: any, token: string) {
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
    await saveUserState(db, userId, {
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
  try {
    const payload: any = { chat_id: chatId, message_id: messageId, text };
    if (markup) {
      payload.reply_markup = markup;
    }

    const response = await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json() as any;
    if (!result.ok) {
      addLog(`⚠️ editMessage failed: ${result.description}`);
      // Fallback: send new message if edit fails
      await sendMessage(chatId, text, token, markup);
    }
  } catch (e) {
    addLog(`❌ editMessage error: ${String(e)}`);
  }
}

async function answerCallback(callbackId: string, text: string, token: string) {
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackId, text, show_alert: false }),
  });
}
