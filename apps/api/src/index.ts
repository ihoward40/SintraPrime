import fs from "node:fs/promises";
import path from "node:path";

import express from "express";

import { handleIkeBotTask } from "./routes/ikebotTask.js";

const PORT = Number(process.env.PORT ?? 5051);
const RECEIPTS_DIR = process.env.IKEBOT_RECEIPTS_DIR ?? path.join(process.cwd(), "runs");
const RECEIPTS_FILE = path.join(RECEIPTS_DIR, "ikebot-receipts.jsonl");

async function logReceipt(receipt: unknown): Promise<void> {
  await fs.mkdir(RECEIPTS_DIR, { recursive: true });
  await fs.appendFile(RECEIPTS_FILE, `${JSON.stringify(receipt)}\n`, "utf8");
}

function normalizeHeaders(headers: Record<string, string | string[] | undefined>): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(headers)) {
    out[key.toLowerCase()] = Array.isArray(value) ? value[0] : value;
  }
  return out;
}

const app = express();
app.use(express.json({ limit: "2mb" }));

app.post("/api/ikebot/task", async (req, res) => {
  const result = await handleIkeBotTask(normalizeHeaders(req.headers as any), req.body, logReceipt);
  res.status(result.status).json(result.body);
});

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`@sintraprime/api listening on :${PORT}`);
});
