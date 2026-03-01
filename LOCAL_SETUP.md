# Local PostgreSQL Setup

Use this for local development instead of Supabase.

## Prerequisites

Install Docker Desktop for Windows:
https://www.docker.com/products/docker-desktop

## Setup

### 1. Start Local PostgreSQL

```bash
docker-compose up -d
```

This starts:
- **PostgreSQL** on `localhost:5432`
- **pgAdmin** on `http://localhost:5050`

### 2. Use Local Environment

Copy `.env.local` to `.env`:

```bash
copy .env.local .env
```

Or edit your `.env` to use:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agentic_wallet
DB_SSL=false
```

### 3. Run the App

```bash
npm run tui
```

No TLS flag needed since local DB doesn't use SSL.

## Access pgAdmin

- **URL:** http://localhost:5050
- **Email:** admin@example.com
- **Password:** admin

Then add server:
- **Host:** postgres
- **Username:** postgres
- **Password:** postgres
- **Database:** agentic_wallet

## Stop Services

```bash
docker-compose down
```

## Clean Database

```bash
docker-compose down -v
```

This removes the database volume too.

## Troubleshooting

### Port 5432 already in use

Change docker-compose.yml:
```yaml
ports:
  - "5433:5432"  # Use 5433 instead
```

Then update .env:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/agentic_wallet
```

### Connection refused

Make sure containers are running:
```bash
docker-compose ps
```

If not running:
```bash
docker-compose up -d
```

### Database not syncing

The schema auto-syncs with `DB_SYNC=true` in `.env.local`. If it doesn't:

```bash
npm run migration:run
```
