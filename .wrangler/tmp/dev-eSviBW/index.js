var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.ts
var jsonHeaders = { "Content-Type": "application/json;charset=UTF-8" };
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization"
};
function withCors(response) {
  Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value));
  return response;
}
__name(withCors, "withCors");
function prepareStatement(db, query, params = []) {
  const statement = db.prepare(query);
  return params.length ? statement.bind(...params) : statement;
}
__name(prepareStatement, "prepareStatement");
var src_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type,Authorization"
        },
        status: 204
      });
    }
    if (pathname === "/webhook/telegram") {
      if (request.method === "POST") {
        console.log("\u{1F514} Webhook POST received");
        try {
          const text = await request.text();
          console.log("Raw body:", text);
          const body = JSON.parse(text);
          console.log("\u{1F4E8} Parsed update:", body);
          await handleTelegramWebhook(body, env.D1_REPORT_TOYS, env.TG_BOT_TOKEN);
        } catch (e) {
          console.error("Telegram webhook error:", e);
        }
        return new Response("OK");
      }
      return new Response("OK");
    }
    if (pathname === "/api/login") {
      if (request.method === "POST") {
        return loginHandler(request, env);
      }
      return new Response("Method not allowed", { status: 405 });
    }
    if (pathname.startsWith("/api")) {
      return apiHandler(request, env);
    }
    return serveStatic(request, env);
  }
};
async function loginHandler(request, env) {
  const corsHeaders2 = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization"
  };
  try {
    const data = await request.json();
    const adminUsername = env.ADMIN_USERNAME || "toys_report-2026";
    const adminPassword = env.ADMIN_PASSWORD || "GU:el9vyi79UR_h8+";
    console.log("Login attempt, username:", data.username);
    console.log("Expected username:", adminUsername);
    console.log("Username match:", data.username === adminUsername);
    console.log("Password match:", data.password === adminPassword);
    if (data.username === adminUsername && data.password === adminPassword) {
      const token = btoa(`${data.username}:${Date.now()}`);
      return new Response(JSON.stringify({ success: true, token }), {
        headers: corsHeaders2,
        status: 200
      });
    }
    return new Response(JSON.stringify({ success: false, error: "Invalid credentials" }), {
      headers: corsHeaders2,
      status: 401
    });
  } catch (e) {
    console.error("Login error:", e);
    return new Response(JSON.stringify({ success: false, error: String(e) }), {
      headers: corsHeaders2,
      status: 400
    });
  }
}
__name(loginHandler, "loginHandler");
async function apiHandler(request, env) {
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/+$/, "");
  if (request.method === "OPTIONS") {
    return withCors(new Response(null, { status: 204 }));
  }
  const route = pathname.slice(4) || "/";
  console.log("API request", request.method, route, Object.fromEntries(url.searchParams.entries()));
  try {
    if (request.method === "GET" && route === "/points") {
      const result = await env.D1_REPORT_TOYS.prepare("SELECT * FROM points ORDER BY name").all();
      return withCors(new Response(JSON.stringify(result.results), { headers: jsonHeaders }));
    }
    if (request.method === "GET" && route === "/machines") {
      const pointId = url.searchParams.get("pointId");
      if (pointId) {
        const result2 = await env.D1_REPORT_TOYS.prepare("SELECT * FROM machines WHERE point_id = ? ORDER BY name").bind(pointId).all();
        return withCors(new Response(JSON.stringify(result2.results), { headers: jsonHeaders }));
      }
      const result = await env.D1_REPORT_TOYS.prepare("SELECT * FROM machines ORDER BY name").all();
      return withCors(new Response(JSON.stringify(result.results), { headers: jsonHeaders }));
    }
    if (request.method === "GET" && route === "/collections") {
      const machineId = url.searchParams.get("machineId");
      let query = `SELECT c.*, m.name AS machine_name, p.name AS point_name
        FROM collections c
        LEFT JOIN machines m ON m.id = c.machine_id
        LEFT JOIN points p ON p.id = m.point_id`;
      const params = [];
      if (machineId) {
        query += " WHERE c.machine_id = ?";
        params.push(machineId);
      }
      query += " ORDER BY c.created_at DESC";
      const result = await prepareStatement(env.D1_REPORT_TOYS, query, params).all();
      return withCors(new Response(JSON.stringify(result.results), { headers: jsonHeaders }));
    }
    if (request.method === "GET" && route === "/expenses") {
      const machineId = url.searchParams.get("machineId");
      let query = "SELECT * FROM expenses";
      const params = [];
      if (machineId) {
        query += " WHERE machine_id = ?";
        params.push(machineId);
      }
      query += " ORDER BY created_at DESC";
      const result = await prepareStatement(env.D1_REPORT_TOYS, query, params).all();
      return withCors(new Response(JSON.stringify(result.results), { headers: jsonHeaders }));
    }
    if (request.method === "GET" && route === "/stats") {
      const pointId = url.searchParams.get("pointId");
      const machineId = url.searchParams.get("machineId");
      const stats = await getStats(env.D1_REPORT_TOYS, pointId, machineId);
      return withCors(new Response(JSON.stringify(stats), { headers: jsonHeaders }));
    }
    if (request.method === "POST" && route === "/deposit") {
      const body = await request.json();
      const { machineId, collector, amount, quantity, comment } = body;
      await prepareStatement(
        env.D1_REPORT_TOYS,
        "INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))",
        [machineId, collector, amount, quantity, comment || ""]
      ).run();
      return withCors(new Response(JSON.stringify({ status: "ok" }), { headers: jsonHeaders }));
    }
    if (request.method === "POST" && route === "/expense") {
      const body = await request.json();
      const { machineId, amount, comment } = body;
      await prepareStatement(
        env.D1_REPORT_TOYS,
        "INSERT INTO expenses (machine_id, amount, comment, created_at) VALUES (?, ?, ?, datetime('now'))",
        [machineId, amount, comment || ""]
      ).run();
      return withCors(new Response(JSON.stringify({ status: "ok" }), { headers: jsonHeaders }));
    }
    if (request.method === "POST" && route === "/point") {
      const body = await request.json();
      const { name, description } = body;
      const result = await prepareStatement(env.D1_REPORT_TOYS, "INSERT INTO points (name, description) VALUES (?, ?)", [name, description || ""]).run();
      return withCors(new Response(JSON.stringify({ status: "ok", id: result.lastInsertId }), { headers: jsonHeaders }));
    }
    if (request.method === "POST" && route === "/machine") {
      const body = await request.json();
      const { pointId, name, type, description } = body;
      const result = await prepareStatement(
        env.D1_REPORT_TOYS,
        "INSERT INTO machines (point_id, name, type, description) VALUES (?, ?, ?, ?)",
        [pointId, name, type || "", description || ""]
      ).run();
      return withCors(new Response(JSON.stringify({ status: "ok", id: result.lastInsertId }), { headers: jsonHeaders }));
    }
    return withCors(new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: jsonHeaders }));
  } catch (error) {
    console.error("API error", request.method, route, error instanceof Error ? error.stack || error.message : error);
    return withCors(
      new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
        status: 500,
        headers: jsonHeaders
      })
    );
  }
}
__name(apiHandler, "apiHandler");
async function getStats(db, pointId, machineId) {
  if (machineId) {
    const result2 = await prepareStatement(
      db,
      `SELECT m.id AS machine_id, m.name AS machine_name, p.id AS point_id, p.name AS point_name,
        SUM(c.amount) AS total_amount, SUM(c.quantity) AS total_quantity
        FROM collections c
        LEFT JOIN machines m ON m.id = c.machine_id
        LEFT JOIN points p ON p.id = m.point_id
        WHERE m.id = ?
        GROUP BY m.id, p.id`,
      [machineId]
    ).all();
    return result2.results;
  }
  if (pointId) {
    console.log("getStats point", { pointId });
    const result2 = await prepareStatement(
      db,
      `SELECT p.id AS point_id, p.name AS point_name,
        SUM(c.amount) AS total_amount, SUM(c.quantity) AS total_quantity
        FROM collections c
        LEFT JOIN machines m ON m.id = c.machine_id
        LEFT JOIN points p ON p.id = m.point_id
        WHERE p.id = ?
        GROUP BY p.id`,
      [pointId]
    ).all();
    return result2.results;
  }
  console.log("getStats all");
  const result = await db.prepare(
    `SELECT p.id AS point_id, p.name AS point_name,
      SUM(c.amount) AS total_amount, SUM(c.quantity) AS total_quantity
      FROM collections c
      LEFT JOIN machines m ON m.id = c.machine_id
      LEFT JOIN points p ON p.id = m.point_id
      GROUP BY p.id`
  ).all();
  return result.results;
}
__name(getStats, "getStats");
async function serveStatic(request, env) {
  try {
    const response = await env.__STATIC_CONTENT.fetch(request);
    if (response.status === 404) {
      return await env.__STATIC_CONTENT.fetch(new Request(new URL("/index.html", request.url).toString(), request));
    }
    return response;
  } catch (err) {
    return new Response("Not found", { status: 404 });
  }
}
__name(serveStatic, "serveStatic");

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-mOl4Ns/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-mOl4Ns/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
