import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { RegistryChatbot } from "./components/RegistryChatbot";
import BondCreditHeader from "./components/BondCreditHeader";
import BondCreditFooter from "./components/BondCreditFooter";
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
  const color = getVolatilityColor(volatility);
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

function getVolatilityColor(volatility) {
  if (volatility < defaultThresholds.tightenMax) return "var(--bondcredit-green)";
  if (volatility < defaultThresholds.maintainMax) return "var(--bondcredit-lime)";
  if (volatility < defaultThresholds.widenMax) return "var(--bondcredit-amber)";
  return "var(--bondcredit-red)";
}

export default function App() {
  const [history, setHistory] = useState(() => buildInitialHistory(16));
  const [refreshSeconds, setRefreshSeconds] = useState(5);
  const [connected, setConnected] = useState(false);

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

  // Poll backend API for real volatility data
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch("/api/volatility");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const tick = await response.json();
        setConnected(true);
        
        // Add to history if volatility is available
        if (tick.volatility !== null) {
          setHistory((prev) => {
            const snapshot = {
              timestamp: tick.timestamp,
              volatility: tick.volatility,
              action: tick.action || "maintain"
            };
            return [...prev.slice(-23), snapshot];
          });
        }
      } catch (error) {
        setConnected(false);
        // Fallback to data on error
        setHistory((prev) => {
          const snapshot = generateVolatilitySnapshot(prev[prev.length - 1]?.volatility || 24);
          return [...prev.slice(-23), snapshot];
        });
      }
    }, refreshSeconds * 1000);

    return () => clearInterval(interval);
  }, [refreshSeconds]);

  return (
    <div className="app-shell">
      <BondCreditHeader connected={connected} />
      <div className="noise" aria-hidden="true" />
      <motion.header
        className="hero"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <p className="kicker text-uppercase">
          Hedera Agent Kit · Hashgraph
          {" "}
          <span 
            className="cursor-pointer focus-ring"
            style={{ 
              display: "inline-block", 
              marginLeft: "12px",
              width: "8px", 
              height: "8px", 
              borderRadius: "50%", 
              backgroundColor: connected ? "var(--bondcredit-green)" : "var(--bondcredit-red)"
            }} 
            title={connected ? "Connected to backend" : "Using data"}
            aria-label={connected ? "Connected to backend" : "Using data"}
          />
        </p>
        <h1>Volatility Command Deck</h1>
        <p className="hero-sub">
        Bonzo vault rebalancing · live feed        </p>
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
            <span className={`status-pill ${actionClassMap[latest.action]}`} aria-label={`Current action: ${actionLabel(latest.action)}`}>
              {actionLabel(latest.action)}
            </span>
          </div>
          <div className="gauge-wrap">
            <div className="gauge-ring" style={ringStyle(latest.volatility)}>
              <div className="gauge-core">
                <div className="big-number text-mono">{latest.volatility}%</div>
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
            <div><span className="text-green">15%</span></div>
            <div><span className="text-lime">30%</span></div>
            <div><span className="text-amber">50%</span></div>
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
            {[...history].reverse().slice(0, 8).map((item, index) => (
              <li key={`${item.timestamp}-${index}`}>
                <span className={`dot ${actionClassMap[item.action]}`} />
                <div>
                  <p className="text-mono">{new Date(item.timestamp).toLocaleTimeString()}</p>
                  <p><span className="text-mono">{item.volatility}%</span> {"->"} {actionLabel(item.action)}</p>
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
          <h2>Polling Controls</h2>
          <label className="field">
            Refresh interval (seconds)
            <input
              type="number"
              min={1}
              max={60}
              value={refreshSeconds}
              onChange={(event) => setRefreshSeconds(Number(event.target.value))}
            />
          </label>
          <p className="muted">
            {connected ? (
              <>
                ✓ Live connection to backend keeper at <code>http://localhost:3000/api/volatility</code>
              </>
            ) : (
              <>
                ⚠ Connection failed. Using fallback data. Start backend: <code>npm start</code>
              </>
            )}
          </p>
        </motion.section>
      </main>

      <BondCreditFooter />
    
    </div>
  );
}
