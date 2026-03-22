import { logger } from "../logger.js";

/**
 * Hashgraph Online Registry Broker API (HOL).
 * @see https://hol.org/registry/api/v1/openapi.json
 */
export class RegistryBrokerClient {
  constructor({ baseUrl, apiKey = "" }) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.apiKey = apiKey;
  }

  #headers(extra = {}, { includeApiKey = true } = {}) {
    const h = { Accept: "application/json", ...extra };
    if (includeApiKey && this.apiKey) {
      h["x-api-key"] = this.apiKey;
    }
    return h;
  }

  async #get(path, { includeApiKey = false } = {}) {
    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const res = await fetch(url, {
      method: "GET",
      headers: this.#headers({}, { includeApiKey })
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Registry GET ${path} failed: ${res.status} ${text}`);
    }

    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      return res.json();
    }
    return res.text();
  }

  /**
   * Public search (no API key required for basic discovery).
   */
  async search(query, limit = 5) {
    const q = encodeURIComponent(query);
    const lim = encodeURIComponent(String(limit));
    return this.#get(`/search?q=${q}&limit=${lim}`, { includeApiKey: false });
  }

  /**
   * Public dashboard stats.
   */
  async getDashboardStats() {
    return this.#get("/dashboard/stats", { includeApiKey: false });
  }

  /**
   * Verify API key can call an authenticated endpoint (best-effort).
   */
  async verifyApiKey() {
    if (!this.apiKey) {
      return { ok: false, reason: "no_api_key" };
    }

    const candidates = ["/credits/balance", "/balance", "/me"];

    for (const path of candidates) {
      try {
        const url = `${this.baseUrl}${path}`;
        const res = await fetch(url, {
          method: "GET",
          headers: this.#headers({}, { includeApiKey: true })
        });
        if (res.ok) {
          logger.info("Registry broker API key accepted", { path });
          return { ok: true, path };
        }
      } catch {
        // try next
      }
    }

    logger.warn("Registry broker API key could not be verified against known paths; continuing");
    return { ok: false, reason: "verify_failed_soft" };
  }
}
