# BondCredit Rebalancer (Hackathon Brief)

This agent monitors HBAR volatility and manages a Bonzo vault range.

## Core behavior

- Volatility < 15%: tighten range
- Volatility 15%-30%: maintain
- Volatility 30%-50%: widen range
- Volatility > 50%: emergency withdraw

## Runtime modes

- `AGENT_MODE=demo`: no real chain writes, safe simulation
- `AGENT_MODE=live`: Hedera testnet client active, contract calls enabled

## Useful chat commands

- `status`
- `adjust range -120 120`
- `withdraw`

## Notes

- For real writes, set `BONZO_VAULT_ID` to a valid contract id.
- Local chat can run without registry API key when `LOCAL_AGENT_CHAT=true`.