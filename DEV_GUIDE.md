# Agentic Wallet - Developer Guide

## Quick Start

### Prerequisites
- Node.js v22+
- npm (or pnpm)
- `.env` file with database and API credentials

### Setup
```bash
cd /data/.openclaw/workspace/agentic_wallet

# Install dependencies
npm install

# Run migrations
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run migration:run

# Start the TUI
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run tui
```

## Architecture

### Three Main Layers

#### 1. **TUI Layer** (`src/tui/`)
- **Framework:** Ink (React for Terminal)
- **Entry:** `src/tui.tsx`
- **Components:**
  - `App.tsx` - Main component, manages state
  - `LeftPanel.tsx` - Chat history display
  - `RightPanel.tsx` - Agent info sidebar
  - `InputPrompt.tsx` - User input field
  - `bootstrap.ts` - Initialize NestJS services

#### 2. **Agent Layer** (`src/agent/`)
- **ClaudeAgentService** - Anthropic Agent SDK integration
  - Manages MCP server (Model Context Protocol)
  - Handles tool calling for wallet operations
  - Processes multi-turn conversations
- **AgentService** - Database CRUD operations
- **Agent Entity** - TypeORM model with encrypted fields

#### 3. **Wallet Layer** (`src/wallet/`)
- **WalletService** - Solana blockchain operations
  - Create keypairs
  - Sign transactions
  - Query balances
  - Send transfers
- **CryptoService** - Encryption/decryption
  - AES-256-GCM algorithm
  - Dual-layer key management

### Data Flow

```
User Input (TUI)
    ↓
InputPrompt.tsx
    ↓
App.tsx (handleSubmit)
    ↓
ClaudeAgentService.chat()
    ↓
Anthropic Agent SDK (with MCP)
    ↓
Tool Functions (create_agent, create_wallet, transfer_sol, etc.)
    ↓
WalletService & AgentService
    ↓
Solana Devnet & Supabase
    ↓
Response → App.tsx → LeftPanel/RightPanel (UI Update)
```

## Available Tools

### No Agent (Initial State)
- **`create_agent`**
  - Args: `maxSpend` (number)
  - Creates new agent with spending limit
  - Returns: Agent ID, max spend

### With Agent
- **`create_wallet`**
  - Creates Solana keypair for agent
  - Stores encrypted keys in database
  - Returns: Public key address

- **`get_wallet_address`**
  - Returns public key for agent's wallet

- **`get_balance`**
  - Query Solana devnet for SOL balance
  - Returns: Balance in SOL and lamports

- **`transfer_sol`**
  - Args: `recipientAddress` (string), `amount` (number)
  - Signs and sends transaction
  - Checks against max spend limit
  - Returns: Signature hash

## Configuration

### Environment Variables
```env
# Encryption master key (32 bytes hex)
MASTER_KEY=7399e6e8e837da72b1161e8ee6fcf6e21ab873eea4025e2ac1e00af6ecbcc47a

# Solana RPC endpoint
SOLANA_RPC=https://solana-devnet.g.alchemy.com/v2/YOUR_KEY

# Anthropic API key for Claude Agent SDK
ANTHROPIC_API_KEY=sk-ant-api03-...

# Database connection
DATABASE_URL=postgresql://user:password@host/db?sslmode=require
DB_SSL=true

# Optional
DB_SYNC=false        # Auto-sync schemas (dev only)
DB_LOGGING=false     # Log SQL queries
NODE_ENV=development
```

## Key Encryption

### Encryption Flow
1. **Generate keypair** on Solana
2. **Generate random AEK** (Agent Encryption Key)
3. **Encrypt private key** with AEK using AES-256-GCM
4. **Encrypt AEK** with MASTER_KEY using AES-256-GCM
5. **Store encrypted data** in database (as JSONB)

### Decryption Flow
1. **Get encrypted AEK** from database
2. **Decrypt AEK** using MASTER_KEY
3. **Decrypt private key** using AEK
4. **Use private key** to sign transactions

### Database Schema
```sql
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  public_key TEXT UNIQUE NOT NULL,
  encrypted_private_key JSONB NOT NULL, -- {data, iv, tag}
  encrypted_agent_key JSONB NOT NULL,   -- {data, iv, tag}
  created_at TIMESTAMP DEFAULT NOW(),
  max_spend NUMERIC(20, 8) NOT NULL
);
```

