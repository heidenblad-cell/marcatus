import 'dotenv/config';
import Database from 'better-sqlite3';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use the SAME DB as the API
const defaultDataDir = path.resolve(__dirname, '../../../data');
const dbPath = process.env.DB_PATH || path.join(defaultDataDir, 'marcatus.db');

// Ensure data directory exists
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

// Connect to DB and ensure table exists
const db = new Database(dbPath);
db.exec(`
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  chain TEXT NOT NULL,
  category TEXT DEFAULT 'rwa',
  source TEXT DEFAULT 'crawler',
  created_at TEXT DEFAULT (datetime('now'))
);
`);

const item = {
  id: crypto.randomUUID(),
  title: 'Green Energy Credit – demo (crawler)',
  chain: 'ExampleNet',
  category: 'energy',
  source: 'crawler'
};

db.prepare(`
  INSERT OR REPLACE INTO assets (id, title, chain, category, source)
  VALUES (@id, @title, @chain, @category, @source)
`).run(item);

console.log('🕷️  Crawler inserted:', item.title);
console.log('DB path:', dbPath);
