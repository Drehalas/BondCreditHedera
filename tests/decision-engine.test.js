import test from "node:test";
import assert from "node:assert";
import { determineAction, RebalanceAction } from "../src/core/decision-engine.js";

test("decision engine logic", async (t) => {
  await t.test("should return TIGHTEN for low volatility", () => {
    assert.strictEqual(determineAction(10), RebalanceAction.TIGHTEN);
  });

  await t.test("should return MAINTAIN for medium-low volatility", () => {
    assert.strictEqual(determineAction(20), RebalanceAction.MAINTAIN);
  });

  await t.test("should return WIDEN for medium-high volatility", () => {
    assert.strictEqual(determineAction(40), RebalanceAction.WIDEN);
  });

  await t.test("should return EMERGENCY_WITHDRAW for very high volatility", () => {
    assert.strictEqual(determineAction(60), RebalanceAction.EMERGENCY_WITHDRAW);
  });

  await t.test("should handle boundary cases", () => {
    // 15 is the threshold for tightenMax in default config
    // Based on `if (volatilityPercent < tightenMax)` -> 15 should be MAINTAIN
    assert.strictEqual(determineAction(15), RebalanceAction.MAINTAIN);
    assert.strictEqual(determineAction(30), RebalanceAction.WIDEN);
    assert.strictEqual(determineAction(50), RebalanceAction.EMERGENCY_WITHDRAW);
  });
});