## Testing

### Unit Tests
```bash
npm run test              # Run all tests
npm run test:watch      # Watch mode
npm run test:cov        # Coverage report
npm run test:debug      # Debug mode
```

### E2E Tests
```bash
npm run test:e2e        # End-to-end tests
```

### Manual Testing
```bash
# Build and test
npm run build
npm run lint

# Start devnet TUI
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run tui

# Test REST API (if running server instead)
npm run start:dev
# Then: curl http://localhost:3000
```

## Common Issues & Solutions

### SSL/TLS Errors
```bash
# Use this flag for Supabase pooler
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run tui
```

### Module Import Errors
- All `.ts` imports need `.js` extensions (ES modules)
- Example: `import { X } from './file.js'` ✅
- Example: `import { X } from './file'` ❌

### Database Migration Issues
```bash
# Check migration status
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run typeorm -- migration:show -d src/config/ormconfig.ts

# Revert last migration
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run migration:revert

# Generate new migration from entities
npm run migration:generate
```

### Ink Component Issues
- `ink-text-input` doesn't support `isDisabled` prop
- Use conditional rendering instead
- `ink-box` is deprecated, use Ink's `<Box>` component

## Deployment Notes

### Local Development
- Uses Solana devnet (free, no real funds)
- Supabase free tier database
- Anthropic API key required (pay-as-you-go)

### Production Readiness
- ⚠️ Never commit `.env` file
- ⚠️ Use proper secret management (AWS Secrets Manager, etc.)
- ⚠️ Implement rate limiting on transfer tool
- ⚠️ Add user authentication layer
- ⚠️ Use mainnet RPC endpoint only after security audit

## Scripts Reference

| Command | Purpose |
|---------|---------|
| `npm run tui` | Start Terminal UI |
| `npm run start` | Production server |
| `npm run start:dev` | Development server (watch) |
| `npm run start:debug` | Debug mode with inspector |
| `npm run build` | Compile TypeScript |
| `npm run lint` | Lint and fix code |
| `npm run format` | Format with Prettier |
| `npm run test` | Run unit tests |
| `npm run test:watch` | Unit tests (watch mode) |
| `npm run test:e2e` | End-to-end tests |
| `npm run migration:run` | Run pending migrations |
| `npm run migration:generate` | Generate migration from entities |
| `npm run migration:revert` | Revert last migration |

## File Structure Reference

```
src/
├── main.ts                         # REST API bootstrap
├── app.module.ts                   # Root NestJS module
├── app.controller.ts               # /api routes
├── app.service.ts                  # App-level service
│
├── tui.tsx                         # TUI bootstrap
├── tui/
│   ├── bootstrap.ts                # Initialize TUI services
│   ├── components/
│   │   ├── App.tsx                 # Main TUI component
│   │   ├── LeftPanel.tsx           # Chat display
│   │   ├── RightPanel.tsx          # Info sidebar
│   │   └── InputPrompt.tsx         # Input field
│   └── utils/
│       └── agent-config.ts         # Local persistence
│
├── agent/
│   ├── agent.service.ts            # Agent CRUD
│   ├── claude-agent.service.ts     # Anthropic SDK
│   ├── agent.module.ts             # Module export
│   └── entities/
│       └── agent.entity.ts         # TypeORM model
│
├── wallet/
│   ├── wallet.service.ts           # Solana operations
│   ├── crypto.service.ts           # Encryption
│   └── wallet.module.ts            # Module export
│
└── config/
    ├── database.config.ts          # NestJS config
    └── ormconfig.ts                # TypeORM config
```

## Tips for Development

1. **Use TUI for interactive testing** - Much better UX than REST API
2. **Check browser dev tools** - Ink renders in terminal, inspect with `npm run start:debug`
3. **Database queries** - Enable `DB_LOGGING=true` to see SQL
4. **Crypto debugging** - Keys are encrypted, can't inspect directly
5. **Agent prompts** - Modify `systemPrompt` in `claude-agent.service.ts` to change behavior

---

**Last Updated:** 2026-02-28  
**Ready for Development:** ✅ YES
