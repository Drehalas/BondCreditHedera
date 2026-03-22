import cron from "node-cron";
import http from "node:http";
import { assertRequiredConfig, config } from "./config.js";
import { HederaAgentKitClient } from "./clients/hedera-agent-kit-client.js";
import { BonzoVaultClient } from "./clients/bonzo-vault-client.js";
import { RegistryBrokerClient } from "./clients/registry-broker-client.js";
import { VolatilityService } from "./services/volatility-service.js";
import { VolatilityAgentRegistry } from "./services/volatility-agent-registry.js";
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

  // HTTP API server for frontend polling
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

    if (req.url === "/api/volatility" && req.method === "GET") {
      res.writeHead(200);
      res.end(JSON.stringify(latestTick));
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
  });

  const apiPort = Number(process.env.API_PORT || 3000);
  apiServer.listen(apiPort, () => {
    logger.info("Volatility API server listening", { port: apiPort, endpoint: "/api/volatility" });
  });

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
