import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { db } from './db.mjs';

const app = express();
app.use(cors());
app.use(express.json());

// --- Static UI ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));
app.get('/', (_req, res) => res.sendFile(path.join(publicDir, 'index.html')));

// --- Helper to run crawler once ---
function runCrawlerOnce(res) {
  try {
    const defaultDataDir = path.resolve(__dirname, '../../../data');
    const resolvedDbPath = process.env.DB_PATH || path.join(defaultDataDir, 'marcatus.db');
    const crawlerEntry = path.resolve(__dirname, '../../../services/crawler/src/index.mjs');

    const child = spawn(process.execPath, [crawlerEntry], {
      env: { ...process.env, DB_PATH: resolvedDbPath },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '', stderr = '';
    child.stdout.on('data', d => (stdout += d.toString()));
    child.stderr.on('data', d => (stderr += d.toString()));
    child.on('close', code => {
      res.setHeader('Content-Type', 'application/json');
      if (code === 0) return res.status(200).json({ ok: true, message: 'Crawler ran', stdout });
      return res.status(500).json({ ok: false, code, stdout, stderr });
    });
  } catch (err) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ ok: false, error: String(err) });
  }
}

// --- Admin endpoints (DEV ONLY) ---
app.post('/admin/run-crawler', (req, res) => runCrawlerOnce(res));
// Convenience for testing in browser:
app.get('/admin/run-crawler', (req, res) => runCrawlerOnce(res));

// --- Health ---
app.get('/health', (_req, res) => res.json({ ok: true, service: 'api' }));

// --- Latest ---
app.get('/assets/latest', (_req, res) => {
  const rows = db.prepare(`
    SELECT id, title, chain, category, source, created_at
    FROM assets
    ORDER BY created_at DESC
    LIMIT 50
  `).all();
  res.json({ count: rows.length, results: rows });
});

// --- By ID ---
app.get('/assets/:id', (req, res) => {
  const row = db.prepare(`
    SELECT id, title, chain, category, source, created_at
    FROM assets
    WHERE id = ?
  `).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

// --- Search with filters & pagination ---
app.get('/assets/search', (req, res) => {
  const q = (req.query.q ?? '').toString().trim();
  const chain = (req.query.chain ?? '').toString().trim();
  const category = (req.query.category ?? '').toString().trim();
  const limit = Math.max(1, Math.min(100, Number(req.query.limit ?? 25)));
  const offset = Math.max(0, Number(req.query.offset ?? 0));

  const where = [];
  const params = [];

  if (q) { const like = `%${q}%`; where.push('(title LIKE ? OR chain LIKE ?)'); params.push(like, like); }
  if (chain) { where.push('chain = ?'); params.push(chain); }
  if (category) { where.push('category = ?'); params.push(category); }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const rows = db.prepare(`
    SELECT id, title, chain, category, source, created_at
    FROM assets
    ${whereSql}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = db.prepare(`
    SELECT COUNT(*) as c
    FROM assets
    ${whereSql}
  `).get(...params).c;

  res.json({ query: { q, chain, category, limit, offset }, total, count: rows.length, results: rows });
});

const PORT = Number(process.env.API_PORT ?? 4000);
app.listen(PORT, () => console.log(`✅ API running on port ${PORT}`));
