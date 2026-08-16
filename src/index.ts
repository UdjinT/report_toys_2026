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
  BOT_STATE_KV: KVNamespace;
  TG_BOT_TOKEN: string;
  TG_BOT_SECRET: string;
  ADMIN_PASSWORD_HASH: string;
  SESSION_SECRET: string;
  __STATIC_CONTENT: {
    fetch(request: Request): Promise<Response>;
  };
}

export default {
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
        const secretToken = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
        if (secretToken !== env.TG_BOT_SECRET) {
          console.error('❌ [WEBHOOK] Invalid secret token');
          return new Response('Unauthorized', { status: 401 });
        }

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

        await handleTelegramBot(body, env.D1_REPORT_TOYS, env.BOT_STATE_KV, env.TG_BOT_TOKEN);
        console.log('✅ [WEBHOOK] handleTelegramBot completed');
      } catch (e) {
        console.error('❌ [WEBHOOK] Telegram error:', e);
        console.error('❌ [WEBHOOK] Stack:', e instanceof Error ? e.stack : 'no stack');
      }
      return new Response('OK');
    }

    if (pathname === '/test/bot') {
      try {
        // Create tables if not exist
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

        await env.D1_REPORT_TOYS.prepare(`
          CREATE TABLE IF NOT EXISTS bot_config (
            id INTEGER PRIMARY KEY,
            offset INTEGER DEFAULT 0
          )
        `).run();

        await env.D1_REPORT_TOYS.prepare(
          'INSERT OR IGNORE INTO bot_config (id, offset) VALUES (1, 0)'
        ).run();

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
        const setupUrl = `https://api.telegram.org/bot${env.TG_BOT_TOKEN}/setWebhook`;

        const response = await fetch(setupUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: webhookUrl,
            secret_token: env.TG_BOT_SECRET,
            allowed_updates: ['message', 'callback_query']
          })
        });
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

    if (pathname === '/check/offset') {
      try {
        const result = await env.D1_REPORT_TOYS.prepare(
          'SELECT offset FROM bot_config WHERE id = 1'
        ).first() as any;
        return new Response(JSON.stringify({ ok: true, offset: result?.offset || 0 }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: String(e) }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    if (pathname === '/reset/offset' && request.method === 'POST') {
      try {
        await env.D1_REPORT_TOYS.prepare(
          'UPDATE bot_config SET offset = 0 WHERE id = 1'
        ).run();
        return new Response(JSON.stringify({ ok: true, message: 'Offset reset to 0' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: String(e) }), {
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
        await handleTelegramBot(testUpdate, env.D1_REPORT_TOYS, env.BOT_STATE_KV, env.TG_BOT_TOKEN);
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

  if (pathname === '/bot/poll') {
    try {
      // Get last offset from DB
      const offsetResult = await env.D1_REPORT_TOYS.prepare(
        'SELECT offset FROM bot_config WHERE id = 1'
      ).first() as any;
      const lastOffset = offsetResult?.offset || 0;

      // Get updates from Telegram
      const tgUrl = `https://api.telegram.org/bot${env.TG_BOT_TOKEN}/getUpdates?offset=${lastOffset + 1}&timeout=0&allowed_updates=message,callback_query`;
      const tgResponse = await fetch(tgUrl);
      const tgData = await tgResponse.json() as any;

      if (tgData.ok && tgData.result && tgData.result.length > 0) {
        // Process updates
        for (const update of tgData.result) {
          await handleTelegramBot(update, env.D1_REPORT_TOYS, env.BOT_STATE_KV, env.TG_BOT_TOKEN);
        }
        // Save new offset
        const newOffset = tgData.result[tgData.result.length - 1].update_id;
        await env.D1_REPORT_TOYS.prepare(
          'INSERT INTO bot_config (id, offset) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET offset = excluded.offset'
        ).bind(newOffset).run();
      }

      return new Response(JSON.stringify({ ok: true, count: tgData.result?.length || 0 }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: String(e) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
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
