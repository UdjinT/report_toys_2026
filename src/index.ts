import { handleTelegramBot, debugLogs } from './bot';
import {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  createSessionCookie,
  verifySessionCookie,
  parseCookies,
  createLoginResponse,
  createSuccessResponse,
  createLogoutResponse,
} from './auth';

export interface Env {
  D1_REPORT_TOYS: D1Database;
  TG_BOT_TOKEN: string;
  ADMIN_PASSWORD_HASH: string;
  SESSION_SECRET: string;
  __STATIC_CONTENT: {
    fetch(request: Request): Promise<Response>;
  };
}

let lastUpdateId = 0;

export default {
  async scheduled(event: any, env: Env) {
    // Cron trigger for polling Telegram updates every 3 seconds
    try {
      console.log(`🤖 Polling updates, lastUpdateId=${lastUpdateId}`);
      const offset = lastUpdateId > 0 ? lastUpdateId + 1 : 0;
      const url = `https://api.telegram.org/bot${env.TG_BOT_TOKEN}/getUpdates?offset=${offset}&timeout=1&allowed_updates=message,callback_query`;
      const response = await fetch(url);
      const result = await response.json() as any;

      if (result.ok && result.result && result.result.length > 0) {
        console.log(`✅ Got ${result.result.length} updates`);
        for (const update of result.result) {
          lastUpdateId = update.update_id;
          await handleTelegramBot(update, env.D1_REPORT_TOYS, env.TG_BOT_TOKEN);
        }
      }
    } catch (e) {
      console.error('❌ Cron polling error:', e);
    }
  },

  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    // Root path serves index.html (admin dashboard)
    if (pathname === '/' || pathname === '') {
      const indexRequest = new Request(new URL('/index.html', request.url).toString());
      return serveStatic(indexRequest, env);
    }

    if (pathname.startsWith('/api/')) {
      return apiHandler(request, env);
    }

    if (pathname === '/webhook/telegram' && request.method === 'POST') {
      console.log('🔔 [WEBHOOK] POST /webhook/telegram received');
      try {
        const body = await request.json();
        console.log('🔔 [WEBHOOK] Parsed JSON:', JSON.stringify(body).substring(0, 200));
        console.log('🔔 [WEBHOOK] update_id:', body.update_id);
        console.log('🔔 [WEBHOOK] has message:', !!body.message);
        console.log('🔔 [WEBHOOK] has callback_query:', !!body.callback_query);

        if (!env.TG_BOT_TOKEN) {
          console.error('❌ [WEBHOOK] TG_BOT_TOKEN not set in env!');
          return new Response('Error: No token', { status: 500 });
        }
        console.log('✅ [WEBHOOK] TG_BOT_TOKEN is set');

        await handleTelegramBot(body, env.D1_REPORT_TOYS, env.TG_BOT_TOKEN);
        console.log('✅ [WEBHOOK] handleTelegramBot completed');
      } catch (e) {
        console.error('❌ [WEBHOOK] Telegram error:', e);
        console.error('❌ [WEBHOOK] Stack:', e instanceof Error ? e.stack : 'no stack');
      }
      return new Response('OK');
    }

    if (pathname === '/test/bot') {
      try {
        // Create table if not exists
        await env.D1_REPORT_TOYS.prepare(`
          CREATE TABLE IF NOT EXISTS bot_user_states (
            user_id INTEGER PRIMARY KEY,
            step TEXT NOT NULL,
            name TEXT,
            point_id INTEGER,
            machine_id INTEGER,
            amount INTEGER,
            quantity INTEGER,
            comment TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `).run();

        return new Response(JSON.stringify({
          status: 'Test endpoint',
          token: env.TG_BOT_TOKEN ? 'set' : 'NOT SET',
          db: env.D1_REPORT_TOYS ? 'connected' : 'NOT CONNECTED',
          table_created: true
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (e) {
        return new Response(JSON.stringify({
          status: 'Error',
          error: String(e)
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    if (pathname === '/setup/webhook' && request.method === 'POST') {
      try {
        const webhookUrl = `https://${new URL(request.url).host}/webhook/telegram`;
        const setupUrl = `https://api.telegram.org/bot${env.TG_BOT_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}`;

        const response = await fetch(setupUrl);
        const result = await response.json() as any;

        return new Response(JSON.stringify({
          ok: result.ok,
          description: result.description,
          webhook_url: webhookUrl,
          result: result.result
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (e) {
        return new Response(JSON.stringify({
          ok: false,
          error: String(e)
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    if (pathname === '/test/webhook' && request.method === 'POST') {
      try {
        debugLogs.length = 0; // Clear previous logs
        const testUpdate = {
          update_id: Math.random() * 1000000,
          message: {
            message_id: 1,
            from: { id: 123456789, is_bot: false, first_name: 'TestUser' },
            chat: { id: 123456789, type: 'private' },
            date: Math.floor(Date.now() / 1000),
            text: 'Иван Иванов'
          }
        };
        await handleTelegramBot(testUpdate, env.D1_REPORT_TOYS, env.TG_BOT_TOKEN);
        return new Response(JSON.stringify({ ok: true, logs: debugLogs }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: String(e), logs: debugLogs }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    if (pathname === '/bot/updates' && request.method === 'GET') {
      try {
        const offset = new URL(request.url).searchParams.get('offset') || '0';
        const url = `https://api.telegram.org/bot${env.TG_BOT_TOKEN}/getUpdates?offset=${offset}&timeout=1&allowed_updates=message,callback_query`;

        const response = await fetch(url);
        const result = await response.json() as any;

        if (result.ok && result.result && result.result.length > 0) {
          for (const update of result.result) {
            await handleTelegramBot(update, env.D1_REPORT_TOYS, env.TG_BOT_TOKEN);
          }
        }

        return new Response(JSON.stringify({ ok: true, count: result.result?.length || 0 }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: String(e) }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return serveStatic(request, env);
  }
};

async function apiHandler(request: Request, env: Env) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // ===== AUTH ENDPOINTS (PUBLIC) =====
  if (pathname === '/api/auth/login' && request.method === 'POST') {
    return handleLogin(request, env);
  }

  if (pathname === '/api/auth/logout' && request.method === 'POST') {
    return createLogoutResponse();
  }

  if (pathname === '/api/auth/me') {
    return handleAuthMe(request, env);
  }

  // ===== PUBLIC API ENDPOINTS (no auth required) =====
  if (pathname === '/api/points') {
    const result = await env.D1_REPORT_TOYS.prepare('SELECT * FROM points ORDER BY name').all();
    return new Response(JSON.stringify(result.results || []), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  if (pathname === '/api/machines') {
    const pointId = url.searchParams.get('pointId');
    let query = 'SELECT * FROM machines';
    if (pointId) query += ' WHERE point_id = ?';
    query += ' ORDER BY name';

    const stmt = env.D1_REPORT_TOYS.prepare(query);
    const result = pointId ? await stmt.bind(pointId).all() : await stmt.all();
    return new Response(JSON.stringify(result.results || []), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  if (pathname === '/api/collections') {
    const result = await env.D1_REPORT_TOYS.prepare(`
      SELECT c.*, m.name AS machine_name, p.name AS point_name
      FROM collections c
      LEFT JOIN machines m ON m.id = c.machine_id
      LEFT JOIN points p ON p.id = m.point_id
      ORDER BY c.created_at DESC
    `).all();
    return new Response(JSON.stringify(result.results || []), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  if (pathname === '/api/stats') {
    const result = await env.D1_REPORT_TOYS.prepare(`
      SELECT p.id AS point_id, p.name AS point_name,
        SUM(c.amount) AS total_amount, SUM(c.quantity) AS total_quantity
      FROM collections c
      LEFT JOIN machines m ON m.id = c.machine_id
      LEFT JOIN points p ON p.id = m.point_id
      GROUP BY p.id
    `).all();
    return new Response(JSON.stringify(result.results || []), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  return new Response('Not found', { status: 404 });
}

// ===== AUTH HELPERS =====
async function checkAuth(request: Request, env: Env): Promise<boolean> {
  if (!env.SESSION_SECRET) {
    console.error('❌ SESSION_SECRET not set');
    return false;
  }

  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = parseCookies(cookieHeader);
  const sessionCookie = cookies.session;

  if (!sessionCookie) {
    return false;
  }

  const isValid = await verifySessionCookie(sessionCookie, env.SESSION_SECRET);
  return !!isValid;
}

async function handleLogin(request: Request, env: Env): Promise<Response> {
  if (!env.ADMIN_PASSWORD_HASH || !env.SESSION_SECRET) {
    console.error('❌ Missing auth config: ADMIN_PASSWORD_HASH or SESSION_SECRET');
    return createLoginResponse('Server configuration error', 500);
  }

  try {
    const body = await request.json() as { password?: string };
    const password = body.password?.trim();

    if (!password) {
      return createLoginResponse('Password required');
    }

    const isValid = await verifyPassword(password, env.ADMIN_PASSWORD_HASH);

    if (!isValid) {
      return createLoginResponse('Invalid password');
    }

    // Create session
    const sessionToken = generateSessionToken();
    const cookieValue = await createSessionCookie(sessionToken, env.SESSION_SECRET);

    const setCookieHeader = `session=${cookieValue}; Path=/; Max-Age=86400; HttpOnly; Secure; SameSite=Lax`;

    return createSuccessResponse(
      { message: 'Logged in successfully' },
      setCookieHeader
    );
  } catch (e) {
    console.error('Login error:', e);
    return createLoginResponse('Invalid request', 400);
  }
}

async function handleAuthMe(request: Request, env: Env): Promise<Response> {
  const isAuth = await checkAuth(request, env);

  if (!isAuth) {
    return createLoginResponse('Not authenticated', 401);
  }

  return createSuccessResponse({ authenticated: true });
}

async function serveStatic(request: Request, env: Env) {
  try {
    return await env.__STATIC_CONTENT.fetch(request);
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
