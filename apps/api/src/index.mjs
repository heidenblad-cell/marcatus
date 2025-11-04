import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { db } from './db.mjs';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true, service: 'api' }));

// Latest (unchanged)
app.get('/assets/latest', (_req, res) => {
  const rows = db.prepare(`
    SELECT id, title, chain, category, source, created_at
    FROM assets
    ORDER BY created_at DESC
    LIMIT 50
  `).all();
  res.json({ count: rows.length, results: rows });
});

// Get by id
app.get('/assets/:id', (req, res) => {
  const row = db.prepare(`
    SELECT id, title, chain, category, source, created_at
    FROM assets
    WHERE id = ?
  `).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

/**
 * Advanced search with filters & pagination
 * Query params:
 *  - q: free text (matches title or chain)
 *  - chain: exact chain match (e.g., ExampleNet)
 *  - category: exact category (e.g., energy, bond)
 *  - limit: 1..100 (default 25)
 *  - offset: >=0 (default 0)
 */
app.get('/assets/search', (req, res) => {
  const q = (req.query.q ?? '').toString().trim();
  const chain = (req.query.chain ?? '').toString().trim();
  const category = (req.query.category ?? '').toString().trim();
  const limit = Math.max(1, Math.min(100, Number(req.query.limit ?? 25)));
  const offset = Math.max(0, Number(req.query.offset ?? 0));

  const where = [];
  const params = [];

  if (q) {
    where.push('(title LIKE ? OR chain LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like);
  }
  if (chain) {
    where.push('chain = ?');
    params.push(chain);
  }
  if (category) {
    where.push('category = ?');
    params.push(category);
  }

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

  res.json({
    query: { q, chain, category, limit, offset },
    total,
    count: rows.length,
    results: rows
  });
});

const PORT = Number(process.env.API_PORT ?? 4000);
app.listen(PORT, () => console.log(`✅ API running on port ${PORT}`));
