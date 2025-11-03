import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultDataDir = path.resolve(__dirname, '../../../data');
const dbPath = process.env.DB_PATH || path.join(defaultDataDir, 'marcatus.db');

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);

db.exec(`
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  chain TEXT NOT NULL,
  category TEXT DEFAULT 'rwa',
  source TEXT DEFAULT 'demo',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_assets_title ON assets(title);
CREATE INDEX IF NOT EXISTS idx_assets_chain ON assets(chain);
`);
