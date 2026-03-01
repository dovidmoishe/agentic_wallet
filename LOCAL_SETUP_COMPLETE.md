# Complete Local Setup - Step by Step

## Step 1: Install Docker Desktop

Download and install Docker Desktop for Windows:
https://www.docker.com/products/docker-desktop

Restart your computer after installation.

## Step 2: Start Local PostgreSQL

Open PowerShell in your agentic_wallet folder and run:

```powershell
docker-compose up -d
```

This will:
- Download postgres image (first time only)
- Start postgres on localhost:5432
- Start pgAdmin on http://localhost:5050

Wait 10-15 seconds for postgres to be ready.

Verify it's running:
```powershell
docker-compose ps
```

You should see both services with status "Up".

## Step 3: Configure Environment

Replace your `.env` file with:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agentic_wallet
SOLANA_RPC=https://solana-devnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
ANTHROPIC_API_KEY=sk-ant-api03-YOUR_ANTHROPIC_KEY_HERE
MASTER_KEY=your_32_byte_hex_master_key_here
DB_SSL=false
DB_LOGGING=true
DB_SYNC=true
NODE_ENV=development
```

Make sure to fill in your actual credentials:
- `SOLANA_RPC` - Get from https://www.alchemy.com (free tier)
- `ANTHROPIC_API_KEY` - Get from https://console.anthropic.com
- `MASTER_KEY` - 32-byte hex string (example: `7399e6e8e837da72b1161e8ee6fcf6e21ab873eea4025e2ac1e00af6ecbcc47a`)

## Step 4: Run Migrations

```powershell
npm run migration:run
```

This creates the database schema.

## Step 5: Start TUI

```powershell
npm run tui
```

No NODE_TLS_REJECT_UNAUTHORIZED flag needed anymore!

## Verify It's Working

You should see:
```
TUI starting...
Bootstrapping Nest (DB + services)...
Connecting to database...
Connected to database!
Initializing services...
Services initialized!
```

Then the TUI interface should appear.

## View Database in pgAdmin

Go to: http://localhost:5050
- Email: admin@example.com
- Password: admin

Add server:
1. Right-click "Servers" → Register → Server
2. Name: agentic_wallet
3. Connection tab:
   - Host: postgres
   - Port: 5432
   - Username: postgres
   - Password: postgres
   - Database: agentic_wallet
4. Save

Now you can browse your agents and wallets!

## Troubleshooting

### "Connection refused" or "Unable to connect"

Docker postgres not running. Run:
```powershell
docker-compose up -d
```

Wait 15 seconds, then try again.

### "Port 5432 already in use"

You have another postgres running. Either:
- Stop the other postgres
- Or change docker-compose.yml and .env to use different port

### "Database agentic_wallet does not exist"

Run migrations:
```powershell
npm run migration:run
```

### Still hanging on "Connecting to database"

Check docker is running:
```powershell
docker ps
```

If nothing shows, restart Docker Desktop.

## Stop Everything

```powershell
docker-compose down
```

## Clean Up (Delete Database)

```powershell
docker-compose down -v
```

This removes the postgres volume too.
