import { logger } from "../logger.js";

const SKILL_ID = "volatility-aware-rebalancer";

/**
 * Bridges the keeper to HOL Universal Agentic Registry identity + discovery.
 * Emits structured audit logs after each rebalancer tick for operators and future chat hooks.
 */
export class VolatilityAgentRegistry {
  constructor({ config, registryClient }) {
    this.config = config;
    this.client = registryClient;
    this.skillName = config.registry.skillName;
    this.agentUaid = config.registry.agentUaid;
  }

  async init() {
    logger.info("Registry integration (volatility-aware-rebalancer)", {
      skill: this.skillName,
      skillId: SKILL_ID,
      agentUaid: this.agentUaid || "(not set)",
      baseUrl: this.config.registry.baseUrl
    });

    try {
      await this.client.getDashboardStats();
      logger.info("Registry broker reachable", { endpoint: "dashboard/stats" });
    } catch (error) {
      logger.warn("Registry broker stats check failed (network or URL)", {
        message: error instanceof Error ? error.message : String(error)
      });
    }

    if (this.config.registry.apiKey) {
      await this.client.verifyApiKey();
    }
  }

  /**
   * Called after each rebalancer evaluation — structured audit trail.
   * @param {object} payload
   */
  async onRebalancerTick(payload) {
    const line = {
      skill: SKILL_ID,
      skillName: this.skillName,
      agentUaid: this.agentUaid || null,
      ...payload
    };

    logger.info("volatility-aware-rebalancer tick", line);

    // Hook: publish to external observability or broker webhook when you add it
    return line;
  }

  async onChatAction(payload) {
    const line = {
      skill: SKILL_ID,
      skillName: this.skillName,
      agentUaid: this.agentUaid || null,
      source: "chat",
      ...payload
    };

    logger.info("volatility-aware-rebalancer chat-action", line);
    return line;
  }

  /**
   * Optional: discover related agents (e.g. "bonzo", "hedera defi").
   */
  async discoverPeers(query = "hedera volatility defi", limit = 3) {
    try {
      const result = await this.client.search(query, limit);
      logger.info("Registry search (volatility-aware-rebalancer context)", {
        query,
        resultKeys: result && typeof result === "object" ? Object.keys(result) : []
      });
      return result;
    } catch (error) {
      logger.warn("Registry search failed", {
        message: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }
}
