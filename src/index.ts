import { handleTelegramUpdate } from './telegram.ts';

export interface Env {
  D1_REPORT_TOYS: D1Database;
  ADMIN_USERNAME: string;
  ADMIN_PASSWORD: string;
  TG_BOT_TOKEN: string;
  __STATIC_CONTENT: {
    fetch(request: Request): Promise<Response>;
  };
}

const jsonHeaders = { 'Content-Type': 'application/json;charset=UTF-8' };
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

function withCors(response: Response) {
  Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value));
  return response;
}

function prepareStatement(db: D1Database, query: string, params: Array<string | number> = []) {
  const statement = db.prepare(query);
  return params.length ? statement.bind(...params) : statement;
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Handle CORS preflight for all routes
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        },
        status: 204
      });
    }

    // Test endpoint
    if (pathname === '/test') {
      return new Response(JSON.stringify({ status: 'OK', time: new Date().toISOString() }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle Telegram webhook
    if (pathname === '/webhook/telegram') {
      console.log('🔔 Webhook path matched, method:', request.method);
      if (request.method === 'POST') {
        try {
          const body = await request.json();
          console.log('✅ TG update parsed:', JSON.stringify(body).substring(0, 200));
          await handleTelegramUpdate(body, env.TG_BOT_TOKEN);
          console.log('✅ Update handled');
        } catch (e) {
          console.error('❌ Telegram error:', e);
        }
        return new Response('OK');
      } else {
        console.log('⚠️ Non-POST request to webhook');
        return new Response('OK');
      }
    }

    // Handle login route BEFORE general /api routes
    if (pathname === '/api/login') {
      if (request.method === 'POST') {
        return loginHandler(request, env);
      }
      return new Response('Method not allowed', { status: 405 });
    }

    // Handle other API routes
    if (pathname.startsWith('/api')) {
      return apiHandler(request, env);
    }

    // Handle static files
    return serveStatic(request, env);
  },
};

async function loginHandler(request: Request, env: Env) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  };

  try {
    const data = await request.json() as { username?: string; password?: string };

    // Use env vars or fallback to hardcoded for debugging
    const adminUsername = env.ADMIN_USERNAME || 'toys_report-2026';
    const adminPassword = env.ADMIN_PASSWORD || 'GU:el9vyi79UR_h8+';

    console.log('Login attempt, username:', data.username);
    console.log('Expected username:', adminUsername);
    console.log('Username match:', data.username === adminUsername);
    console.log('Password match:', data.password === adminPassword);

    if (data.username === adminUsername && data.password === adminPassword) {
      const token = btoa(`${data.username}:${Date.now()}`);
      return new Response(JSON.stringify({ success: true, token }), {
        headers: corsHeaders,
        status: 200
      });
    }
    return new Response(JSON.stringify({ success: false, error: 'Invalid credentials' }), {
      headers: corsHeaders,
      status: 401
    });
  } catch (e) {
    console.error('Login error:', e);
    return new Response(JSON.stringify({ success: false, error: String(e) }), {
      headers: corsHeaders,
      status: 400
    });
  }
}

