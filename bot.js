const { Telegraf } = require('telegraf');
const axios = require('axios');

const BOT_TOKEN = '8952606142:AAHXzZ-5FrdRqNCc3GRd_9--yuq_YGXPmG8';
const API_URL = 'https://report-toys-2026.evtsarenko.workers.dev/api';

const bot = new Telegraf(BOT_TOKEN);

// Состояние пользователей
const userState = new Map();

console.log('🤖 Запуск бота...');

// Ответ на команду /start
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const firstName = ctx.from.first_name;

  console.log('📨 /start от пользователя:', userId, firstName);

  userState.set(userId, {
    step: 'ask_name',
    name: null,
    pointId: null,
    machineId: null,
    amount: null,
    quantity: null,
    comment: null,
  });

  await ctx.reply(
    `👋 Привет, ${firstName}!\n\nПожалуйста, введите ваше имя (как вы хотите отображаться в системе):`
  );
});

// Ответ на текстовые сообщения
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const text = ctx.message.text;
  let state = userState.get(userId);

  console.log('📝 Сообщение от', userId, ':', text);

  // Если нет состояния, но текст не команда - инициализируем
  if (!state) {
    state = {
      step: 'ask_name',
      name: text,
      pointId: null,
      machineId: null,
      amount: null,
      quantity: null,
      comment: null,
    };
    userState.set(userId, state);

    // Загружаем точки
    try {
      const response = await axios.get(`${API_URL}/points`);
      const points = response.data;

      if (!points || points.length === 0) {
        await ctx.reply('❌ Нет доступных точек');
        return;
      }

      const keyboard = {
        inline_keyboard: points.map((p) => [
          { text: p.name, callback_data: `point_${p.id}` },
        ]),
      };

      await ctx.reply(
        `✅ Спасибо, ${state.name}!\n\n📍 Выберите точку:`,
        {
          reply_markup: keyboard,
        }
      );
    } catch (error) {
      console.error('❌ Ошибка загрузки точек:', error.message);
      await ctx.reply('❌ Ошибка загрузки точек');
    }
    return;
  }

  // Шаг 1: Запрос имени
  if (state.step === 'ask_name') {
    state.name = text;
    state.step = 'select_point';
    userState.set(userId, state);

    // Загружаем точки
    try {
      const response = await axios.get(`${API_URL}/points`);
      const points = response.data;

      if (!points || points.length === 0) {
        await ctx.reply('❌ Нет доступных точек');
        return;
      }

      const keyboard = {
        inline_keyboard: points.map((p) => [
          { text: p.name, callback_data: `point_${p.id}` },
        ]),
      };

      await ctx.reply(`✅ Спасибо, ${state.name}!\n\n📍 Выберите точку:`, {
        reply_markup: keyboard,
      });
    } catch (error) {
      console.error('❌ Ошибка загрузки точек:', error.message);
      await ctx.reply('❌ Ошибка загрузки точек');
    }
  }
  // Шаг 2: Ввод суммы
  else if (state.step === 'input_amount') {
    const amount = parseFloat(text);
    if (isNaN(amount) || amount <= 0) {
      await ctx.reply('❌ Пожалуйста, введите корректную сумму:');
      return;
    }

    state.amount = amount;
    state.step = 'input_quantity';
    userState.set(userId, state);

    await ctx.reply(`✅ Сумма: ${amount}₴\n\nТеперь введите количество товаров:`);
  }
  // Шаг 3: Ввод количества
  else if (state.step === 'input_quantity') {
    const quantity = parseInt(text);
    if (isNaN(quantity) || quantity <= 0) {
      await ctx.reply('❌ Пожалуйста, введите корректное количество:');
      return;
    }

    state.quantity = quantity;
    state.step = 'ask_comment';
    userState.set(userId, state);

    const keyboard = {
      inline_keyboard: [
        [
          { text: '✏️ Добавить комментарий', callback_data: 'add_comment' },
          { text: '⏭️ Пропустить', callback_data: 'skip_comment' },
        ],
      ],
    };

    await ctx.reply(
      `✅ Количество: ${quantity} шт.\n\nХотите добавить комментарий?`,
      {
        reply_markup: keyboard,
      }
    );
  }
  // Шаг 4: Комментарий
  else if (state.step === 'input_comment') {
    state.comment = text;
    state.step = 'input_comment';
    await saveCollection(ctx, userId, state);
  }
});

