import { config } from "../config.js";
import { logger } from "../logger.js";
import { Client, AccountId, PrivateKey } from "@hashgraph/sdk";

export class HederaAgentKitClient {
  constructor() {
    this.network = config.hedera.network;
    this.accountId = config.hedera.accountId;
    this.privateKey = config.hedera.privateKey;
    this.mode = config.app.mode;
    this.client = null;
  }

  async init() {
    if (this.mode === "demo") {
      logger.info("Hedera Agent Kit (demo mode)", {
        mode: "demo",
        network: this.network,
        accountId: "(simulated)"
      });
      return;
    }

    // Live mode: initialize real Hedera client
    try {
      const client = this.#createClient();
      const accountId = AccountId.fromString(this.accountId);
      const privateKey = this.#parsePrivateKey(this.privateKey);

      client.setOperator(accountId, privateKey);
      this.client = client;

      logger.info("Hedera Agent Kit (live testnet)", {
        mode: "live",
        network: this.network,
        accountId: this.accountId
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Failed to initialize Hedera client", { message });
      throw error;
    }
  }

  isLive() {
    return this.mode === "live" && this.client !== null;
  }

  getClient() {
    if (!this.isLive()) {
      throw new Error("Hedera client not available in demo mode");
    }
    return this.client;
  }

  #createClient() {
    switch (this.network) {
      case "mainnet":
        return Client.forMainnet();
      case "previewnet":
        return Client.forPreviewnet();
      case "testnet":
      default:
        return Client.forTestnet();
    }
  }

  #parsePrivateKey(value) {
    try {
      return PrivateKey.fromString(value);
    } catch {
      try {
        return PrivateKey.fromStringECDSA(value);
      } catch {
        return PrivateKey.fromStringED25519(value);
      }
    }
  }
}