async function apiHandler(request: Request, env: Env) {
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/+$/, '');

  if (request.method === 'OPTIONS') {
    return withCors(new Response(null, { status: 204 }));
  }

  const route = pathname.slice(4) || '/';
  console.log('API request', request.method, route, Object.fromEntries(url.searchParams.entries()));
  try {
    if (request.method === 'GET' && route === '/points') {
      const result = await env.D1_REPORT_TOYS.prepare('SELECT * FROM points ORDER BY name').all();
      return withCors(new Response(JSON.stringify(result.results), { headers: jsonHeaders }));
    }

    if (request.method === 'GET' && route === '/machines') {
      const pointId = url.searchParams.get('pointId');
      if (pointId) {
        const result = await env.D1_REPORT_TOYS
          .prepare('SELECT * FROM machines WHERE point_id = ? ORDER BY name')
          .bind(pointId)
          .all();
        return withCors(new Response(JSON.stringify(result.results), { headers: jsonHeaders }));
      }
      const result = await env.D1_REPORT_TOYS
        .prepare('SELECT * FROM machines ORDER BY name')
        .all();
      return withCors(new Response(JSON.stringify(result.results), { headers: jsonHeaders }));
    }

    if (request.method === 'GET' && route === '/collections') {
      const machineId = url.searchParams.get('machineId');
      let query = `SELECT c.*, m.name AS machine_name, p.name AS point_name
        FROM collections c
        LEFT JOIN machines m ON m.id = c.machine_id
        LEFT JOIN points p ON p.id = m.point_id`;
      const params: Array<string | number> = [];
      if (machineId) {
        query += ' WHERE c.machine_id = ?';
        params.push(machineId);
      }
      query += ' ORDER BY c.created_at DESC';
      const result = await prepareStatement(env.D1_REPORT_TOYS, query, params).all();
      return withCors(new Response(JSON.stringify(result.results), { headers: jsonHeaders }));
    }

    if (request.method === 'GET' && route === '/expenses') {
      const machineId = url.searchParams.get('machineId');
      let query = 'SELECT * FROM expenses';
      const params: Array<string | number> = [];
      if (machineId) {
        query += ' WHERE machine_id = ?';
        params.push(machineId);
      }
      query += ' ORDER BY created_at DESC';
      const result = await prepareStatement(env.D1_REPORT_TOYS, query, params).all();
      return withCors(new Response(JSON.stringify(result.results), { headers: jsonHeaders }));
    }

    if (request.method === 'GET' && route === '/stats') {
      const pointId = url.searchParams.get('pointId');
      const machineId = url.searchParams.get('machineId');
      const stats = await getStats(env.D1_REPORT_TOYS, pointId, machineId);
      return withCors(new Response(JSON.stringify(stats), { headers: jsonHeaders }));
    }

    if (request.method === 'POST' && route === '/deposit') {
      const body = await request.json();
      const { machineId, collector, amount, quantity, comment } = body;
      await prepareStatement(env.D1_REPORT_TOYS,
        'INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'))',
        [machineId, collector, amount, quantity, comment || ''],
      ).run();
      return withCors(new Response(JSON.stringify({ status: 'ok' }), { headers: jsonHeaders }));
    }

    if (request.method === 'POST' && route === '/expense') {
      const body = await request.json();
      const { machineId, amount, comment } = body;
      await prepareStatement(env.D1_REPORT_TOYS,
        'INSERT INTO expenses (machine_id, amount, comment, created_at) VALUES (?, ?, ?, datetime(\'now\'))',
        [machineId, amount, comment || ''],
      ).run();
      return withCors(new Response(JSON.stringify({ status: 'ok' }), { headers: jsonHeaders }));
    }

    if (request.method === 'POST' && route === '/point') {
      const body = await request.json();
      const { name, description } = body;
      const result = await prepareStatement(env.D1_REPORT_TOYS,'INSERT INTO points (name, description) VALUES (?, ?)', [name, description || '']).run();
      return withCors(new Response(JSON.stringify({ status: 'ok', id: result.lastInsertId }), { headers: jsonHeaders }));
    }

    if (request.method === 'POST' && route === '/machine') {
      const body = await request.json();
      const { pointId, name, type, description } = body;
      const result = await prepareStatement(env.D1_REPORT_TOYS,
        'INSERT INTO machines (point_id, name, type, description) VALUES (?, ?, ?, ?)',
        [pointId, name, type || '', description || ''],
      ).run();
      return withCors(new Response(JSON.stringify({ status: 'ok', id: result.lastInsertId }), { headers: jsonHeaders }));
    }

    return withCors(new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: jsonHeaders }));
  } catch (error) {
    console.error('API error', request.method, route, error instanceof Error ? error.stack || error.message : error);
    return withCors(
      new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
        status: 500,
        headers: jsonHeaders,
      }),
    );
  }
}

async function getStats(db: D1Database, pointId: string | null, machineId: string | null) {
  if (machineId) {
    const result = await prepareStatement(db,
      `SELECT m.id AS machine_id, m.name AS machine_name, p.id AS point_id, p.name AS point_name,
        SUM(c.amount) AS total_amount, SUM(c.quantity) AS total_quantity
        FROM collections c
        LEFT JOIN machines m ON m.id = c.machine_id
        LEFT JOIN points p ON p.id = m.point_id
        WHERE m.id = ?
        GROUP BY m.id, p.id`,
      [machineId],
    ).all();
    return result.results;
  }

  if (pointId) {
    console.log('getStats point', { pointId });
    const result = await prepareStatement(db,
      `SELECT p.id AS point_id, p.name AS point_name,
        SUM(c.amount) AS total_amount, SUM(c.quantity) AS total_quantity
        FROM collections c
        LEFT JOIN machines m ON m.id = c.machine_id
        LEFT JOIN points p ON p.id = m.point_id
        WHERE p.id = ?
        GROUP BY p.id`,
      [pointId],
    ).all();
    return result.results;
  }

  console.log('getStats all');
  const result = await db.prepare(
    `SELECT p.id AS point_id, p.name AS point_name,
      SUM(c.amount) AS total_amount, SUM(c.quantity) AS total_quantity
      FROM collections c
      LEFT JOIN machines m ON m.id = c.machine_id
      LEFT JOIN points p ON p.id = m.point_id
      GROUP BY p.id`,
  ).all();
  return result.results;
}

async function serveStatic(request: Request, env: Env) {
  try {
    const response = await env.__STATIC_CONTENT.fetch(request);
    if (response.status === 404) {
      return await env.__STATIC_CONTENT.fetch(new Request(new URL('/index.html', request.url).toString(), request));
    }
    return response;
  } catch (err) {
    return new Response('Not found', { status: 404 });
  }
}
