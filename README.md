# Marcatus Pro — API + Crawler + React

Monorepo med tre appar:
- **API (Node + Express + SQLite)** — `apps/api` (port 4000)
- **Crawler (Node)** — `apps/crawler` (port 4001)
- **Web (React + Vite)** — `apps/web` (port 5173, proxyar /assets till API)

## Snabbstart

```bash
# i rootmappen
npm install
# installera även under apparna
cd apps/api && npm install && cd ../..
cd apps/crawler && npm install && cd ../..
cd apps/web && npm install && cd ../..

# kör allt samtidigt
npm run dev:all
```

Öppna:
- Web: http://localhost:5173
- API health: http://localhost:4000/health
- API stats: http://localhost:4000/assets/stats
- Crawler health: http://localhost:4001/health

## Köra tjänster separat

```bash
npm run dev:api
npm run dev:crawler
npm run dev:web
```

## Crawler → DB

### Real-Time Blockchain Crawling

Crawler övervakar nu blockchains i realtid:
- **Ethereum** - Övervakar ERC-721/ERC-1155 tokens och Transfer events
- **Polygon** - Samma som Ethereum (EVM-kompatibel)
- **Solana** - Övervakar SPL tokens och nya mints

Crawler startar automatiskt när tjänsten startar och sparar nya assets direkt till databasen.

**Endpoints:**
```bash
# Manuell crawl (genererar mock-data)
curl -X POST http://localhost:4001/crawl/run

# Starta real-time crawling
curl -X POST http://localhost:4001/crawl/start

# Stoppa real-time crawling
curl -X POST http://localhost:4001/crawl/stop
```

**Environment Variables:**
```bash
# RPC URLs (använd public RPCs eller egna noder)
ETHEREUM_RPC_URL=https://eth.llamarpc.com
POLYGON_RPC_URL=https://polygon.llamarpc.com
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Valfria: Specifika kontrakt att övervaka (kommaseparerade)
ETHEREUM_CONTRACTS=0x1234...,0x5678...
POLYGON_CONTRACTS=0xabcd...,0xefgh...

# Aktivera/inaktivera real-time crawling (default: true)
ENABLE_REALTIME_CRAWL=true
```

API:t läser alltid från `marcatus.db`.

## Databas

- SQLite-fil: `apps/api/marcatus.db` (skapas automatiskt)
- Tabell: `assets`
- Index: `createdAt, category, chain, status, priceUSD`

## macOS build hint

`better-sqlite3` kan kräva Xcode CLI tools:
```bash
xcode-select --install
```
