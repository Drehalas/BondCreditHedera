import dotenv from "dotenv";

dotenv.config();

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const config = {
  app: {
    name: "bondcredit-volatility-rebalancer",
    minActionIntervalSeconds: toNumber(process.env.MIN_ACTION_INTERVAL_SECONDS, 600),
    rebalancerCron: process.env.REBALANCE_CRON || "*/5 * * * *"
  },
  hedera: {
    network: process.env.HEDERA_NETWORK || "testnet",
    accountId: process.env.HEDERA_ACCOUNT_ID || "",
    privateKey: process.env.HEDERA_PRIVATE_KEY || ""
  },
  bonzo: {
    vaultId: process.env.BONZO_VAULT_ID || ""
  },
  oracle: {
    provider: process.env.ORACLE_PROVIDER || "mock",
    pair: process.env.SUPRA_PAIR || "HBAR-USDC",
    interval: process.env.SUPRA_INTERVAL || "1h"
  },
  decision: {
    thresholds: {
      tightenMax: 15,
      maintainMax: 30,
      widenMax: 50
    },
    rangePolicy: {
      tight: { lowerTickOffset: -80, upperTickOffset: 80 },
      maintain: { lowerTickOffset: -120, upperTickOffset: 120 },
      wide: { lowerTickOffset: -220, upperTickOffset: 220 }
    }
  }
};

export function assertRequiredConfig() {
  const missing = [];

  if (!config.hedera.accountId) missing.push("HEDERA_ACCOUNT_ID");
  if (!config.hedera.privateKey) missing.push("HEDERA_PRIVATE_KEY");
  if (!config.bonzo.vaultId) missing.push("BONZO_VAULT_ID");

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}
