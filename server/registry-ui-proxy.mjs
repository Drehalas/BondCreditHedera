/**
 * Dev/proxy server: forwards HOL Registry Broker calls so REGISTRY_BROKER_API_KEY stays server-side.
 * Run: node server/registry-ui-proxy.mjs
 * @see https://hol.org/registry/api/v1/openapi.json
 */
import http from "node:http";
import { URL } from "node:url";
import dotenv from "dotenv";

dotenv.config();

const PORT = Number(process.env.REGISTRY_PROXY_PORT || 8788);
const BASE = (process.env.REGISTRY_BROKER_API_URL || "https://hol.org/registry/api/v1").replace(
  /\/+$/,
  ""
);
const API_KEY = process.env.REGISTRY_BROKER_API_KEY || "";
const LOCAL_AGENT_CHAT = process.env.LOCAL_AGENT_CHAT === "true";
const LOCAL_AGENT_BASE = (process.env.LOCAL_AGENT_BASE || "http://127.0.0.1:3000").replace(
  /\/+$/,
  ""
);
const PROXY_ID = "bondcredit-registry-ui-proxy/1.1";

function markResponse(res) {
  res.setHeader("X-BondCredit-Registry-Proxy", PROXY_ID);
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function json(res, status, body) {
  cors(res);
  markResponse(res);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.statusCode = status;
  res.end(JSON.stringify(body));
}

function sendHtml(res, status, body) {
  cors(res);
  markResponse(res);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.statusCode = status;
  res.end(body);
}

/** Tiny SVG favicon (no external file) — avoids 404 in DevTools when visiting :8788 */
const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#12d4b6"/><text x="16" y="21" text-anchor="middle" fill="#05101e" font-family="system-ui,sans-serif" font-size="14" font-weight="700">B</text></svg>`;

function sendFavicon(res) {
  cors(res);
  markResponse(res);
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
  res.statusCode = 200;
  res.end(FAVICON_SVG);
}

/**
 * Normalize path from Node's req.url (sometimes absolute URI, query-only edge cases).
 */
function requestPathname(req) {
  const raw = String(req.url ?? "/").trim().split(/\s+/)[0] || "/";
  try {
    const u = /^https?:\/\//i.test(raw) ? new URL(raw) : new URL(raw, `http://127.0.0.1:${PORT}`);
    let p = u.pathname || "/";
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    return p || "/";
  } catch {
    return "/";
  }
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString();
}

async function brokerFetch(path, { method = "GET", body = null, useAuth = false } = {}) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${BASE}${normalizedPath}`;
  const headers = { Accept: "application/json" };
  if (body !== null) {
    headers["Content-Type"] = "application/json";
  }
  if (useAuth && API_KEY) {
    headers["x-api-key"] = API_KEY;
  }

  const requestOptions = { method, headers };
  if (body === null) {
    requestOptions.body = undefined;
  } else {
    requestOptions.body = JSON.stringify(body);
  }

  const res = await fetch(url, requestOptions);

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  return { ok: res.ok, status: res.status, data };
}

async function localAgentFetch(path, { method = "GET", body = null } = {}) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${LOCAL_AGENT_BASE}${normalizedPath}`;
  const headers = { Accept: "application/json" };
  if (body !== null) {
    headers["Content-Type"] = "application/json";
  }

  const requestOptions = { method, headers };
  if (body === null) {
    requestOptions.body = undefined;
  } else {
    requestOptions.body = JSON.stringify(body);
  }

  const res = await fetch(url, requestOptions);

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  return { ok: res.ok, status: res.status, data };
}

