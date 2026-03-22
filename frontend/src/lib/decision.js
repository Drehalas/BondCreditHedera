export const ACTIONS = {
  TIGHTEN: "tighten",
  MAINTAIN: "maintain",
  WIDEN: "widen",
  EMERGENCY_WITHDRAW: "emergency_withdraw"
};

export const defaultThresholds = {
  tightenMax: 15,
  maintainMax: 30,
  widenMax: 50
};

export function determineAction(volatilityPercent, thresholds = defaultThresholds) {
  if (volatilityPercent < thresholds.tightenMax) return ACTIONS.TIGHTEN;
  if (volatilityPercent < thresholds.maintainMax) return ACTIONS.MAINTAIN;
  if (volatilityPercent < thresholds.widenMax) return ACTIONS.WIDEN;
  return ACTIONS.EMERGENCY_WITHDRAW;
}

export function actionLabel(action) {
  return {
    [ACTIONS.TIGHTEN]: "Tighten Range",
    [ACTIONS.MAINTAIN]: "Maintain Range",
    [ACTIONS.WIDEN]: "Widen Range",
    [ACTIONS.EMERGENCY_WITHDRAW]: "Emergency Withdraw"
  }[action];
}
