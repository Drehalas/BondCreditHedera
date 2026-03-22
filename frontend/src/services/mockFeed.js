import { determineAction, defaultThresholds } from "../lib/decision";

const randomBetween = (min, max) => min + Math.random() * (max - min);

export function generateVolatilitySnapshot(previous = 24.0) {
  const drift = randomBetween(-7.5, 7.5);
  const next = Math.max(6, Math.min(72, previous + drift));
  const volatility = Number(next.toFixed(2));
  const action = determineAction(volatility, defaultThresholds);

  return {
    timestamp: new Date().toISOString(),
    volatility,
    action
  };
}

export function buildInitialHistory(size = 18) {
  const history = [];
  let cursor = randomBetween(20, 34);

  for (let i = 0; i < size; i += 1) {
    const snapshot = generateVolatilitySnapshot(cursor);
    cursor = snapshot.volatility;
    history.push(snapshot);
  }

  return history;
}
