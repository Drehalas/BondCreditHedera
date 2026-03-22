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
4. Run:
   - `npm start`

## Frontend dashboard

Run the operator UI:

- `npm run frontend:dev`

Create production build:

- `npm run frontend:build`

Preview production build locally:

- `npm run frontend:preview` (then open the URL shown, e.g. `http://127.0.0.1:4173`)

Frontend source lives in `frontend/` and includes:

- volatility gauge and action status
- threshold-aware decision display
- recent action timeline
- simulation controls for local testing

## Configuration

Update environment settings in `.env`:

- `REBALANCE_CRON` - schedule expression (default every 5 min)
- `MIN_ACTION_INTERVAL_SECONDS` - cooldown between range changes
- `SUPRA_PAIR`, `SUPRA_INTERVAL` - volatility feed target

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

## Next integration tasks

1. Replace mock volatility with SupraOracles adapter
2. Add real Hedera Agent Kit dependency and initialization
3. Implement Bonzo contract calls in `BonzoVaultClient`
4. Add persistent storage for last action/decision history
5. Add tests for decision engine and rebalancer behavior
