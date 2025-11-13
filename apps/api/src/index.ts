import express from "express";
import cors from "cors";
import pino from "pino";
import { z } from "zod";
import { db, migrate, selectAgg, selectCount, selectOne } from "./db.js";

const logger = pino({ transport: { target: "pino-pretty" }, level: "info" });
const app = express();

app.use(cors());
app.use(express.json());

migrate();

app.get("/health", (_req, res) => {
  res.json({ ok: true, uptime: process.uptime(), now: new Date().toISOString() });
});

const SearchSchema = z.object({
  q: z.string().trim().optional(),
  category: z.string().optional(),
  chain: z.string().optional(),
  status: z.string().optional(),
  priceMin: z.coerce.number().optional(),
  priceMax: z.coerce.number().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(12),
  offset: z.coerce.number().int().min(0).default(0),
  sort: z.enum(["createdAt_desc","createdAt_asc","price_desc","price_asc"]).default("createdAt_desc")
});

function toWhere(params: any): { where: string; values: any[] } {
  const clauses: string[] = [];
  const values: any[] = [];

  if (params.q) {
    clauses.push("(LOWER(name) LIKE ? OR LOWER(symbol) LIKE ? OR LOWER(description) LIKE ?)");
    const needle = `%${params.q.toLowerCase()}%`;
    values.push(needle, needle, needle);
  }
  if (params.category) {
    const arr = params.category.split(",").map((s: string)=>s.trim()).filter(Boolean);
    if (arr.length) clauses.push(`category IN (${arr.map(()=>"?").join(",")})`), values.push(...arr);
  }
  if (params.chain) {
    const arr = params.chain.split(",").map((s: string)=>s.trim()).filter(Boolean);
    if (arr.length) clauses.push(`chain IN (${arr.map(()=>"?").join(",")})`), values.push(...arr);
  }
  if (params.status) {
    const arr = params.status.split(",").map((s: string)=>s.trim()).filter(Boolean);
    if (arr.length) clauses.push(`status IN (${arr.map(()=>"?").join(",")})`), values.push(...arr);
  }
  if (params.priceMin !== undefined) clauses.push("priceUSD >= ?"), values.push(params.priceMin);
  if (params.priceMax !== undefined) clauses.push("priceUSD <= ?"), values.push(params.priceMax);

  const where = clauses.length ? "WHERE " + clauses.join(" AND ") : "";
  return { where, values };
}

function toOrder(sort: string): string {
  switch (sort) {
    case "createdAt_asc": return "ORDER BY createdAt ASC";
    case "price_desc": return "ORDER BY priceUSD DESC";
    case "price_asc": return "ORDER BY priceUSD ASC";
    default: return "ORDER BY createdAt DESC";
  }
}

app.get("/assets/search", (req, res) => {
  try {
    const q = SearchSchema.safeParse(req.query);
    if (!q.success) {
      return res.status(400).json({ error: q.error.flatten() });
    }
    const p = q.data;
    const { where, values } = toWhere(p);
    const order = toOrder(p.sort);

    const stmtRows = db.prepare(`SELECT * FROM assets ${where} ${order} LIMIT ? OFFSET ?`);
    const stmtTotal = db.prepare(`SELECT COUNT(*) as total FROM assets ${where}`);
    const rows = stmtRows.all(...values, p.limit, p.offset);
    const total = (stmtTotal.get(...values) as any)?.total as number || 0;

    res.json({ total, limit: p.limit, offset: p.offset, items: rows });
  } catch (err) {
    logger.error({ err }, "Search error");
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/assets/stats", (_req, res) => {
  try {
    const byCategory = selectAgg.by("category");
    const byChain = selectAgg.by("chain");
    const byStatus = selectAgg.by("status");
    const price = selectAgg.price();
    const total = (selectCount.get() as any)?.c as number || 0;
    res.json({ total, byCategory, byChain, byStatus, price });
  } catch (err) {
    logger.error({ err }, "Stats error");
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/assets/:id", (req, res) => {
  try {
    const a = selectOne.get(req.params.id);
    if (!a) {
      return res.status(404).json({ error: "Asset not found" });
    }
    res.json(a);
  } catch (err) {
    logger.error({ err, id: req.params.id }, "Get asset error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => logger.info(`✅ Marcatus API + DB running on http://localhost:${PORT}`));
