import { logger } from "../logger.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadAgentBrief() {
  try {
    const p = path.join(__dirname, "agent-brief.md");
    return fs.readFileSync(p, "utf8").trim();
  } catch {
    return "Agent brief unavailable.";
  }
}

const AGENT_BRIEF = loadAgentBrief();

function parseInteger(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function parseIntent(text = "") {
  const lower = String(text).toLowerCase().trim();

  if (!lower) {
    return { intent: "help", args: {} };
  }

  if (lower.includes("status") || lower.includes("last") || lower.includes("health")) {
    return { intent: "get_status", args: {} };
  }

  if (lower.includes("about") || lower.includes("what do you do") || lower.includes("help")) {
    return { intent: "about", args: {} };
  }

  if (lower.includes("withdraw") || lower.includes("emergency")) {
    return { intent: "withdraw_to_staking", args: {} };
  }

  if (lower.includes("adjust") || lower.includes("tighten") || lower.includes("widen") || lower.includes("range")) {
    const numbers = lower.match(/-?\d+/g) || [];
    const maybeLower = numbers.length >= 1 ? parseInteger(numbers[0]) : null;
    const maybeUpper = numbers.length >= 2 ? parseInteger(numbers[1]) : null;
    return {
      intent: "adjust_range",
      args: {
        lowerTick: maybeLower,
        upperTick: maybeUpper
      }
    };
  }

  return { intent: "help", args: {} };
}

export class AgentChatRouter {
  constructor({ vaultClient, hederaClient, getLatestTick, onAfterChatAction }) {
    this.vaultClient = vaultClient;
    this.hederaClient = hederaClient;
    this.getLatestTick = typeof getLatestTick === "function" ? getLatestTick : () => null;
    this.onAfterChatAction =
      typeof onAfterChatAction === "function" ? onAfterChatAction : async () => undefined;
  }

  async openSession({ uaid }) {
    const sessionId = `local-${Date.now()}`;
    return {
      ok: true,
      source: "local-agent",
      sessionId,
      uaid: uaid || null,
      mode: this.hederaClient?.isLive?.() ? "live" : "demo"
    };
  }

  peekIntent(message) {
    return parseIntent(message).intent;
  }

  async handleMessage({ sessionId, message, requestId }) {
    const parsed = parseIntent(message);
    const mode = this.hederaClient?.isLive?.() ? "live" : "demo";
    const reasonSuffix = requestId ? ` (${requestId})` : "";
    const actionReason = `chat request${reasonSuffix}`;
    const base = {
      ok: true,
      source: "local-agent",
      sessionId: sessionId || null,
      requestId: requestId || null,
      mode,
      intent: parsed.intent
    };

    try {
      switch (parsed.intent) {
        case "get_status": {
          const latestTick = this.getLatestTick();
          const result = {
            ...base,
            result: {
              latestTick,
              network: this.hederaClient?.network || "unknown",
              accountId: this.hederaClient?.accountId || null,
              isLive: mode === "live"
            }
          };
          await this.onAfterChatAction(result);
          return result;
        }

        case "withdraw_to_staking": {
          const tx = await this.vaultClient.withdrawToStaking({ reason: actionReason });
          const result = { ...base, result: { action: "withdraw_to_staking", tx } };
          await this.onAfterChatAction(result);
          return result;
        }

        case "adjust_range": {
          const latest = this.getLatestTick();
          const center = Number.isFinite(latest?.lowerTick) && Number.isFinite(latest?.upperTick)
            ? Math.trunc((latest.lowerTick + latest.upperTick) / 2)
            : 0;

          const lowerTick = parsed.args.lowerTick ?? center - 120;
          const upperTick = parsed.args.upperTick ?? center + 120;

          if (lowerTick >= upperTick) {
            return {
              ...base,
              ok: false,
              error: "invalid_ticks",
              message: "lowerTick must be less than upperTick"
            };
          }

          const tx = await this.vaultClient.adjustRange({
            lowerTick,
            upperTick,
            reason: actionReason
          });

          const result = {
            ...base,
            result: { action: "adjust_range", lowerTick, upperTick, tx }
          };
          await this.onAfterChatAction(result);
          return result;
        }

        case "about": {
          const info = {
            ...base,
            result: {
              brief: AGENT_BRIEF
            }
          };
          await this.onAfterChatAction(info);
          return info;
        }

        default: {
          const help = {
            ...base,
            result: {
              help: [
                "Try: status",
                "Try: withdraw",
                "Try: adjust range -120 120",
                "Try: about"
              ]
            }
          };
          await this.onAfterChatAction(help);
          return help;
        }
      }
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      logger.error("Agent chat action failed", {
        intent: parsed.intent,
        message: messageText
      });
      return {
        ...base,
        ok: false,
        error: "chat_action_failed",
        message: messageText
      };
    }
  }
}
