import { config } from "../config.js";
import { logger } from "../logger.js";

export class BonzoVaultClient {
  constructor({ vaultId = config.bonzo.vaultId } = {}) {
    this.vaultId = vaultId;
  }

  async getCurrentTick() {
    // Replace with on-chain read.
    return 0;
  }

  async adjustRange({ lowerTick, upperTick, reason }) {
    // Replace with Bonzo contract call.
    logger.info("Adjusting Bonzo vault range", {
      vaultId: this.vaultId,
      lowerTick,
      upperTick,
      reason
    });
  }

  async withdrawToStaking({ reason }) {
    // Replace with emergency migration/withdraw contract call.
    logger.warn("Withdrawing vault liquidity to staking", {
      vaultId: this.vaultId,
      reason
    });
  }
}
