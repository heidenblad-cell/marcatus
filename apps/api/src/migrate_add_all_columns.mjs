import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultDataDir = path.resolve(__dirname, "../../../data");
const dbPath = process.env.DB_PATH || path.join(defaultDataDir, "marcatus.db");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);

// Add missing columns if they do not exist
function addColumn(name, type) {
  const existing = db.prepare(`PRAGMA table_info(assets)`).all();
  if (!existing.some(r => r.name === name)) {
    db.exec(`ALTER TABLE assets ADD COLUMN ${name} ${type}`);
    console.log(`✅ Added column: ${name}`);
  }
}

addColumn("contract", "TEXT");
addColumn("symbol", "TEXT");
addColumn("issuer", "TEXT");
addColumn("url", "TEXT");
addColumn("tags", "TEXT");
addColumn("updated_at", "TEXT");
addColumn("metadata", "TEXT");

console.log("✅ All missing columns added.");
