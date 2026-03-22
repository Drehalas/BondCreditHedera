import cron from "node-cron";
import http from "node:http";
import { assertRequiredConfig, config } from "./config.js";
import { HederaAgentKitClient } from "./clients/hedera-agent-kit-client.js";
import { BonzoVaultClient } from "./clients/bonzo-vault-client.js";
import { RegistryBrokerClient } from "./clients/registry-broker-client.js";
import { VolatilityService } from "./services/volatility-service.js";
import { VolatilityAgentRegistry } from "./services/volatility-agent-registry.js";
import { AgentChatRouter } from "./services/agent-chat-router.js";
import { VolatilityAwareRebalancer } from "./keeper/rebalancer.js";
import { logger } from "./logger.js";

async function main() {
  assertRequiredConfig();

  // Shared state for latest volatility tick (accessible via HTTP API)
  const latestTick = {
    timestamp: new Date().toISOString(),
    volatility: null,
    action: null,
    executed: false,
    skipReason: null
  };

  const chatSessions = new Map();

  const sendJson = (res, statusCode, body) => {
    res.writeHead(statusCode, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };

  const readBody = async (req) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString("utf8");
    return raw ? JSON.parse(raw) : {};
  };

  const hedera = new HederaAgentKitClient();
  await hedera.init();

  logger.info("Agent identity initialized", {
    mode: config.app.mode,
    network: config.hedera.network,
    accountId: hedera.isLive() ? config.hedera.accountId : "(demo)",
    skillName: config.registry.skillName,
    registryEnabled: config.registry.enabled
  });

  let registry = null;
  if (config.registry.enabled) {
    const registryClient = new RegistryBrokerClient({
      baseUrl: config.registry.baseUrl,
      apiKey: config.registry.apiKey
    });
    registry = new VolatilityAgentRegistry({ config, registryClient });
    await registry.init();
    if (config.registry.discoverOnStartup) {
      await registry.discoverPeers("hedera defi bonzo volatility", 3);
    }
  } else {
    logger.info("Registry integration disabled (set REGISTRY_BROKER_API_KEY or REGISTRY_ENABLED=true)");
  }

  const vaultClient = new BonzoVaultClient({ hederaClient: hedera });
  const chatRouter = new AgentChatRouter({
    vaultClient,
    hederaClient: hedera,
    getLatestTick: () => ({ ...latestTick }),
    onAfterChatAction: async (payload) => {
      if (registry) {
        await registry.onChatAction(payload);
      }
    }
  });

  // HTTP API server for frontend polling + local chat router
  const apiServer = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Content-Type", "application/json");

    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    const parsed = new URL(req.url || "/", "http://127.0.0.1");

    if (parsed.pathname === "/api/volatility" && req.method === "GET") {
      return sendJson(res, 200, latestTick);
    }

    if (parsed.pathname === "/api/agent/chat/session" && req.method === "POST") {
      readBody(req)
        .then(async (body) => {
          const session = await chatRouter.openSession({ uaid: body.uaid });
          chatSessions.set(session.sessionId, {
            createdAt: Date.now(),
            uaid: session.uaid
          });
          sendJson(res, 200, session);
        })
        .catch((error) => {
          sendJson(res, 400, {
            ok: false,
            error: "invalid_json",
            message: error instanceof Error ? error.message : String(error)
          });
        });
      return;
    }

    if (parsed.pathname === "/api/agent/chat/message" && req.method === "POST") {
      readBody(req)
        .then(async (body) => {
          let sid = String(body.sessionId || "").trim();
          const message = String(body.message || "").trim();
          const requestId = body.requestId ? String(body.requestId) : null;

          if (!sid || !chatSessions.has(sid)) {
            const session = await chatRouter.openSession({ uaid: body.uaid || null });
            sid = session.sessionId;
            chatSessions.set(sid, {
              createdAt: Date.now(),
              uaid: session.uaid
            });
          }

          if (!message) {
            return sendJson(res, 400, {
              ok: false,
              error: "empty_message",
              message: "message is required"
            });
          }

          const result = await chatRouter.handleMessage({
            sessionId: sid,
            message,
            requestId
          });

          sendJson(res, result.ok ? 200 : 400, result);
        })
        .catch((error) => {
          sendJson(res, 400, {
            ok: false,
            error: "invalid_json",
            message: error instanceof Error ? error.message : String(error)
          });
        });
      return;
    }

    sendJson(res, 404, { error: "not_found" });
  });

  const apiPort = Number(process.env.API_PORT || 3000);
  apiServer.listen(apiPort, () => {
    logger.info("Volatility API server listening", { port: apiPort, endpoint: "/api/volatility" });
  });

  const volatilityService = new VolatilityService();
  const rebalancer = new VolatilityAwareRebalancer({
    volatilityService,
    vaultClient,
    minActionIntervalSeconds: config.app.minActionIntervalSeconds,
    onAfterTick: async (payload) => {
      // Update shared state for API endpoint
      latestTick.timestamp = new Date().toISOString();
      latestTick.volatility = payload.volatility;
      latestTick.action = payload.action;
      latestTick.executed = payload.executed;
      latestTick.skipReason = payload.skipReason;

      // Also emit to registry if enabled
      if (registry) {
        await registry.onRebalancerTick(payload);
      }
    }
  });

  logger.info("Starting volatility-aware-rebalancer", {
    cron: config.app.rebalancerCron,
    skill: config.registry.skillName,
    registry: Boolean(registry),
    apiEndpoint: `http://localhost:${apiPort}/api/volatility`
  });

  cron.schedule(config.app.rebalancerCron, async () => {
    try {
      await rebalancer.tick();
    } catch (error) {
      logger.error("Rebalancer tick failed", {
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
}

main().catch((error) => {
  logger.error("Fatal startup error", {
    message: error instanceof Error ? error.message : String(error)
  });
  process.exit(1);
});
