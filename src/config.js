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
    apiUrl: process.env.SUPRA_API_URL || "",
    apiKey: process.env.SUPRA_API_KEY || "",
    pair: process.env.SUPRA_PAIR || "HBAR-USDC",
    interval: process.env.SUPRA_INTERVAL || "1h",
    timeoutMs: toNumber(process.env.SUPRA_TIMEOUT_MS, 5000)
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
  },
  /**
   * HOL Universal Agentic Registry (Hashgraph Online Registry Broker).
   * @see https://hol.org/registry
   */
  registry: {
    enabled: (() => {
      if (process.env.REGISTRY_ENABLED === "false") return false;
      if (process.env.REGISTRY_ENABLED === "true") return true;
      return Boolean(process.env.REGISTRY_BROKER_API_KEY?.trim());
    })(),
    apiKey: process.env.REGISTRY_BROKER_API_KEY || "",
    baseUrl: (process.env.REGISTRY_BROKER_API_URL || "https://hol.org/registry/api/v1").replace(
      /\/+$/,
      ""
    ),
    /** Your agent UAID when registered (e.g. uaid:aid:...) */
    agentUaid: process.env.AGENT_UAID || "",
    /** Published skill name (HCS-26 / OpenClaw) */
    skillName: process.env.SKILL_NAME || "volatility-aware-rebalancer",
    /** Run one registry search on startup (discovery demo) */
    discoverOnStartup: process.env.REGISTRY_DISCOVER_ON_STARTUP === "true"
  }
};

export function assertRequiredConfig() {
  const missing = [];

  // Hedera + Bonzo credentials are optional for demo mode
  // Only required if you plan to execute real transactions on-chain
  // For hackathon demo with bondcredit-demo volatility provider, these can be skipped
  
  if (config.oracle.provider === "supra" && !config.oracle.apiUrl) {
    missing.push("SUPRA_API_URL");
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  // Log demo mode info
  if (!config.hedera.accountId || !config.hedera.privateKey) {
    console.log(
      "[DEMO MODE] Hedera credentials not set. Running in simulation mode. " +
      "Set HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY to enable testnet execution."
    );
  }
  if (!config.bonzo.vaultId) {
    console.log(
      "[DEMO MODE] Bonzo vault ID not set. Running in simulation mode. " +
      "Set BONZO_VAULT_ID to enable vault interactions."
    );
  }
}
