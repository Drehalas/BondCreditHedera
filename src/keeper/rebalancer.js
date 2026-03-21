import {
  determineAction,
  rangeOffsetsForAction,
  RebalanceAction
} from "../core/decision-engine.js";
import { logger } from "../logger.js";

export class VolatilityAwareRebalancer {
  constructor({ volatilityService, vaultClient, minActionIntervalSeconds }) {
    this.volatilityService = volatilityService;
    this.vaultClient = vaultClient;
    this.minActionIntervalMs = minActionIntervalSeconds * 1000;
    this.lastActionAt = 0;
  }

  async tick() {
    const volatility = await this.volatilityService.getVolatilityPercent();
    const action = determineAction(volatility);

    logger.info("Decision computed", { volatility, action });

    if (action === RebalanceAction.MAINTAIN) {
      logger.info("No range change needed");
      return;
    }

    if (!this.#cooldownElapsed()) {
      logger.info("Cooldown active, skipping state-changing action");
      return;
    }

    if (action === RebalanceAction.EMERGENCY_WITHDRAW) {
      await this.vaultClient.withdrawToStaking({
        reason: `volatility ${volatility}% exceeded emergency threshold`
      });
      this.lastActionAt = Date.now();
      return;
    }

    const currentTick = await this.vaultClient.getCurrentTick();
    const offsets = rangeOffsetsForAction(action);

    await this.vaultClient.adjustRange({
      lowerTick: currentTick + offsets.lowerTickOffset,
      upperTick: currentTick + offsets.upperTickOffset,
      reason: `${action} range for volatility ${volatility}%`
    });

    this.lastActionAt = Date.now();
  }

  #cooldownElapsed() {
    return Date.now() - this.lastActionAt >= this.minActionIntervalMs;
  }
}
