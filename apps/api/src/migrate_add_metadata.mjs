import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultDataDir = path.resolve(__dirname, '../../../data');
const dbPath = process.env.DB_PATH || path.join(defaultDataDir, 'marcatus.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);

db.exec(`
  ALTER TABLE assets ADD COLUMN updated_at TEXT DEFAULT (datetime('now'));
`);

try {
  db.exec(`
    ALTER TABLE assets ADD COLUMN metadata TEXT DEFAULT '{}';
  `);
  console.log('✅ Migration complete — added updated_at + metadata columns.');
} catch (err) {
  console.log('ℹ️ Columns may already exist:', err.message);
}
