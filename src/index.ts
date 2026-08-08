import { handleTelegramBot } from './bot';

export interface Env {
  D1_REPORT_TOYS: D1Database;
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

    if (pathname.startsWith('/api/')) {
      return apiHandler(request, env);
    }

    if (pathname === '/webhook/telegram' && request.method === 'POST') {
      try {
        const body = await request.json();
        await handleTelegramBot(body, env.D1_REPORT_TOYS, env.TG_BOT_TOKEN);
      } catch (e) {
        console.error('Telegram error:', e);
      }
      return new Response('OK');
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
