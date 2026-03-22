import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { RegistryChatbot } from "./components/RegistryChatbot";
import { actionLabel, defaultThresholds } from "./lib/decision";
import { buildInitialHistory, generateVolatilitySnapshot } from "./services/mockFeed";

const actionClassMap = {
  tighten: "is-safe",
  maintain: "is-neutral",
  widen: "is-alert",
  emergency_withdraw: "is-critical"
};

function ringStyle(volatility) {
  const percentage = Math.min(100, Math.max(0, (volatility / 70) * 100));
  const color = volatility >= 50 ? "var(--critical)" : volatility >= 30 ? "var(--alert)" : "var(--safe)";
  return {
    background: `conic-gradient(${color} 0 ${percentage}%, rgba(255,255,255,0.14) ${percentage}% 100%)`
  };
}

function thresholdText(volatility) {
  if (volatility < defaultThresholds.tightenMax) return "< 15% (tight zone)";
  if (volatility < defaultThresholds.maintainMax) return "15%-30% (stable zone)";
  if (volatility < defaultThresholds.widenMax) return "30%-50% (defensive zone)";
  return "> 50% (emergency zone)";
}

export default function App() {
  const [history, setHistory] = useState(() => buildInitialHistory(16));
  const [refreshSeconds, setRefreshSeconds] = useState(5);

  const latest = history[history.length - 1];

  const sparkline = useMemo(
    () =>
      history
        .map((point, index) => {
          const x = (index / Math.max(1, history.length - 1)) * 100;
          const y = 100 - (point.volatility / 72) * 100;
          return `${x},${y}`;
        })
        .join(" "),
    [history]
  );

  const pushSnapshot = () => {
    setHistory((prev) => {
      const snapshot = generateVolatilitySnapshot(prev[prev.length - 1]?.volatility || 24);
      return [...prev.slice(-23), snapshot];
    });
  };

  return (
    <div className="app-shell">
      <div className="noise" aria-hidden="true" />
      <motion.header
        className="hero"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <p className="kicker">Hedera Agent Kit · BondCredit</p>
        <h1>Volatility Command Deck</h1>
        <p className="hero-sub">
          Production-facing operator console for volatility-aware Bonzo vault rebalancing.
        </p>
      </motion.header>

      <main className="grid">
        <motion.div
          className="registry-chatbot-wrap"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <RegistryChatbot />
        </motion.div>

        <motion.section
          className="card primary dashboard-panel"
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
        >
          <div className="card-title-wrap">
            <h2>Current Regime</h2>
            <span className={`status-pill ${actionClassMap[latest.action]}`}>{actionLabel(latest.action)}</span>
          </div>
          <div className="gauge-wrap">
            <div className="gauge-ring" style={ringStyle(latest.volatility)}>
              <div className="gauge-core">
                <div className="big-number">{latest.volatility}%</div>
                <div className="muted">1h realized vol</div>
              </div>
            </div>
            <div className="threshold-blurb">
              <p>{thresholdText(latest.volatility)}</p>
              <p className="muted mono">Last tick: {new Date(latest.timestamp).toLocaleTimeString()}</p>
            </div>
          </div>
        </motion.section>

        <motion.section
          className="card dashboard-panel"
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h2>Volatility Stream</h2>
          <svg className="sparkline" viewBox="0 0 100 100" preserveAspectRatio="none" role="img">
            <polyline points={sparkline} />
          </svg>
          <div className="threshold-lines">
            <div><span>15%</span></div>
            <div><span>30%</span></div>
            <div><span>50%</span></div>
          </div>
        </motion.section>

        <motion.section
          className="card dashboard-panel"
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
        >
          <h2>Action Timeline</h2>
          <ul className="timeline">
            {[...history].reverse().slice(0, 8).map((item) => (
              <li key={item.timestamp}>
                <span className={`dot ${actionClassMap[item.action]}`} />
                <div>
                  <p className="mono">{new Date(item.timestamp).toLocaleTimeString()}</p>
                  <p>{item.volatility}% {"->"} {actionLabel(item.action)}</p>
                </div>
              </li>
            ))}
          </ul>
        </motion.section>

        <motion.section
          className="card controls dashboard-panel"
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <h2>Simulation Controls</h2>
          <label className="field">
            Auto-check interval (seconds)
            <input
              type="number"
              min={1}
              max={60}
              value={refreshSeconds}
              onChange={(event) => setRefreshSeconds(Number(event.target.value))}
            />
          </label>
          <div className="actions">
            <button type="button" onClick={pushSnapshot}>Run Single Check</button>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                const timer = setInterval(pushSnapshot, refreshSeconds * 1000);
                setTimeout(() => clearInterval(timer), refreshSeconds * 5000);
              }}
            >
              Simulate 5 Cycles
            </button>
          </div>
          <p className="muted">
            This UI is currently connected to a mock feed. Wire it to the keeper API to view live
            Hedera execution state.
          </p>
        </motion.section>
      </main>
    </div>
  );
}