const server = http.createServer(async (req, res) => {
  cors(res);
  markResponse(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    const pathname = requestPathname(req);
    const rawUrl = String(req.url || "/").trim();
    const url = /^https?:\/\//i.test(rawUrl)
      ? new URL(rawUrl)
      : new URL(rawUrl, `http://127.0.0.1:${PORT}`);

    if (
      (req.method === "GET" || req.method === "HEAD") &&
      (pathname === "/favicon.ico" || pathname === "/favicon.svg")
    ) {
      if (req.method === "HEAD") {
        cors(res);
        markResponse(res);
        res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
        res.statusCode = 200;
        res.end();
        return;
      }
      sendFavicon(res);
      return;
    }

    if (req.method === "GET" && (pathname === "/" || pathname === "/index.html")) {
      const dataUri = `data:image/svg+xml,${encodeURIComponent(FAVICON_SVG)}`;
      sendHtml(
        res,
        200,
        `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>BondCredit · Registry UI proxy</title>
  <link rel="icon" href="${dataUri}" type="image/svg+xml" />
</head>
<body style="margin:0;font-family:system-ui,Segoe UI,sans-serif;background:#0a1020;color:#e8f2ff;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1.5rem;">
  <div style="max-width:36rem;border:1px solid rgba(255,255,255,0.12);border-radius:1rem;padding:1.5rem;background:rgba(10,21,42,0.85);">
    <p style="margin:0 0 0.5rem;font-size:0.75rem;letter-spacing:0.12em;text-transform:uppercase;color:#90a4c5;">BondCredit</p>
    <h1 style="margin:0 0 0.75rem;font-size:1.35rem;">Registry API proxy</h1>
    <p style="margin:0 0 1rem;line-height:1.5;color:#b7c5e0;">
      This port only forwards <code style="background:#050a14;padding:0.15rem 0.35rem;border-radius:0.35rem;">/api/registry/*</code> to the HOL broker.
      Open the React app instead:
    </p>
    <ul style="margin:0;padding-left:1.2rem;line-height:1.8;color:#c8d9f5;">
      <li><strong>Dev:</strong> <a href="http://localhost:5173/" style="color:#52f0cf;">http://localhost:5173/</a></li>
      <li><strong>Preview:</strong> <a href="http://localhost:4173/" style="color:#52f0cf;">http://localhost:4173/</a></li>
    </ul>
    <p style="margin:1rem 0 0;font-size:0.85rem;color:#90a4c5;">
      Health check: <a href="/api/registry/health" style="color:#7ee0ff;">/api/registry/health</a>
    </p>
  </div>
</body>
</html>`
      );
      return;
    }

    if (pathname === "/api/registry/health" && req.method === "GET") {
      json(res, 200, {
        ok: true,
        hasApiKey: Boolean(API_KEY),
        baseUrl: BASE,
        localAgentChat: LOCAL_AGENT_CHAT,
        localAgentBase: LOCAL_AGENT_BASE
      });
      return;
    }

    if (pathname === "/api/registry/search" && req.method === "GET") {
      const q = url.searchParams.get("q") || "hedera";
      const limit = url.searchParams.get("limit") || "5";
      const path = `/search?q=${encodeURIComponent(q)}&limit=${encodeURIComponent(limit)}`;
      const out = await brokerFetch(path, { useAuth: false });
      json(res, out.ok ? 200 : out.status, { ...out.data, _proxyStatus: out.status });
      return;
    }

    if (pathname === "/api/registry/stats" && req.method === "GET") {
      const out = await brokerFetch("/dashboard/stats", { useAuth: false });
      json(res, out.ok ? 200 : out.status, { ...out.data, _proxyStatus: out.status });
      return;
    }

    if (pathname === "/api/registry/chat/session" && req.method === "POST") {
      if (LOCAL_AGENT_CHAT) {
        const raw = await readBody(req);
        const body = raw ? JSON.parse(raw) : {};
        const out = await localAgentFetch("/api/agent/chat/session", {
          method: "POST",
          body
        });

        if (out.status === 404) {
          json(res, 503, {
            error: "local_agent_unavailable",
            message:
              "Local agent chat endpoint not found. Ensure backend is restarted with latest code and running on LOCAL_AGENT_BASE.",
            localAgentBase: LOCAL_AGENT_BASE,
            expectedPath: "/api/agent/chat/session"
          });
          return;
        }

        json(res, out.ok ? 200 : out.status, out.data ?? { error: "unknown" });
        return;
      }

      if (!API_KEY) {
        json(res, 200, {
          error: "missing_registry_key",
          message: "Set REGISTRY_BROKER_API_KEY in .env for authenticated chat."
        });
        return;
      }
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      const out = await brokerFetch("/chat/session", {
        method: "POST",
        body,
        useAuth: true
      });
      json(res, out.ok ? 200 : out.status, out.data ?? { error: "unknown" });
      return;
    }

    if (pathname === "/api/registry/chat/message" && req.method === "POST") {
      if (LOCAL_AGENT_CHAT) {
        const raw = await readBody(req);
        const body = raw ? JSON.parse(raw) : {};
        const out = await localAgentFetch("/api/agent/chat/message", {
          method: "POST",
          body
        });

        if (out.status === 404) {
          json(res, 503, {
            error: "local_agent_unavailable",
            message:
              "Local agent chat endpoint not found. Ensure backend is restarted with latest code and running on LOCAL_AGENT_BASE.",
            localAgentBase: LOCAL_AGENT_BASE,
            expectedPath: "/api/agent/chat/message"
          });
          return;
        }

        json(res, out.ok ? 200 : out.status, out.data ?? { error: "unknown" });
        return;
      }

      if (!API_KEY) {
        json(res, 200, {
          error: "missing_registry_key",
          message: "Set REGISTRY_BROKER_API_KEY in .env for authenticated chat."
        });
        return;
      }
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      const out = await brokerFetch("/chat/message", {
        method: "POST",
        body,
        useAuth: true
      });
      json(res, out.ok ? 200 : out.status, out.data ?? { error: "unknown" });
      return;
    }

    console.warn("[registry-ui-proxy] 404", {
      method: req.method,
      rawUrl: req.url,
      pathname
    });
    json(res, 404, { error: "not_found", pathname, hint: "restart proxy after git pull; check X-BondCredit-Registry-Proxy header" });
  } catch (e) {
    json(res, 500, {
      error: "proxy_error",
      message: e instanceof Error ? e.message : String(e)
    });
  }
});

/** Listen on all interfaces so http://localhost:PORT and http://127.0.0.1:PORT hit this process (avoids IPv4/IPv6 mismatch). */
server.listen(PORT, "0.0.0.0", () => {
  console.log(`[registry-ui-proxy] http://127.0.0.1:${PORT} · http://localhost:${PORT} (broker -> ${BASE})`);
});
