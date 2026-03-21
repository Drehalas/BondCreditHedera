import { config } from "../config.js";

export const RebalanceAction = Object.freeze({
  TIGHTEN: "tighten",
  MAINTAIN: "maintain",
  WIDEN: "widen",
  EMERGENCY_WITHDRAW: "emergency_withdraw"
});

export function determineAction(volatilityPercent) {
  const { tightenMax, maintainMax, widenMax } = config.decision.thresholds;

  if (volatilityPercent < tightenMax) {
    return RebalanceAction.TIGHTEN;
  }

  if (volatilityPercent < maintainMax) {
    return RebalanceAction.MAINTAIN;
  }

  if (volatilityPercent < widenMax) {
    return RebalanceAction.WIDEN;
  }

  return RebalanceAction.EMERGENCY_WITHDRAW;
}

export function rangeOffsetsForAction(action) {
  if (action === RebalanceAction.TIGHTEN) return config.decision.rangePolicy.tight;
  if (action === RebalanceAction.WIDEN) return config.decision.rangePolicy.wide;
  return config.decision.rangePolicy.maintain;
}
