import { config } from "../config.js";
import { logger } from "../logger.js";

export class VolatilityService {
  constructor({
    oracleProvider = config.oracle.provider,
    supraApiUrl = config.oracle.apiUrl,
    supraApiKey = config.oracle.apiKey,
    pair = config.oracle.pair,
    interval = config.oracle.interval,
    timeoutMs = config.oracle.timeoutMs
  } = {}) {
    this.oracleProvider = oracleProvider;
    this.supraApiUrl = supraApiUrl;
    this.supraApiKey = supraApiKey;
    this.pair = pair;
    this.interval = interval;
    this.timeoutMs = timeoutMs;
  }

  async getVolatilityPercent() {
    if (this.oracleProvider === "mock") {
      return this.#mockVolatility();
    }

    if (this.oracleProvider === "supra") {
      return this.#supraVolatility();
    }

    logger.warn("Unknown oracle provider, falling back to mock", {
      provider: this.oracleProvider
    });
    return this.#mockVolatility();
  }

  async #supraVolatility() {
    if (!this.supraApiUrl) {
      throw new Error("SUPRA_API_URL is required when ORACLE_PROVIDER=supra");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const url = new URL(this.supraApiUrl);
      if (this.pair) url.searchParams.set("pair", this.pair);
      if (this.interval) url.searchParams.set("interval", this.interval);

      const headers = {
        Accept: "application/json"
      };

      if (this.supraApiKey) {
        headers["x-api-key"] = this.supraApiKey;
      }

      const response = await fetch(url, {
        method: "GET",
        headers,
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = await response.json();
      const volatility = this.#extractVolatility(payload);

      logger.info("Fetched volatility from Supra", {
        provider: "supra",
        pair: this.pair,
        interval: this.interval,
        volatility
      });

      return volatility;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Supra volatility fetch failed: ${message}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  #extractVolatility(payload) {
    const candidates = [
      payload,
      payload?.volatility,
      payload?.volatilityPercent,
      payload?.volatility_pct,
      payload?.value,
      payload?.valuePct,
      payload?.data,
      payload?.data?.volatility,
      payload?.data?.volatilityPercent,
      payload?.data?.volatility_pct,
      payload?.data?.value,
      payload?.result,
      payload?.result?.volatility,
      payload?.result?.volatilityPercent,
      payload?.result?.value
    ];

    for (const candidate of candidates) {
      const numeric = this.#toFiniteNumber(candidate);
      if (numeric !== null) {
        if (numeric < 0 || numeric > 1000) {
          throw new Error(`Supra volatility value out of bounds: ${numeric}`);
        }
        return Number(numeric.toFixed(2));
      }
    }

    throw new Error("Supra response did not include a numeric volatility field");
  }

  #toFiniteNumber(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return null;
  }

  async #mockVolatility() {
    // Placeholder realized volatility for local development.
    const random = 10 + Math.random() * 55;
    return Number(random.toFixed(2));
  }
}
