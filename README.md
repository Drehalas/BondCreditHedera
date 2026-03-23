# BondCredit Volatility-Aware Rebalancer (Hedera)

An autonomous keeper service for `BondCredit` that monitors HBAR volatility and adjusts Bonzo vault liquidity ranges to reduce impermanent loss risk.

## What this project does

- Monitors HBAR/USDC volatility on a schedule
- Applies threshold-based decisions:
  - `< 15%` -> tighten range
  - `15-30%` -> maintain
  - `30-50%` -> widen range
  - `> 50%` -> emergency withdraw to staking
- Enforces cooldown between state-changing actions
- Logs every decision and action for auditing

## Stack

- Node.js
- Hedera Agent Kit integration scaffold
- Bonzo vault client scaffold
- Cron-based keeper loop
- React + Vite operator frontend

## Project structure

- `server/registry-ui-proxy.mjs` - HOL Registry HTTP proxy for the React UI (keeps API key off the client)
- `src/index.js` - app entrypoint and scheduler
- `src/config.js` - env + thresholds + range policy
- `src/core/decision-engine.js` - action selection logic
- `src/keeper/rebalancer.js` - execution workflow and cooldown
- `src/clients/hedera-agent-kit-client.js` - Hedera client wrapper
- `src/clients/bonzo-vault-client.js` - Bonzo interactions
- `src/clients/registry-broker-client.js` - HOL Registry Broker HTTP client
- `src/services/volatility-service.js` - volatility source abstraction
- `src/services/volatility-agent-registry.js` - **volatility-aware-rebalancer** + registry audit hooks

## Quick start

1. Install dependencies:
   - `npm install`
   - `npm --prefix frontend install`
2. Create env file:
   - `copy .env.example .env`
3. Fill in required values in `.env`:
   - `HEDERA_ACCOUNT_ID`
   - `HEDERA_PRIVATE_KEY`
   - `BONZO_VAULT_ID`
   - `SUPRA_API_KEY` (if using SupraOracles)
4. Run:
   - `npm start`

## Frontend dashboard

Run the operator UI:

- `npm run frontend:dev`

**Registry chatbot (HOL broker):** the UI calls `/api/registry/*` via Vite’s dev proxy. Start the proxy so keys stay server-side:

- Terminal A: `npm run registry:proxy` (reads `REGISTRY_BROKER_API_KEY` from root `.env`)
- Terminal B: `npm run frontend:dev`

Or one command: `npm run dev:web` (proxy + Vite).

Create production build:

- `npm run frontend:build`

Preview production build locally:

- `npm run frontend:preview` (then open the URL shown, e.g. `http://127.0.0.1:4173`)

For preview against a running proxy, set `frontend/.env.development` or `frontend/.env.production.local`:

- `VITE_REGISTRY_API_BASE=http://127.0.0.1:8788` (CORS allowed by the proxy)

### Troubleshooting: “This page isn’t working” / “invalid response” (Chrome/Edge)

1. **Use `http://`, not `https://`** for localhost preview and dev. Vite serves plain HTTP; `https://127.0.0.1:4173` triggers TLS errors that show up as an invalid response.
2. **Start the registry proxy** before using Registry Relay: `npm run registry:proxy`. If it’s down, `/api/registry/*` returns 503 JSON (after config) instead of a broken connection.
3. **Port in use:** if 4173 is taken, Vite picks the next port — use the URL printed in the terminal (e.g. `http://localhost:4174/`).
4. Prefer **`http://localhost:5173`** (dev) or **`http://localhost:4173`** (preview) if `127.0.0.1` behaves oddly on your OS.
5. **Still 404 on `:8788`?** Stop every old `node` proxy, then run `npm run registry:proxy` again. In DevTools → Network → pick the response → **Response headers** must include `X-BondCredit-Registry-Proxy: bondcredit-registry-ui-proxy/1.1`. If that header is missing, another app owns port **8788** (change `REGISTRY_PROXY_PORT` in `.env` and update `frontend/vite.config.js` proxy target to match).
6. **Eternl / `dom.js` / `initEternlDomAPI`**: messages from the **Eternl wallet extension** injecting into the page — not from this repo. Safe to ignore while testing.

Frontend source lives in `frontend/` and includes:

- **Registry Relay** chatbot: HOL broker search + session chat (via `server/registry-ui-proxy.mjs`) and offline BondCredit assistant
- volatility gauge and action status
- threshold-aware decision display
- recent action timeline
- simulation controls for local testing

## Configuration

Update environment settings in `.env`:

- `REBALANCE_CRON` - schedule expression (default every 5 min)
- `MIN_ACTION_INTERVAL_SECONDS` - cooldown between range changes
- `SUPRA_PAIR`, `SUPRA_INTERVAL` - volatility feed target
- `SUPRA_API_KEY`, `SUPRA_API_URL` - SupraOracles credentials

### HOL Registry (optional)

Enable [Hashgraph Online Registry Broker](https://hol.org/registry) integration so the keeper logs ticks under **`volatility-aware-rebalancer`** and can hit discovery APIs:

- `REGISTRY_BROKER_API_KEY` - from `npx @hol-org/registry claim` or [dashboard](https://hol.org/registry/dashboard)
- `REGISTRY_BROKER_API_URL` - default production API
- `AGENT_UAID` - your registered agent UAID (for logs / future chat hooks)
- `SKILL_NAME` - defaults to `volatility-aware-rebalancer`
- `REGISTRY_DISCOVER_ON_STARTUP=true` - optional one-time search on boot

Publish the skill package with `npx @hol-org/registry` using `.cursor/skills/volatility-rebalancer/` (`SKILL.md` + `skill.json`).

Update thresholds and range offsets in `src/config.js`:

- `decision.thresholds`
- `decision.rangePolicy`

