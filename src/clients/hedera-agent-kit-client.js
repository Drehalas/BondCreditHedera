import { config } from "../config.js";
import { logger } from "../logger.js";
import {
  AccountId,
  Client,
  ContractCallQuery,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  ContractId,
  PrivateKey
} from "@hashgraph/sdk";

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

  async executeContractFunction({ contractId, functionName, params = [], gas = 200000 } = {}) {
    if (!contractId || !functionName) {
      throw new Error("contractId and functionName are required for executeContractFunction");
    }

    if (!this.isLive()) {
      const txId = `demo-${Date.now()}`;
      logger.info("Contract function (demo mode)", { contractId, functionName, params, txId });
      return { txId, status: "SUCCESS", mode: "demo", executed: true };
    }

    try {
      const tx = new ContractExecuteTransaction()
        .setContractId(ContractId.fromString(contractId))
        .setGas(gas)
        .setFunction(functionName, this.#buildFunctionParams(params));

      const response = await tx.execute(this.getClient());
      const receipt = await response.getReceipt(this.getClient());

      return {
        txId: response.transactionId?.toString() ?? null,
        status: receipt.status?.toString() ?? "UNKNOWN",
        mode: "live",
        executed: true
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Contract function failed", { contractId, functionName, message });
      return { txId: null, status: "FAILED", mode: "live", executed: false, error: message };
    }
  }

  async queryContractState({ contractId, functionName, params = [], gas = 100000 } = {}) {
    if (!contractId || !functionName) {
      throw new Error("contractId and functionName are required for queryContractState");
    }

    if (!this.isLive()) {
      logger.info("Contract query (demo mode)", { contractId, functionName, params });
      return null;
    }

    try {
      return await new ContractCallQuery()
        .setContractId(ContractId.fromString(contractId))
        .setGas(gas)
        .setFunction(functionName, this.#buildFunctionParams(params))
        .execute(this.getClient());
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Contract query failed", { contractId, functionName, message });
      return null;
    }
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
    const trimmed = String(value || "").trim();
    const normalized = trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed;

    // Handle DER-encoded keys when prefixed with ASN.1 marker.
    if (normalized.startsWith("302e020100300506032b6570") || normalized.startsWith("3030")) {
      return PrivateKey.fromStringDer(normalized);
    }

    // For raw hex keys, try ECDSA then ED25519.
    try {
      return PrivateKey.fromStringECDSA(normalized);
    } catch {
      try {
        return PrivateKey.fromStringED25519(normalized);
      } catch {
        // Fallback parser for legacy string formats.
        return PrivateKey.fromStringDer(normalized);
      }
    }
  }

  #buildFunctionParams(params) {
    const fp = new ContractFunctionParameters();

    for (const p of params) {
      if (typeof p === "bigint") {
        fp.addInt64(p);
      } else if (Number.isInteger(p)) {
        fp.addInt64(p);
      } else if (typeof p === "number") {
        fp.addInt64(Math.trunc(p));
      } else if (typeof p === "string") {
        fp.addString(p);
      } else if (typeof p === "boolean") {
        fp.addBool(p);
      }
    }

    return fp;
  }
}
