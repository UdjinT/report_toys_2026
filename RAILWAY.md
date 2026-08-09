# Развертывание Telegram бота на Railway

## Быстрый старт (5 минут)

1. **Создать аккаунт на Railway.app**
   - Перейди на https://railway.app
   - Зарегистрируйся через GitHub

2. **Деплоить этот проект**
   - Нажми "New Project" → "Deploy from GitHub"
   - Выбери этот репозиторий
   - Railway автоматически определит Node.js проект

3. **Настроить переменные окружения**
   - В Railway UI: Variables
   - Добавь: `WEBHOOK_URL=https://report_toys_2026.evtsarenko.workers.dev/webhook/telegram`

4. **Выбрать сервис для запуска**
   - В корне проекта создай `railway.json`:
   ```json
   {
     "build": {
       "builder": "dockerfile",
       "dockerfile": "Dockerfile.bot"
     }
   }
   ```

5. **Деплой**
   - Railway автоматически запустит бота
   - Бот будет работать 24/7 бесплатно

## Что происходит

- Бот на Railway выполняет polling каждые 5 секунд
- Получает обновления от Telegram API
- Отправляет их на твой Cloudflare Worker webhook
- Worker обрабатывает и сохраняет в D1 базу
- Ответы отправляются пользователю через Telegram API

## Стоимость

100% БЕСПЛАТНО на бесплатном плане Railway 🎉

## Если что-то не работает

1. Проверь логи в Railway UI
2. Убедись что WEBHOOK_URL правильный
3. Проверь что Worker работает: `https://report_toys_2026.evtsarenko.workers.dev/test/bot`
