import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

// --- DB setup ---
const DB_FILE = process.env.MARCATUS_DB || path.resolve(process.cwd(), "marcatus.db");
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
export const db = new Database(DB_FILE);

// --- Schema & migration ---
export function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      symbol TEXT NOT NULL,
      category TEXT NOT NULL,
      chain TEXT NOT NULL,
      status TEXT NOT NULL,
      priceUSD REAL NOT NULL,
      createdAt TEXT NOT NULL,
      description TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_assets_createdAt ON assets(createdAt);
    CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category);
    CREATE INDEX IF NOT EXISTS idx_assets_chain ON assets(chain);
    CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
    CREATE INDEX IF NOT EXISTS idx_assets_price ON assets(priceUSD);
  `);
}

// Kör migrationen FÖRE vi förbereder statements
migrate();

// --- Types ---
export type Asset = {
  id: string;
  name: string;
  symbol: string;
  category: "Art" | "RealEstate" | "Treasury" | "Commodity" | "Collectible";
  chain: "Ethereum" | "Polygon" | "Solana" | "Private";
  status: "active" | "locked" | "settled" | "pending";
  priceUSD: number;
  createdAt: string;
  description: string;
};

// --- Statements ---
export const upsertAsset = db.prepare(`
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

export const selectCount = db.prepare("SELECT COUNT(*) as c FROM assets");
export const selectOne = db.prepare("SELECT * FROM assets WHERE id = ?");

export const selectAgg = {
  by: (col: string) =>
    db.prepare(`SELECT ${col} as key, COUNT(*) as count FROM assets GROUP BY ${col} ORDER BY count DESC`).all(),
  price: () =>
    db.prepare("SELECT MIN(priceUSD) as min, MAX(priceUSD) as max, AVG(priceUSD) as avg FROM assets").get()
};
