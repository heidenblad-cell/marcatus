import 'dotenv/config';
import express from "express";
import cors from "cors";
import { db } from "./db.mjs";

const app = express();
app.use(cors());
app.use(express.json());

const ADMIN_KEY = process.env.ADMIN_KEY || "";

// ── health check ────────────────────────────
app.get("/health", (_req,res)=>res.json({ok:true,service:"api"}));

// ── latest assets ───────────────────────────
app.get("/assets/latest", (_req,res)=>{
  const rows = db.prepare(`
    SELECT id,title,chain,category,source,created_at
    FROM assets
    ORDER BY datetime(created_at) DESC
    LIMIT 50
  `).all();
  res.json({count:rows.length,results:rows});
});

// ── admin protection ────────────────────────
function requireAdmin(req,res,next){
  if(!ADMIN_KEY || req.headers["x-admin-key"]!==ADMIN_KEY)
    return res.status(401).json({ok:false,error:"unauthorized"});
  next();
}

// ── admin: status ───────────────────────────
app.get("/admin/status", requireAdmin, (_req,res)=>{
  try{
    const counts = db.prepare(
      "SELECT source,COUNT(*) AS n FROM assets GROUP BY source ORDER BY n DESC"
    ).all();
    res.json({ok:true,counts,now:new Date().toISOString()});
  }catch(e){
    res.status(500).json({ok:false,error:String(e)});
  }
});

const PORT = Number(process.env.API_PORT ?? 4000);
app.listen(PORT,()=>console.log(`✅ API running on port ${PORT}`));


// ── static frontend (admin console UI) ─────────────────────────
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "../public");
app.use(express.static(publicDir));

// --- Stats: total & senast skapad ---
app.get('/assets/stats', (_req, res) => {
  try {
    const row = db.prepare(`
      SELECT COUNT(*) AS total, MAX(created_at) AS latest_created_at
      FROM assets
    `).get();
    res.json({ total: row.total, latest_created_at: row.latest_created_at });
  } catch (e) {
    res.status(500).json({ ok:false, error:String(e) });
  }
});

// --- Search: title/chain/issuer/symbol/tags (+chain/category), q kan vara tom ---
app.get('/assets/search', (req, res) => {
  const q = (req.query.q || '').toString().trim();
  const chain = (req.query.chain || '').toString().trim();
  const category = (req.query.category || '').toString().trim();
  const limit = Math.min(parseInt(req.query.limit ?? '25', 10) || 25, 100);
  const offset = parseInt(req.query.offset ?? '0', 10) || 0;

  const like = s => `%${s}%`;
  const where = [];
  const params = [];

  if (q) {
    where.push('(title LIKE ? OR chain LIKE ? OR issuer LIKE ? OR symbol LIKE ? OR tags LIKE ?)');
    params.push(like(q), like(q), like(q), like(q), like(q));
  }
  if (chain) { where.push('chain = ?'); params.push(chain); }
  if (category) { where.push('category = ?'); params.push(category); }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  try {
    const rows = db.prepare(`
      SELECT id, title, chain, category, source, created_at
      FROM assets
      ${whereSql}
      ORDER BY datetime(created_at) DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    const total = db.prepare(`SELECT COUNT(*) AS c FROM assets ${whereSql}`).get(...params).c;

    res.json({ query: { q, chain, category, limit, offset }, total, count: rows.length, results: rows });
  } catch (e) {
    res.status(500).json({ ok:false, error:String(e) });
  }
});
/* === Admin: last-crawl & logs (defensive) === */
import fs from 'fs';
const LAST_CRAWL_FILE = '/tmp/marcatus-last-crawl.txt';
const CRAWLER_LOG_FILE = '/tmp/marcatus-crawler.log';

if (!app._router.stack.find(r=>r.route?.path==='/admin/last-crawl')) {
  app.get('/admin/last-crawl', requireAdmin, (_req,res)=>{
    let last=null,next=null;
    try{
      const ms = parseInt(fs.readFileSync(LAST_CRAWL_FILE,'utf8'));
      if (Number.isFinite(ms)) {
        last = new Date(ms).toISOString();
        next = new Date(ms + 60*60*1000).toISOString();
      }
    }catch(_){}
    res.json({ ok:true, last, next });
  });
}

if (!app._router.stack.find(r=>r.route?.path==='/admin/logs')) {
  app.get('/admin/logs', requireAdmin, (req,res)=>{
    const n = Math.min(parseInt(req.query.tail ?? '4000',10) || 4000, 50000);
    let txt='';
    try { if (fs.existsSync(CRAWLER_LOG_FILE)) txt = fs.readFileSync(CRAWLER_LOG_FILE,'utf8'); } catch(_){}
    if (txt.length > n) txt = txt.slice(-n);
    res.json({ ok:true, log: txt });
  });
}
/* === Admin: last-crawl & logs (defensive) === */
import fs from 'fs';
const LAST_CRAWL_FILE = '/tmp/marcatus-last-crawl.txt';
const CRAWLER_LOG_FILE = '/tmp/marcatus-crawler.log';

if (!app._router.stack.find(r=>r.route?.path==='/admin/last-crawl')) {
  app.get('/admin/last-crawl', requireAdmin, (_req,res)=>{
    let last=null,next=null;
    try{
      const ms = parseInt(fs.readFileSync(LAST_CRAWL_FILE,'utf8'));
      if (Number.isFinite(ms)) {
        last = new Date(ms).toISOString();
        next = new Date(ms + 60*60*1000).toISOString();
      }
    }catch(_){}
    res.json({ ok:true, last, next });
  });
}

if (!app._router.stack.find(r=>r.route?.path==='/admin/logs')) {
  app.get('/admin/logs', requireAdmin, (req,res)=>{
    const n = Math.min(parseInt(req.query.tail ?? '4000',10) || 4000, 50000);
    let txt='';
    try { if (fs.existsSync(CRAWLER_LOG_FILE)) txt = fs.readFileSync(CRAWLER_LOG_FILE,'utf8'); } catch(_){}
    if (txt.length > n) txt = txt.slice(-n);
    res.json({ ok:true, log: txt });
  });
}
