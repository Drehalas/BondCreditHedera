import { config } from "../config.js";
import { logger } from "../logger.js";

export class BonzoVaultClient {
  constructor({ vaultId = config.bonzo.vaultId, hederaClient = null } = {}) {
    this.vaultId = vaultId;
    this.hederaClient = hederaClient;
  }

  async getCurrentTick() {
    if (!this.hederaClient) {
      logger.warn("Bonzo client: Hedera client not injected, returning fallback tick");
      return 0;
    }

    const result = await this.hederaClient.queryContractState({
      contractId: this.vaultId,
      functionName: "getCurrentTick",
      params: [],
      gas: 100000
    });

    if (!result) {
      return 0;
    }

    try {
      return Number(result.getInt64(0));
    } catch {
      return 0;
    }
  }

  async adjustRange({ lowerTick, upperTick, reason }) {
    const meta = {
      vaultId: this.vaultId,
      lowerTick,
      upperTick,
      reason
    };

    if (!this.hederaClient) {
      logger.info("Adjusting Bonzo vault range (demo fallback)", meta);
      return { txId: `demo-${Date.now()}`, status: "SUCCESS", mode: "demo", executed: true };
    }

    const result = await this.hederaClient.executeContractFunction({
      contractId: this.vaultId,
      functionName: "adjustRange",
      params: [lowerTick, upperTick],
      gas: 250000
    });

    logger.info("Adjusting Bonzo vault range", {
      ...meta,
      txId: result.txId,
      status: result.status,
      mode: result.mode
    });

    return result;
  }

  async withdrawToStaking({ reason }) {
    const meta = {
      vaultId: this.vaultId,
      reason
    };

    if (!this.hederaClient) {
      logger.warn("Withdrawing vault liquidity to staking (demo fallback)", meta);
      return { txId: `demo-${Date.now()}`, status: "SUCCESS", mode: "demo", executed: true };
    }

    const result = await this.hederaClient.executeContractFunction({
      contractId: this.vaultId,
      functionName: "withdrawToStaking",
      params: [],
      gas: 300000
    });

    logger.warn("Withdrawing vault liquidity to staking", {
      ...meta,
      txId: result.txId,
      status: result.status,
      mode: result.mode
    });

    return result;
  }
}