// Обработка кнопок
bot.on('callback_query', async (ctx) => {
  const userId = ctx.from.id;
  const data = ctx.callbackQuery.data;
  const state = userState.get(userId);

  console.log('🔘 Кнопка от', userId, ':', data);

  if (!state) {
    await ctx.answerCbQuery('⚠️ Сессия истекла, напиши /start');
    return;
  }

  try {
    // Выбор точки
    if (data.startsWith('point_')) {
      const pointId = parseInt(data.split('_')[1]);
      state.pointId = pointId;
      state.step = 'select_machine';
      userState.set(userId, state);

      // Загружаем автоматы для этой точки
      const response = await axios.get(`${API_URL}/machines?pointId=${pointId}`);
      const machines = response.data;

      if (!machines || machines.length === 0) {
        await ctx.answerCbQuery();
        await ctx.editMessageText('❌ Нет автоматов на этой точке');
        return;
      }

      const keyboard = {
        inline_keyboard: machines.map((m) => [
          { text: m.name, callback_data: `machine_${m.id}` },
        ]),
      };

      await ctx.answerCbQuery();
      await ctx.editMessageText('🤖 Выберите автомат:', {
        reply_markup: keyboard,
      });
    }
    // Выбор автомата
    else if (data.startsWith('machine_')) {
      const machineId = parseInt(data.split('_')[1]);
      state.machineId = machineId;
      state.step = 'input_amount';
      userState.set(userId, state);

      await ctx.answerCbQuery();
      await ctx.editMessageText('Введите сумму инкассации (₴):');
      await ctx.reply('💰 Введите сумму:');
    }
    // Добавить комментарий
    else if (data === 'add_comment') {
      state.step = 'input_comment';
      userState.set(userId, state);
      await ctx.answerCbQuery();
      await ctx.editMessageText('✏️ Введите комментарий:');
      await ctx.reply('📝 Введите ваш комментарий:');
    }
    // Пропустить комментарий
    else if (data === 'skip_comment') {
      state.comment = '';
      await saveCollection(ctx, userId, state);
    }
  } catch (error) {
    console.error('❌ Ошибка при обработке кнопки:', error.message);
    await ctx.answerCbQuery('❌ Ошибка');
    await ctx.reply('❌ Ошибка обработки');
  }
});

// Сохранение инкассации в БД
async function saveCollection(ctx, userId, state) {
  try {
    // Отправляем данные в API Worker'а
    const response = await axios.post(`${API_URL}/deposit`, {
      machineId: state.machineId,
      collector: state.name,
      amount: state.amount,
      quantity: state.quantity,
      comment: state.comment || '',
    });

    console.log('✅ Инкассация сохранена в БД:', response.data);

    const date = new Date().toLocaleString('ru-RU');
    const recordId = response.data.id || '?';

    const summary = `✅ Инкассация добавлена! (Запись #${recordId})

📊 Данные:
• Инкассатор: ${state.name}
• Точка ID: ${state.pointId}
• Автомат ID: ${state.machineId}
• Сумма: ${state.amount}₴
• Количество: ${state.quantity} шт.
• Комментарий: ${state.comment || '—'}
• Дата: ${date}`;

    await ctx.reply(summary);

    // Очищаем состояние пользователя
    userState.delete(userId);
    console.log('✅ Состояние очищено для пользователя', userId);
  } catch (error) {
    console.error('❌ Ошибка при сохранении:', error.message);
    await ctx.reply(`❌ Ошибка при сохранении: ${error.message}`);
    userState.delete(userId);
  }
}

// Запуск бота
bot.launch({
  polling: {
    interval: 300,
    timeout: 20,
  },
});

console.log('✅ Бот запущен в режиме polling');
console.log('Бот: @collector_Treport_bot');

// Корректная остановка
process.once('SIGINT', () => {
  console.log('🛑 Остановка бота...');
  bot.stop('SIGINT');
  process.exit(0);
});

process.once('SIGTERM', () => {
  console.log('🛑 Остановка бота...');
  bot.stop('SIGTERM');
  process.exit(0);
});
