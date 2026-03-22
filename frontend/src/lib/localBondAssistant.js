/**
 * Offline / demo assistant for BondCredit volatility-aware-rebalancer when registry is unavailable.
 */
export function localAssistantReply(text) {
  const t = text.toLowerCase().trim();

  if (/(hello|hi|hey)\b/.test(t)) {
    return "BondCredit link online. Ask about volatility, Bonzo ranges, or the HOL registry.";
  }

  if (/volatility|vol\b|percent|%/.test(t)) {
    return [
      "Thresholds (annualized):",
      "• Under 15% → tighten liquidity range",
      "• 15–30% → maintain",
      "• 30–50% → widen",
      "• Over 50% → emergency withdraw toward staking",
      "This mirrors the keeper in `src/core/decision-engine.js`."
    ].join("\n");
  }

  if (/bonzo|vault|range|tick/.test(t)) {
    return "Bonzo integration is via `BonzoVaultClient`: adjustRange(lower/upper ticks) or withdrawToStaking on emergency. Replace scaffolds with your live contract calls.";
  }

  if (/registry|hol\b|uaid|search|agent/.test(t)) {
    return [
      "Hashgraph Online Registry Broker powers discovery and chat.",
      "Start the proxy (`npm run registry:proxy`) and set REGISTRY_BROKER_API_KEY in .env.",
      "Then use Search + Chat in this panel against live endpoints."
    ].join("\n");
  }

  if (/hedera|hbar|agent kit/.test(t)) {
    return "Hedera Agent Kit signs and submits transactions. Keep keys in `.env`, never in the browser.";
  }

  return [
    "I can explain volatility thresholds, Bonzo hooks, or HOL registry usage.",
    "Try: “What’s the volatility strategy?” or “How does registry search work?”"
  ].join("\n");
}
