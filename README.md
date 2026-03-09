# Agentic Wallet

A Solana wallet managed by an AI agent. The agent runs in a TUI and is powered by **Gemini** (Google). Each “agent” is a logical identity with its own encrypted keypair and a configurable spending cap.

## Architecture

- **Backend**: NestJS app context (no HTTP server). Modules: `DatabaseModule` (JSON file store), `WalletModule` (keygen, encryption, RPC), `AgentModule` (agent CRUD + Gemini chat).
- **Storage**: `data/agents.json` holds agents: `id`, `public_key`, `encrypted_private_key`, `encrypted_agent_key`, `max_spend`, `created_at`.
- **TUI**: React (Ink) in `src/tui/`. Entry `pnpm tui` → `src/tui.tsx` → bootstraps Nest, injects `GeminiAgentService`, renders `App` (left: chat, right: agent id / pubkey / balance / max spend, bottom: input).
- **Agent loop**: User message → `GeminiAgentService.chat(agentId, message, history)` → Gemini with function declarations (tools) and system instruction → model may return `functionCall` parts → `executeTool` runs the tool (e.g. transfer, airdrop, Jupiter swap) → result is concatenated with model text and returned as the reply.

So the “wallet” is the combination of (1) persisted encrypted keys per agent, (2) Solana RPC for balance/tx, and (3) the LLM as the decision layer that calls tools. The agent is the wallet: it holds the keys (encrypted) and performs actions within the configured limits.

## Security

- **Key hierarchy**: Per-agent 32-byte AEK (agent encryption key) encrypts the Solana secret key. The AEK is itself encrypted with a single **MASTER_KEY** (32-byte hex in env). Private keys never stored in the clear; decryption only in memory when signing.
- **Crypto**: AES-256-GCM (Node `crypto`) for both layers; random IV per encryption; auth tag verified on decrypt.
- **Spend limit**: Every transfer and token buy is gated by `max_spend` (SOL). The tool logic compares `amount` (or SOL used in swap) to `agent.max_spend` and refuses if over. The system prompt also tells the model the limit.
- **Transaction safety**: Before sending a transfer, the wallet service simulates the transaction; if simulation fails, the tx is not sent. Jupiter swap txs are built by Jupiter API and then signed locally.
- **Secrets**: `MASTER_KEY`, `GEMINI_API_KEY`, `HELIUS_API_KEY`, `JUPITER_API_KEY` are env-only (see `.env.example`). No keys in prompts or logs.
- **Trust boundary**: The LLM is in the trusted path: it chooses when to call tools and with what args. Prompt engineering and tool descriptions instruct it to confirm with the user and respect `max_spend`. For stronger isolation you’d add user approval (e.g. confirm before signing) or a separate signing service.

## How It Interacts with the AI Agent

The agent is the wallet controller:

1. **No agent selected**: Only `create_agent` is available. System prompt says no agent exists and to create one with a max spend (SOL). Creating an agent also creates a wallet (keypair + encrypted storage).
2. **Agent selected**: Tools include `create_wallet`, `get_balance`, `get_wallet_address`, `transfer_sol`, `request_airdrop`, `get_assets_by_owner` (Helius), `buy_token` (Jupiter). System prompt includes `agentId`, `max_spend`, and instructions to confirm before executing and never exceed the limit.
3. **Execution**: All balance/transfer/airdrop/swap operations are implemented in `GeminiAgentService.executeTool`. The model returns `functionCall`; the app resolves the current agent, decrypts keys only when needed for signing, and returns a string result (or error) that is fed back into the conversation.

an agent-centric wallet with encrypted keys, a hard cap, simulation before send, and the LLM as the only interface that triggers tool calls—with no separate UI for signing beyond the chat.

## Setup

1. Copy `.env.example` to `.env` and set:
   - `GEMINI_API_KEY` – required for the TUI chat ([Google AI Studio](https://aistudio.google.com/apikey))
   - `SOLANA_RPC` – optional; defaults to mainnet (use devnet for testing)
   - `MASTER_KEY` – 32-byte hex key for encrypting agent wallet keys (e.g. `openssl rand -hex 32`)
   - `HELIUS_API_KEY` – optional; for `get_assets_by_owner`
   - `JUPITER_API_KEY` – optional; for `buy_token` ([portal.jup.ag](https://portal.jup.ag))

2. Install and run:

```bash
pnpm install
pnpm tui
```

## Scripts

- `pnpm tui` – start the TUI (uses `tsx`, no build step)
- `pnpm build` – Nest build
- `pnpm start` – Nest start
