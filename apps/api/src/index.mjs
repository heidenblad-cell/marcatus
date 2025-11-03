import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { db } from './db.mjs';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true, service: 'api' }));

app.get('/assets/latest', (_req, res) => {
  const rows = db.prepare(`
    SELECT id, title, chain, category, source, created_at
    FROM assets
    ORDER BY created_at DESC
    LIMIT 50
  `).all();
  res.json({ count: rows.length, results: rows });
});

app.get('/assets/search', (req, res) => {
  const q = (req.query.q || '').toString().trim();
  if (!q) return res.status(400).json({ error: "Missing query param 'q'" });
  const like = `%${q}%`;
  const rows = db.prepare(`
    SELECT id, title, chain, category, source, created_at
    FROM assets
    WHERE title LIKE ? OR chain LIKE ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(like, like);
  res.json({ query: q, count: rows.length, results: rows });
});

const PORT = Number(process.env.API_PORT ?? 4000);
app.listen(PORT, () => console.log(`✅ API running on port ${PORT}`));
