import cron from "node-cron";
import { assertRequiredConfig, config } from "./config.js";
import { HederaAgentKitClient } from "./clients/hedera-agent-kit-client.js";
import { BonzoVaultClient } from "./clients/bonzo-vault-client.js";
import { VolatilityService } from "./services/volatility-service.js";
import { VolatilityAwareRebalancer } from "./keeper/rebalancer.js";
import { logger } from "./logger.js";

async function main() {
  assertRequiredConfig();

  const hedera = new HederaAgentKitClient();
  await hedera.init();

  const vaultClient = new BonzoVaultClient();
  const volatilityService = new VolatilityService();
  const rebalancer = new VolatilityAwareRebalancer({
    volatilityService,
    vaultClient,
    minActionIntervalSeconds: config.app.minActionIntervalSeconds
  });

  logger.info("Starting volatility-aware rebalancer", {
    cron: config.app.rebalancerCron
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
