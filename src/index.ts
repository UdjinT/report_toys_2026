import { handleTelegramBot, debugLogs } from './bot';

export interface Env {
  D1_REPORT_TOYS: D1Database;
  TG_BOT_TOKEN: string;
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

    if (pathname === '/' || pathname === '') {
      return new Response(null, {
        status: 302,
        headers: { 'Location': '/admin.html' }
      });
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
      return new Response(JSON.stringify({
        status: 'Test endpoint',
        token: env.TG_BOT_TOKEN ? 'set' : 'NOT SET',
        db: env.D1_REPORT_TOYS ? 'connected' : 'NOT CONNECTED'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
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

    return serveStatic(request, env);
  }
};

async function apiHandler(request: Request, env: Env) {
  const url = new URL(request.url);
  const pathname = url.pathname;

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

async function serveStatic(request: Request, env: Env) {
  try {
    return await env.__STATIC_CONTENT.fetch(request);
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
