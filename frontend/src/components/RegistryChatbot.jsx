import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { localAssistantReply } from "../lib/localBondAssistant";
import {
  registryChatMessage,
  registryChatSession,
  registryHealth,
  registrySearch,
  registryStats
} from "../services/registryClient";

function formatPayload(data) {
  if (data == null) return "";
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

export function RegistryChatbot() {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState("chat");
  const [health, setHealth] = useState(null);
  const [searchQuery, setSearchQuery] = useState("hedera defi volatility");
  const [searchResult, setSearchResult] = useState(null);
  const [statsResult, setStatsResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [uaid, setUaid] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(() => [
    {
      id: "welcome",
      role: "assistant",
      text: "Registry link panel. Open a broker session with a UAID, or use local BondCredit answers without network."
    }
  ]);
  const endRef = useRef(null);

  const scrollToEnd = () => endRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => {
    scrollToEnd();
  }, [messages]);

  const refreshHealth = useCallback(async () => {
    try {
      const h = await registryHealth();
      setHealth(h);
    } catch {
      setHealth({ ok: false, reason: "proxy_unreachable" });
    }
  }, []);

  useEffect(() => {
    refreshHealth();
  }, [refreshHealth]);

  const pushMessage = (role, text, meta = null) => {
    setMessages((prev) => [
      ...prev,
      { role, text, meta, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` }
    ]);
  };

  const runSearch = async () => {
    setBusy(true);
    setSearchResult(null);
    try {
      const data = await registrySearch(searchQuery, 5);
      setSearchResult(data);
    } catch (e) {
      setSearchResult({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };

  const runStats = async () => {
    setBusy(true);
    try {
      const data = await registryStats();
      setStatsResult(data);
    } catch (e) {
      setStatsResult({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };

  const openSession = async () => {
    if (!uaid.trim()) {
      pushMessage("assistant", "Enter a UAID (e.g. uaid:aid:...) first.");
      return;
    }
    setBusy(true);
    try {
      const data = await registryChatSession({ uaid: uaid.trim() });
      if (data.error === "missing_registry_key") {
        pushMessage("assistant", data.message || "Add REGISTRY_BROKER_API_KEY to root .env and restart the proxy.");
        return;
      }
      const sid = data.sessionId || data.session_id || data.id;
      if (sid) setSessionId(String(sid));
      pushMessage("system", formatPayload(data));
    } catch (e) {
      pushMessage("assistant", `Session error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    pushMessage("user", trimmed);
    setInput("");

    if (!sessionId) {
      const local = localAssistantReply(trimmed);
      pushMessage("assistant", local);
      return;
    }

    setBusy(true);
    try {
      const data = await registryChatMessage({ sessionId, message: trimmed });
      if (data.error === "missing_registry_key") {
        pushMessage("assistant", data.message || "Registry key missing.");
        return;
      }
      pushMessage("assistant", formatPayload(data));
    } catch (e) {
      pushMessage("assistant", localAssistantReply(trimmed));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="registry-chatbot card registry-card">
      <div className="registry-chatbot__head">
        <div>
          <p className="kicker">HOL Registry </p>
          <h2 className="registry-chatbot__title">Registry Relay</h2>
          <p className="muted registry-chatbot__lede">
            Search the public broker index, then open a broker session. Keys stay on the proxy.
          </p>
        </div>
        <button type="button" className="ghost registry-toggle" onClick={() => setOpen((v) => !v)}>
          {open ? "Collapse" : "Expand"}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="registry-body"
            className="registry-chatbot__body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="registry-chatbot__toolbar">
              <div className="registry-pills">
                <button
                  type="button"
                  className={tab === "chat" ? "pill is-active" : "pill"}
                  onClick={() => setTab("chat")}
                >
                  Chat
                </button>
                <button
                  type="button"
                  className={tab === "discover" ? "pill is-active" : "pill"}
                  onClick={() => setTab("discover")}
                >
                  Discover
                </button>
              </div>
              <div className="registry-health mono">
                {health
                  ? health.hasApiKey
                    ? "proxy · key loaded"
                    : "proxy · no key (search only)"
                  : "proxy · …"}
              </div>
            </div>

            {tab === "discover" && (
              <div className="registry-discover">
                <label className="field">
                  Search query
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="hedera bonzo vault"
                  />
                </label>
                <div className="actions">
                  <button type="button" disabled={busy} onClick={runSearch}>
                    Search registry
                  </button>
                  <button type="button" className="ghost" disabled={busy} onClick={runStats}>
                    Dashboard stats
                  </button>
                  <button type="button" className="ghost" onClick={refreshHealth}>
                    Ping proxy
                  </button>
                </div>
                {searchResult && (
                  <pre className="registry-json">{formatPayload(searchResult)}</pre>
                )}
                {statsResult && (
                  <pre className="registry-json">{formatPayload(statsResult)}</pre>
                )}
              </div>
            )}

            {tab === "chat" && (
              <div className="registry-chat">
                <div className="registry-session-row">
                  <label className="field registry-field-grow">
                    Target UAID
                    <input
                      value={uaid}
                      onChange={(e) => setUaid(e.target.value)}
                      placeholder="uaid:aid:..."
                    />
                  </label>
                  <button type="button" className="ghost" disabled={busy} onClick={openSession}>
                    Open session
                  </button>
                </div>
                {sessionId ? (
                  <p className="mono registry-session-id">session: {sessionId}</p>
                ) : (
                  <p className="muted small">
                    No session — messages use the local BondCredit assistant.
                  </p>
                )}

                <div className="registry-messages" role="log">
                  {messages.map((m, i) => (
                    <motion.div
                      key={m.id ?? i}
                      className={`registry-msg registry-msg--${m.role}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                    >
                      {m.role === "system" ? (
                        <pre className="registry-json registry-json--inline">{m.text}</pre>
                      ) : (
                        m.text
                      )}
                    </motion.div>
                  ))}
                  <div ref={endRef} />
                </div>

                <div className="registry-input-row">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && send()}
                    placeholder="Ask about volatility, Hashgraph, or Hedera…"
                  />
                  <button type="button" disabled={busy} onClick={send}>
                    Send
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
