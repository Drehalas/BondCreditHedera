import cron from "node-cron";
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

  const hedera = new HederaAgentKitClient();
  await hedera.init();

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

  const vaultClient = new BonzoVaultClient();
  const volatilityService = new VolatilityService();
  const rebalancer = new VolatilityAwareRebalancer({
    volatilityService,
    vaultClient,
    minActionIntervalSeconds: config.app.minActionIntervalSeconds,
    onAfterTick: registry
      ? (payload) => registry.onRebalancerTick(payload)
      : undefined
  });

  logger.info("Starting volatility-aware-rebalancer", {
    cron: config.app.rebalancerCron,
    skill: config.registry.skillName,
    registry: Boolean(registry)
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
