import { config } from "../config.js";
import { logger } from "../logger.js";

export class HederaAgentKitClient {
  constructor() {
    this.network = config.hedera.network;
    this.accountId = config.hedera.accountId;
  }

  async init() {
    // Replace with real Hedera Agent Kit initialization once dependency is added.
    logger.info("Initialized Hedera Agent Kit client", {
      network: this.network,
      accountId: this.accountId
    });
  }
}
