import { config } from "../config.js";
import { logger } from "../logger.js";

export class VolatilityService {
  constructor({ oracleProvider = config.oracle.provider } = {}) {
    this.oracleProvider = oracleProvider;
  }

  async getVolatilityPercent() {
    if (this.oracleProvider === "mock") {
      return this.#mockVolatility();
    }

    logger.warn("Unknown oracle provider, falling back to mock", {
      provider: this.oracleProvider
    });
    return this.#mockVolatility();
  }

  async #mockVolatility() {
    // Placeholder realized volatility for local development.
    const random = 10 + Math.random() * 55;
    return Number(random.toFixed(2));
  }
}
