import {
  determineAction,
  rangeOffsetsForAction,
  RebalanceAction
} from "../core/decision-engine.js";
import { logger } from "../logger.js";

export class VolatilityAwareRebalancer {
  constructor({ volatilityService, vaultClient, minActionIntervalSeconds, onAfterTick }) {
    this.volatilityService = volatilityService;
    this.vaultClient = vaultClient;
    this.minActionIntervalMs = minActionIntervalSeconds * 1000;
    this.lastActionAt = 0;
    this.onAfterTick = typeof onAfterTick === "function" ? onAfterTick : null;
  }

  async #emit(payload) {
    if (this.onAfterTick) {
      await this.onAfterTick(payload);
    }
  }

  async tick() {
    let volatility;
    try {
      volatility = await this.volatilityService.getVolatilityPercent();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn("Volatility unavailable, skipping tick", { message });
      await this.#emit({
        volatility: null,
        action: null,
        executed: false,
        skipReason: "volatility_unavailable",
        error: message
      });
      return;
    }

    const action = determineAction(volatility);

    logger.info("Decision computed", { volatility, action });

    if (action === RebalanceAction.MAINTAIN) {
      logger.info("No range change needed");
      await this.#emit({
        volatility,
        action,
        executed: false,
        skipReason: "maintain"
      });
      return;
    }

    if (!this.#cooldownElapsed()) {
      logger.info("Cooldown active, skipping state-changing action");
      await this.#emit({
        volatility,
        action,
        executed: false,
        skipReason: "cooldown"
      });
      return;
    }

    if (action === RebalanceAction.EMERGENCY_WITHDRAW) {
      await this.vaultClient.withdrawToStaking({
        reason: `volatility ${volatility}% exceeded emergency threshold`
      });
      this.lastActionAt = Date.now();
      await this.#emit({
        volatility,
        action,
        executed: true,
        skipReason: null
      });
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
    await this.#emit({
      volatility,
      action,
      executed: true,
      skipReason: null,
      lowerTick: currentTick + offsets.lowerTickOffset,
      upperTick: currentTick + offsets.upperTickOffset
    });
  }

  #cooldownElapsed() {
    return Date.now() - this.lastActionAt >= this.minActionIntervalMs;
  }
}
