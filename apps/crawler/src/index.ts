import express from "express";
import pino from "pino";
import cors from "cors";
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { BlockchainCrawler } from "./blockchain/crawler.js";
import type { Asset } from "./types.js";

const logger = pino({ transport: { target: "pino-pretty" }, level: "info" });
const app = express();
app.use(cors());
app.use(express.json());

const dbPath = process.env.MARCATUS_DB || path.resolve(process.cwd(), "../api/marcatus.db");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);

// Ensure table exists
db.exec(`CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  category TEXT NOT NULL,
  chain TEXT NOT NULL,
  status TEXT NOT NULL,
  priceUSD REAL NOT NULL,
  createdAt TEXT NOT NULL,
  description TEXT NOT NULL
);`);

const upsert = db.prepare(`
  INSERT INTO assets (id,name,symbol,category,chain,status,priceUSD,createdAt,description)
  VALUES (@id,@name,@symbol,@category,@chain,@status,@priceUSD,@createdAt,@description)
  ON CONFLICT(id) DO UPDATE SET
    name=excluded.name,
    symbol=excluded.symbol,
    category=excluded.category,
    chain=excluded.chain,
    status=excluded.status,
    priceUSD=excluded.priceUSD,
    createdAt=excluded.createdAt,
    description=excluded.description
`);

// Function to save asset to database
function saveAsset(asset: Asset) {
  try {
    upsert.run(asset);
    logger.info({ id: asset.id, chain: asset.chain, name: asset.name }, "Asset saved to database");
  } catch (err) {
    logger.error({ err, asset }, "Failed to save asset");
  }
}

function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function genAssets(n = 50): Asset[] {
  const categories = ["Art","RealEstate","Treasury","Commodity","Collectible"] as const;
  const chains = ["Ethereum","Polygon","Solana","Private"] as const;
  const statuses = ["active","locked","settled","pending"] as const;
  const names: Record<string, string[]> = {
    Art: ["Warhol Print","Van Schendel Nocturne","Holmquist Flag","Contemporary Sculpture"],
    RealEstate: ["SoHo Loft","Lisbon Duplex","Lagos Beach Plot","Baltic Warehouse"],
    Treasury: ["US T-Bill 3M","US Note 2Y","EU T-Bill 6M"],
    Commodity: ["Gold Bar 1kg","Copper Lot","Lithium Contract"],
    Collectible: ["Rolex Submariner","Vintage Ferrari Poster","Rare Comic #1"]
  };

  return Array.from({ length: n }).map((_, i) => {
    const cat = categories[rnd(0, categories.length - 1)];
    const chain = chains[rnd(0, chains.length - 1)];
    const status = statuses[rnd(0, statuses.length - 1)];
    const pool = names[cat as string];
    const nm = pool[rnd(0, pool.length - 1)] + " #" + rnd(10, 999);
    const symbol = nm.split(" ").map(s=>s[0]).join("").slice(0,5).toUpperCase();

    return {
      id: `crawl_${(i+1).toString().padStart(3,"0")}`,
      name: nm,
      symbol,
      category: cat,
      chain,
      status,
      priceUSD: rnd(5_000, 2_000_000),
      createdAt: new Date(Date.now() - rnd(0, 90)*86400000).toISOString(),
      description: `Synced from crawler (mock) ${cat} on ${chain} (${status}).`
    };
  });
}

// Initialize blockchain crawler
const blockchainCrawler = new BlockchainCrawler(
  {
    ethereum: process.env.ETHEREUM_RPC_URL || "https://eth.llamarpc.com",
    polygon: process.env.POLYGON_RPC_URL || "https://polygon.llamarpc.com",
    solana: process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
  },
  {
    ethereum: process.env.ETHEREUM_CONTRACTS?.split(",").filter(Boolean) || [],
    polygon: process.env.POLYGON_CONTRACTS?.split(",").filter(Boolean) || [],
  }
);

// Set handler for new assets from blockchain
blockchainCrawler.setAssetHandler((asset) => {
  saveAsset(asset);
});

// Start blockchain crawler
const ENABLE_REALTIME_CRAWL = process.env.ENABLE_REALTIME_CRAWL !== "false";
if (ENABLE_REALTIME_CRAWL) {
  blockchainCrawler.start().catch((err) => {
    logger.error({ err }, "Failed to start blockchain crawler");
  });
}

// Manual crawl endpoint (for testing/generating mock data)
app.post("/crawl/run", (_req, res) => {
  try {
    const assets = genAssets(60);
    const tr = db.transaction((rows: Asset[]) => {
      for (const a of rows) upsert.run(a as any);
    });
    tr(assets);

    logger.info({ count: assets.length }, "Manual crawl: assets inserted/updated");
    res.json({ ok: true, insertedOrUpdated: assets.length });
  } catch (err) {
    logger.error({ err }, "Crawl error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Control endpoints
app.post("/crawl/start", (_req, res) => {
  try {
    blockchainCrawler.start();
    res.json({ ok: true, message: "Blockchain crawler started" });
  } catch (err) {
    logger.error({ err }, "Failed to start crawler");
    res.status(500).json({ error: "Failed to start crawler" });
  }
});

app.post("/crawl/stop", (_req, res) => {
  try {
    blockchainCrawler.stop();
    res.json({ ok: true, message: "Blockchain crawler stopped" });
  } catch (err) {
    logger.error({ err }, "Failed to stop crawler");
    res.status(500).json({ error: "Failed to stop crawler" });
  }
});

app.get("/health", (_req, res) => {
  try {
    res.json({ ok: true, service: "crawler", db: dbPath });
  } catch (err) {
    logger.error({ err }, "Health check error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

const PORT = Number(process.env.CRAWLER_PORT || 4001);
app.listen(PORT, () => {
  logger.info(`🕷️  Marcatus Crawler running on http://localhost:${PORT}, DB: ${dbPath}`);
  logger.info(`📡 Real-time blockchain crawling: ${ENABLE_REALTIME_CRAWL ? "ENABLED" : "DISABLED"}`);
  if (ENABLE_REALTIME_CRAWL) {
    logger.info("Monitoring: Ethereum, Polygon, Solana");
  }
});

// Graceful shutdown
process.on("SIGINT", () => {
  logger.info("Shutting down...");
  blockchainCrawler.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("Shutting down...");
  blockchainCrawler.stop();
  process.exit(0);
});
