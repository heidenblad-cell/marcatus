import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: "api" });
});

const PORT = process.env.API_PORT || 4000;
app.listen(PORT, () => console.log("✅ API running on port", PORT));
